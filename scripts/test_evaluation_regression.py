import os
import sys
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.evaluate_dataset import (
    load_annotations,
    classify_video_outcome,
    calculate_classification_metrics,
    match_detected_with_ground_truth,
    evaluate_dataset
)
from ai_engine.temporal_filter import IncidentEvent
from ai_engine.pipeline import PipelineResult, PipelineBenchmark


class TestAnnotationSchemaAndIntegrity(unittest.TestCase):
    """Verifies data/test_annotations.json schema and video file existence."""

    def setUp(self):
        self.annotations_path = ROOT_DIR / "data" / "test_annotations.json"

    def test_annotations_file_exists_and_is_valid_json(self):
        self.assertTrue(self.annotations_path.exists(), f"Annotations file missing: {self.annotations_path}")
        with open(self.annotations_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIn("version", data)
        self.assertIn("videos", data)
        self.assertIsInstance(data["videos"], list)
        self.assertGreaterEqual(len(data["videos"]), 3, "Expected at least 3 test videos in annotations")
        
        # Verify baseline clips are always present
        baseline_ids = {"clip_normal_traffic", "clip_downtown_intersection", "clip_highway_collision"}
        found_ids = {v.get("id") for v in data["videos"]}
        self.assertTrue(baseline_ids.issubset(found_ids), f"Missing baseline video IDs: {baseline_ids - found_ids}")

    def test_video_paths_exist_on_disk(self):
        with open(self.annotations_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        for item in data["videos"]:
            vpath = ROOT_DIR / item["video_path"]
            self.assertTrue(vpath.exists(), f"Test video does not exist: {vpath}")
            self.assertGreater(vpath.stat().st_size, 0, f"Video file is empty: {vpath}")

    def test_ground_truth_labels_and_windows(self):
        with open(self.annotations_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        by_id = {v["id"]: v for v in data["videos"]}
        
        # 1. Normal traffic negative control
        self.assertIn("clip_normal_traffic", by_id)
        normal_clip = by_id["clip_normal_traffic"]
        self.assertFalse(normal_clip["has_accident"])
        self.assertEqual(normal_clip["expected_incident_count"], 0)
        self.assertEqual(len(normal_clip["ground_truth_events"]), 0)

        # 2. Downtown intersection accident
        self.assertIn("clip_downtown_intersection", by_id)
        v1_clip = by_id["clip_downtown_intersection"]
        self.assertTrue(v1_clip["has_accident"])
        self.assertEqual(v1_clip["expected_incident_count"], 1)
        self.assertGreaterEqual(len(v1_clip["ground_truth_events"]), 1)
        v1_event = v1_clip["ground_truth_events"][0]
        self.assertAlmostEqual(v1_event["start_time_sec"], 7.4, delta=0.5)
        self.assertAlmostEqual(v1_event["end_time_sec"], 10.2, delta=0.5)

        # 3. Highway collision accident
        self.assertIn("clip_highway_collision", by_id)
        v2_clip = by_id["clip_highway_collision"]
        self.assertTrue(v2_clip["has_accident"])
        self.assertEqual(v2_clip["expected_incident_count"], 1)
        self.assertGreaterEqual(len(v2_clip["ground_truth_events"]), 1)
        v2_event = v2_clip["ground_truth_events"][0]
        self.assertAlmostEqual(v2_event["start_time_sec"], 15.0, delta=0.5)
        self.assertAlmostEqual(v2_event["end_time_sec"], 16.0, delta=0.5)


class TestMetricsCalculation(unittest.TestCase):
    """Verifies confusion matrix classification and safe metric math (no zero-division)."""

    def test_classify_video_outcome(self):
        self.assertEqual(classify_video_outcome(ground_truth_has_accident=True, detected_incidents_count=1), "TP")
        self.assertEqual(classify_video_outcome(ground_truth_has_accident=True, detected_incidents_count=2), "TP")
        self.assertEqual(classify_video_outcome(ground_truth_has_accident=False, detected_incidents_count=0), "TN")
        self.assertEqual(classify_video_outcome(ground_truth_has_accident=False, detected_incidents_count=1), "FP")
        self.assertEqual(classify_video_outcome(ground_truth_has_accident=True, detected_incidents_count=0), "FN")

    def test_metrics_standard_case(self):
        outcomes = ["TP", "TP", "TN"]
        metrics = calculate_classification_metrics(outcomes)
        self.assertEqual(metrics["true_positives"], 2)
        self.assertEqual(metrics["true_negatives"], 1)
        self.assertEqual(metrics["false_positives"], 0)
        self.assertEqual(metrics["false_negatives"], 0)
        self.assertEqual(metrics["accuracy"], 1.0)
        self.assertEqual(metrics["precision"], 1.0)
        self.assertEqual(metrics["recall"], 1.0)
        self.assertEqual(metrics["f1_score"], 1.0)

    def test_metrics_zero_denominators_safety(self):
        # Empty outcomes
        m_empty = calculate_classification_metrics([])
        self.assertEqual(m_empty["accuracy"], 0.0)
        self.assertEqual(m_empty["precision"], 0.0)
        self.assertEqual(m_empty["recall"], 0.0)
        self.assertEqual(m_empty["f1_score"], 0.0)

        # All True Negatives (no positives predicted or actual)
        m_tn = calculate_classification_metrics(["TN", "TN"])
        self.assertEqual(m_tn["accuracy"], 1.0)
        self.assertEqual(m_tn["precision"], 0.0)
        self.assertEqual(m_tn["recall"], 0.0)
        self.assertEqual(m_tn["f1_score"], 0.0)

        # All False Positives
        m_fp = calculate_classification_metrics(["FP"])
        self.assertEqual(m_fp["accuracy"], 0.0)
        self.assertEqual(m_fp["precision"], 0.0)
        self.assertEqual(m_fp["recall"], 0.0)
        self.assertEqual(m_fp["f1_score"], 0.0)


class TestTemporalMatching(unittest.TestCase):
    """Verifies temporal event matching logic between detections and ground truth."""

    def test_temporal_overlap_match(self):
        detected = [
            {"incident_id": "INC-01", "start_time_sec": 7.6, "end_time_sec": 10.0, "accident_class": "car_bike_accident"}
        ]
        gt_events = [
            {"event_id": "GT-01", "start_time_sec": 7.4, "end_time_sec": 10.2, "expected_classes": ["car_bike_accident"]}
        ]
        matches = match_detected_with_ground_truth(detected, gt_events, tolerance_sec=2.0)
        self.assertEqual(len(matches), 1)
        self.assertTrue(matches[0]["is_matched"])
        self.assertEqual(matches[0]["matched_incident"]["incident_id"], "INC-01")

    def test_temporal_no_match(self):
        detected = [
            {"incident_id": "INC-01", "start_time_sec": 25.0, "end_time_sec": 28.0, "accident_class": "car_car_accident"}
        ]
        gt_events = [
            {"event_id": "GT-01", "start_time_sec": 7.4, "end_time_sec": 10.2, "expected_classes": ["car_bike_accident"]}
        ]
        matches = match_detected_with_ground_truth(detected, gt_events, tolerance_sec=2.0)
        self.assertFalse(matches[0]["is_matched"])
        self.assertIsNone(matches[0]["matched_incident"])


class TestMockEvaluationFlow(unittest.TestCase):
    """Verifies that evaluate_dataset executes properly without actual YOLO inference."""

    def test_evaluate_dataset_with_mocked_pipeline(self):
        # Build mock pipeline
        mock_pipeline = MagicMock()

        def mock_process_video(video_path, **kwargs):
            p_str = str(video_path).lower()
            if "normal" in p_str:
                incidents = []
            elif "video1" in p_str:
                incidents = [
                    IncidentEvent(
                        incident_id="INC-V1",
                        camera_id="CAM-DOWNTOWN-01",
                        start_time_sec=7.6,
                        end_time_sec=10.2,
                        peak_confidence=0.88,
                        accident_class="car_bike_accident",
                        evidence_frame_idx=190,
                        evidence_box=(100, 100, 200, 200),
                        hit_count=3
                    )
                ]
            else:
                incidents = [
                    IncidentEvent(
                        incident_id="INC-V2",
                        camera_id="CAM-HIGHWAY-02",
                        start_time_sec=15.2,
                        end_time_sec=15.8,
                        peak_confidence=0.85,
                        accident_class="car_car_accident",
                        evidence_frame_idx=220,
                        evidence_box=(150, 120, 250, 210),
                        hit_count=3
                    )
                ]
            
            return PipelineResult(
                video_path=str(video_path),
                camera_id=kwargs.get("camera_id", "CAM-01"),
                video_fps=25.0,
                total_frames=500,
                video_duration_sec=20.0,
                confirmed_incidents=incidents,
                snapshot_paths=[],
                annotated_video_path=None,
                benchmark=PipelineBenchmark(
                    imgsz=480,
                    sample_fps=5.0,
                    total_frames=500,
                    sampled_frames=100,
                    video_duration_sec=20.0,
                    total_inference_time_sec=10.0,
                    avg_inference_latency_ms=100.0,
                    min_inference_latency_ms=80.0,
                    max_inference_latency_ms=120.0,
                    effective_video_speed_factor=2.0
                )
            )

        mock_pipeline.process_video.side_effect = mock_process_video

        # Create a self-contained synthetic annotation dataset to decouple test from full annotations length
        synthetic_videos = [
            {
                "id": "synth_normal",
                "video_path": "data/test_videos/normal_traffic.mp4",
                "camera_id": "CAM-NORTH-03",
                "label": "Synthetic Normal Clip",
                "clip_type": "negative_control",
                "has_accident": False,
                "expected_incident_count": 0,
                "description": "Synthetic test negative control",
                "ground_truth_events": []
            },
            {
                "id": "synth_accident_1",
                "video_path": "data/test_videos/video1.mp4",
                "camera_id": "CAM-DOWNTOWN-01",
                "label": "Synthetic Accident Clip 1",
                "clip_type": "accident_scenario",
                "has_accident": True,
                "expected_incident_count": 1,
                "description": "Synthetic test accident scenario 1",
                "ground_truth_events": [
                    {
                        "event_id": "GT-SYNTH-01",
                        "start_time_sec": 7.4,
                        "end_time_sec": 10.2,
                        "expected_classes": ["car_bike_accident"],
                        "description": "Synthetic event 1"
                    }
                ]
            },
            {
                "id": "synth_accident_2",
                "video_path": "data/test_videos/video2.mp4",
                "camera_id": "CAM-HIGHWAY-02",
                "label": "Synthetic Accident Clip 2",
                "clip_type": "accident_scenario",
                "has_accident": True,
                "expected_incident_count": 1,
                "description": "Synthetic test accident scenario 2",
                "ground_truth_events": [
                    {
                        "event_id": "GT-SYNTH-02",
                        "start_time_sec": 15.0,
                        "end_time_sec": 16.0,
                        "expected_classes": ["car_car_accident"],
                        "description": "Synthetic event 2"
                    }
                ]
            }
        ]
        synthetic_data = {
            "version": "1.0",
            "videos": synthetic_videos
        }

        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_annotations = Path(tmp_dir) / "synthetic_annotations.json"
            temp_output = Path(tmp_dir) / "test_eval_output.json"

            with open(temp_annotations, "w", encoding="utf-8") as f:
                json.dump(synthetic_data, f, indent=2)

            report = evaluate_dataset(
                annotations_path=temp_annotations,
                output_path=temp_output,
                pipeline=mock_pipeline
            )

            # Assert report structure dynamically without hardcoding total dataset length
            total_expected = len(synthetic_videos)
            self.assertTrue(temp_output.exists(), "Evaluation JSON was not written")
            self.assertEqual(report["metrics"]["total_evaluated"], total_expected)
            self.assertEqual(report["metrics"]["true_positives"], 2)
            self.assertEqual(report["metrics"]["true_negatives"], 1)
            self.assertEqual(report["metrics"]["false_positives"], 0)
            self.assertEqual(report["metrics"]["false_negatives"], 0)
            self.assertEqual(report["metrics"]["accuracy"], 1.0)
            self.assertEqual(report["metrics"]["f1_score"], 1.0)
            self.assertEqual(len(report["video_results"]), total_expected)


if __name__ == "__main__":
    unittest.main(verbosity=2)
