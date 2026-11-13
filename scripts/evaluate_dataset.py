import os
import sys
import json
import time
import tempfile
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.config import DEFAULT_MODEL_PATH
from ai_engine.detector import AccidentDetector
from ai_engine.pipeline import VideoIncidentPipeline, PipelineResult


def load_annotations(annotations_path: Path) -> Dict[str, Any]:
    """Loads and validates the ground-truth annotations JSON."""
    if not annotations_path.exists():
        raise FileNotFoundError(f"Annotations file not found at: {annotations_path.resolve()}")
    with open(annotations_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "videos" not in data or not isinstance(data["videos"], list):
        raise ValueError("Annotations JSON must contain a 'videos' list.")
    return data


def classify_video_outcome(ground_truth_has_accident: bool, detected_incidents_count: int) -> str:
    """
    Determines confusion matrix classification for a video:
    - TP: Ground truth has accident, pipeline detected >= 1 incident
    - TN: Ground truth has NO accident, pipeline detected 0 incidents
    - FP: Ground truth has NO accident, pipeline detected >= 1 incident (false alarm)
    - FN: Ground truth has accident, pipeline detected 0 incidents (missed detection)
    """
    predicted_has_accident = detected_incidents_count > 0
    if ground_truth_has_accident and predicted_has_accident:
        return "TP"
    elif not ground_truth_has_accident and not predicted_has_accident:
        return "TN"
    elif not ground_truth_has_accident and predicted_has_accident:
        return "FP"
    else:
        return "FN"


def calculate_classification_metrics(outcomes: List[str]) -> Dict[str, Any]:
    """
    Computes TP, TN, FP, FN, precision, recall, accuracy, and F1-score.
    Handles zero denominators safely without throwing ZeroDivisionError.
    """
    tp = outcomes.count("TP")
    tn = outcomes.count("TN")
    fp = outcomes.count("FP")
    fn = outcomes.count("FN")
    total_valid = tp + tn + fp + fn

    accuracy = (tp + tn) / total_valid if total_valid > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2.0 * precision * recall) / (precision + recall) if (precision + recall) > 0.0 else 0.0

    return {
        "true_positives": tp,
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
        "total_evaluated": total_valid,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4)
    }


def match_detected_with_ground_truth(
    detected_incidents: List[Dict[str, Any]],
    gt_events: List[Dict[str, Any]],
    tolerance_sec: float = 2.0
) -> List[Dict[str, Any]]:
    """Matches detected incidents with ground-truth temporal event windows."""
    matches = []
    for gt in gt_events:
        gt_start = gt.get("start_time_sec", 0.0)
        gt_end = gt.get("end_time_sec", 0.0)
        expected_classes = gt.get("expected_classes", [])
        
        matched_incident = None
        for inc in detected_incidents:
            inc_start = inc.get("start_time_sec", 0.0)
            inc_end = inc.get("end_time_sec", 0.0)
            
            # Check for temporal overlap with tolerance
            overlap_start = max(gt_start - tolerance_sec, inc_start)
            overlap_end = min(gt_end + tolerance_sec, inc_end)
            
            if overlap_start <= overlap_end:
                matched_incident = inc
                break

        matches.append({
            "event_id": gt.get("event_id"),
            "ground_truth_window": [gt_start, gt_end],
            "expected_classes": expected_classes,
            "is_matched": matched_incident is not None,
            "matched_incident": matched_incident
        })
    return matches


def calculate_event_level_metrics(
    video_results: List[Dict[str, Any]],
    tolerance_sec: float = 2.0
) -> Dict[str, Any]:
    """
    Computes fine-grained event-level precision, recall, and F1-score across all videos.
    - A detection is an event-level True Positive (TP) only if its temporal window
      overlaps with an annotated ground-truth accident event window.
    - Detections outside ground-truth windows (including replays, passing traffic,
      and roadside objects) are classified as False Positives (FP / False Alarms).
    - Ground-truth events with no overlapping detections are False Negatives (FN).
    - Unmatched detections are explicitly recorded as false alarms.
    """
    total_gt_events = 0
    total_detections = 0
    tp_events = 0
    fn_events = 0
    fp_detections = 0

    per_video_event_summaries = []

    for vid in video_results:
        gt_events = vid.get("ground_truth", {}).get("ground_truth_events", [])
        pred = vid.get("prediction")
        detected = pred.get("detected_incidents", []) if pred else []

        total_gt_events += len(gt_events)
        total_detections += len(detected)

        # Track which detections have been assigned to a GT event (one-to-one matching)
        matched_detection_ids = set()
        vid_tp = 0
        vid_fn = 0

        for gt in gt_events:
            gt_start = gt.get("start_time_sec", 0.0)
            gt_end = gt.get("end_time_sec", 0.0)

            matched_inc = None
            for inc in detected:
                inc_id = inc.get("incident_id")
                if inc_id in matched_detection_ids:
                    continue  # Already matched to another event

                inc_start = inc.get("start_time_sec", 0.0)
                inc_end = inc.get("end_time_sec", 0.0)

                overlap_start = max(gt_start - tolerance_sec, inc_start)
                overlap_end = min(gt_end + tolerance_sec, inc_end)

                if overlap_start <= overlap_end:
                    matched_inc = inc
                    matched_detection_ids.add(inc_id)
                    break

            if matched_inc is not None:
                vid_tp += 1
            else:
                vid_fn += 1

        # Any detection not in matched_detection_ids is an unmatched detection (False Alarm / FP)
        vid_fp = len(detected) - len(matched_detection_ids)

        tp_events += vid_tp
        fn_events += vid_fn
        fp_detections += vid_fp

        # Annotate each detected incident with false alarm status
        if pred:
            for inc in detected:
                inc_id = inc.get("incident_id")
                inc["is_matched_to_gt"] = inc_id in matched_detection_ids
                inc["is_false_alarm"] = inc_id not in matched_detection_ids

        per_video_event_summaries.append({
            "video_id": vid.get("id"),
            "gt_events_count": len(gt_events),
            "detected_count": len(detected),
            "event_tp": vid_tp,
            "event_fn": vid_fn,
            "event_fp": vid_fp
        })

    precision = tp_events / (tp_events + fp_detections) if (tp_events + fp_detections) > 0 else 0.0
    recall = tp_events / (tp_events + fn_events) if (tp_events + fn_events) > 0 else 0.0
    f1 = (2.0 * precision * recall) / (precision + recall) if (precision + recall) > 0.0 else 0.0

    return {
        "total_ground_truth_events": total_gt_events,
        "total_detected_incidents": total_detections,
        "event_true_positives": tp_events,
        "event_false_positives": fp_detections,
        "event_false_negatives": fn_events,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "per_video_summaries": per_video_event_summaries
    }


def evaluate_dataset(
    annotations_path: Path,
    output_path: Path,
    pipeline: Optional[VideoIncidentPipeline] = None,
    sample_fps: float = 5.0,
    conf_threshold: float = 0.35,
    imgsz: int = 480,
    temporal_window_sec: float = 1.5,
    temporal_min_hits: int = 2,
    spatial_iou_threshold: float = 0.05,
    max_centroid_dist: float = 180.0
) -> Dict[str, Any]:
    """
    Executes non-destructive dataset evaluation across all annotated videos.
    - Uses in-memory direct pipeline processing (no database writes).
    - Writes snapshots to an isolated temporary directory to preserve existing evidence.
    - Avoids video re-encoding (save_annotated_video=False).
    - Captures errors explicitly without masking failed runs as zero detections.
    - Exports results to JSON.
    """
    annotations_data = load_annotations(annotations_path)
    video_entries = annotations_data.get("videos", [])

    # Setup isolated snapshot directory to ensure existing evidence snapshots in data/snapshots are untouched
    temp_dir_obj = tempfile.TemporaryDirectory(prefix="traffic_eval_")
    eval_snapshot_dir = Path(temp_dir_obj.name)

    if pipeline is None:
        if not DEFAULT_MODEL_PATH.exists():
            raise FileNotFoundError(f"AI Model weights not found at: {DEFAULT_MODEL_PATH.resolve()}")
        detector = AccidentDetector(model_path=str(DEFAULT_MODEL_PATH))
        pipeline = VideoIncidentPipeline(detector=detector, snapshot_dir=str(eval_snapshot_dir))
    else:
        # Override snapshot_dir to guarantee isolation
        pipeline.snapshot_dir = eval_snapshot_dir

    video_results = []
    outcomes: List[str] = []
    error_count = 0
    total_sampled_frames = 0
    total_inference_latencies = []

    print("=" * 75)
    print("AI-Powered Traffic Safety System - Dataset Evaluation")
    print(f"Annotations: {annotations_path}")
    print(f"Total Videos: {len(video_entries)}")
    print("Mode: Non-destructive in-memory evaluation (no database records modified)")
    print("=" * 75)

    for idx, item in enumerate(video_entries, start=1):
        vid_id = item.get("id", f"video_{idx}")
        raw_path = item.get("video_path", "")
        vpath = Path(raw_path)
        if not vpath.is_absolute():
            vpath = (ROOT_DIR / raw_path).resolve()

        camera_id = item.get("camera_id", "CAM-01")
        has_accident_gt = item.get("has_accident", False)
        expected_count = item.get("expected_incident_count", 0)
        gt_events = item.get("ground_truth_events", [])

        print(f"\n[{idx}/{len(video_entries)}] Evaluating: {item.get('label', vid_id)}")
        print(f"      File: {raw_path}")
        print(f"      Ground Truth: {'Accident' if has_accident_gt else 'Normal Traffic'} (Expected Incidents: {expected_count})")

        # Verify video file existence
        if not vpath.exists():
            err_msg = f"Video file not found at: {vpath}"
            print(f"      [!] ERROR: {err_msg}")
            error_count += 1
            video_results.append({
                "id": vid_id,
                "video_path": raw_path,
                "camera_id": camera_id,
                "ground_truth": {
                    "has_accident": has_accident_gt,
                    "expected_incident_count": expected_count,
                    "ground_truth_events": gt_events
                },
                "prediction": None,
                "classification": "ERROR",
                "error": err_msg,
                "benchmark": None
            })
            continue

        try:
            res: PipelineResult = pipeline.process_video(
                video_path=str(vpath),
                camera_id=camera_id,
                sample_fps=sample_fps,
                conf_threshold=conf_threshold,
                imgsz=imgsz,
                temporal_window_sec=temporal_window_sec,
                temporal_min_hits=temporal_min_hits,
                spatial_iou_threshold=spatial_iou_threshold,
                max_centroid_dist=max_centroid_dist,
                save_annotated_video=False
            )

            detected_incidents = [
                {
                    "incident_id": inc.incident_id,
                    "camera_id": inc.camera_id,
                    "start_time_sec": round(inc.start_time_sec, 2),
                    "end_time_sec": round(inc.end_time_sec, 2),
                    "duration_sec": round(inc.end_time_sec - inc.start_time_sec, 2),
                    "accident_class": inc.accident_class,
                    "peak_confidence": round(inc.peak_confidence, 4),
                    "hit_count": inc.hit_count,
                    "evidence_box": inc.evidence_box
                }
                for inc in res.confirmed_incidents
            ]

            detected_count = len(detected_incidents)
            classification = classify_video_outcome(has_accident_gt, detected_count)
            outcomes.append(classification)

            matched_events = match_detected_with_ground_truth(detected_incidents, gt_events)

            total_sampled_frames += res.benchmark.sampled_frames
            total_inference_latencies.append(res.benchmark.avg_inference_latency_ms)

            benchmark_summary = {
                "video_duration_sec": round(res.video_duration_sec, 2),
                "total_frames": res.total_frames,
                "sampled_frames": res.benchmark.sampled_frames,
                "sample_fps": res.benchmark.sample_fps,
                "avg_inference_latency_ms": round(res.benchmark.avg_inference_latency_ms, 2),
                "effective_video_speed_factor": round(res.benchmark.effective_video_speed_factor, 2)
            }

            print(f"      Outcome: {classification} | Confirmed Incidents: {detected_count} | Latency: {benchmark_summary['avg_inference_latency_ms']} ms/frame")

            video_results.append({
                "id": vid_id,
                "video_path": raw_path,
                "camera_id": camera_id,
                "ground_truth": {
                    "has_accident": has_accident_gt,
                    "expected_incident_count": expected_count,
                    "ground_truth_events": gt_events
                },
                "prediction": {
                    "has_accident": detected_count > 0,
                    "detected_incident_count": detected_count,
                    "classification": classification,
                    "detected_incidents": detected_incidents,
                    "matched_events": matched_events
                },
                "benchmark": benchmark_summary,
                "error": None
            })

        except Exception as exc:
            err_msg = f"{type(exc).__name__}: {str(exc)}"
            print(f"      [!] Pipeline Execution Failed: {err_msg}")
            error_count += 1
            video_results.append({
                "id": vid_id,
                "video_path": raw_path,
                "camera_id": camera_id,
                "ground_truth": {
                    "has_accident": has_accident_gt,
                    "expected_incident_count": expected_count,
                    "ground_truth_events": gt_events
                },
                "prediction": None,
                "classification": "ERROR",
                "error": err_msg,
                "benchmark": None
            })

    # Cleanup temporary directory safely
    temp_dir_obj.cleanup()

    # Compute overall classification metrics (video-level)
    metrics = calculate_classification_metrics(outcomes)
    metrics["error_count"] = error_count

    # Compute fine-grained event-level metrics (temporal ground truth matching)
    event_metrics = calculate_event_level_metrics(video_results, tolerance_sec=2.0)

    avg_latency = float(sum(total_inference_latencies) / len(total_inference_latencies)) if total_inference_latencies else 0.0

    final_report = {
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "annotation_source": str(annotations_path.as_posix()),
        "model_path": str(DEFAULT_MODEL_PATH.as_posix()),
        "pipeline_config": {
            "sample_fps": sample_fps,
            "conf_threshold": conf_threshold,
            "imgsz": imgsz,
            "temporal_window_sec": temporal_window_sec,
            "temporal_min_hits": temporal_min_hits,
            "spatial_iou_threshold": spatial_iou_threshold,
            "max_centroid_dist": max_centroid_dist,
            "save_annotated_video": False
        },
        "metrics": metrics,
        "video_level_metrics": metrics,
        "event_level_metrics": event_metrics,
        "performance_summary": {
            "total_sampled_frames": total_sampled_frames,
            "avg_inference_latency_ms": round(avg_latency, 2)
        },
        "video_results": video_results
    }

    # Save machine-readable results
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=2)

    print("\n" + "=" * 75)
    print("EVALUATION SUMMARY")
    print("=" * 75)
    print("--- Video-Level Metrics (Binary Classification) ---")
    print(f"Total Videos:      {metrics['total_evaluated']} evaluated ({error_count} errors)")
    print(f"True Positives:    {metrics['true_positives']}")
    print(f"True Negatives:    {metrics['true_negatives']}")
    print(f"False Positives:   {metrics['false_positives']}")
    print(f"False Negatives:   {metrics['false_negatives']}")
    print(f"Accuracy:          {metrics['accuracy']:.4f}")
    print(f"Precision:         {metrics['precision']:.4f}")
    print(f"Recall:            {metrics['recall']:.4f}")
    print(f"F1-Score:          {metrics['f1_score']:.4f}")
    print("\n--- Event-Level Metrics (Temporal Ground-Truth Matching) ---")
    print(f"Total GT Events:   {event_metrics['total_ground_truth_events']}")
    print(f"Total Detections:  {event_metrics['total_detected_incidents']}")
    print(f"Event TPs:         {event_metrics['event_true_positives']} (Matched ground-truth events)")
    print(f"Event FPs:         {event_metrics['event_false_positives']} (False alarms / out-of-window detections)")
    print(f"Event FNs:         {event_metrics['event_false_negatives']} (Missed collision events)")
    print(f"Event Precision:   {event_metrics['precision']:.4f}")
    print(f"Event Recall:      {event_metrics['recall']:.4f}")
    print(f"Event F1-Score:    {event_metrics['f1_score']:.4f}")
    print(f"\nMachine-readable:  {output_path.resolve()}")
    print("=" * 75)

    return final_report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate traffic safety AI pipeline across benchmark dataset.")
    parser.add_argument("--annotations", type=str, default="data/test_annotations.json", help="Path to annotations JSON")
    parser.add_argument("--output", type=str, default="data/evaluation_results.json", help="Output path for evaluation JSON")
    parser.add_argument("--sample-fps", type=float, default=5.0, help="Sampling frequency (Hz)")
    parser.add_argument("--conf-threshold", type=float, default=0.35, help="Detection confidence threshold")
    parser.add_argument("--imgsz", type=int, default=480, help="Inference image resolution")
    parser.add_argument("--window-sec", type=float, default=1.5, help="Temporal window length in seconds")
    parser.add_argument("--min-hits", type=int, default=2, help="Minimum consecutive hits in window")
    args = parser.parse_args()

    ann_path = Path(args.annotations)
    if not ann_path.is_absolute():
        ann_path = (ROOT_DIR / ann_path).resolve()

    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = (ROOT_DIR / out_path).resolve()

    evaluate_dataset(
        annotations_path=ann_path,
        output_path=out_path,
        sample_fps=args.sample_fps,
        conf_threshold=args.conf_threshold,
        imgsz=args.imgsz,
        temporal_window_sec=args.window_sec,
        temporal_min_hits=args.min_hits
    )
