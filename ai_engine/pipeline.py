import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np

from ai_engine.detector import AccidentDetector, Detection
from ai_engine.temporal_filter import TemporalIncidentValidator, IncidentEvent

@dataclass
class PipelineBenchmark:
    imgsz: int
    sample_fps: float
    total_frames: int
    sampled_frames: int
    video_duration_sec: float
    total_inference_time_sec: float
    avg_inference_latency_ms: float
    min_inference_latency_ms: float
    max_inference_latency_ms: float
    effective_video_speed_factor: float  # (video_duration / total_processing_time)

@dataclass
class PipelineResult:
    video_path: str
    camera_id: str
    video_fps: float
    total_frames: int
    video_duration_sec: float
    benchmark: PipelineBenchmark
    confirmed_incidents: List[IncidentEvent]
    snapshot_paths: List[str]
    annotated_video_path: Optional[str]

class VideoIncidentPipeline:
    """
    Modular video processing pipeline orchestrating:
    1. OpenCV video ingestion and timestamp tracking.
    2. Configurable frame sampling rate (Hz / FPS).
    3. AccidentDetector inference.
    4. Temporal validation filter.
    5. Evidence snapshot export and optional annotated video export.
    """
    def __init__(
        self,
        detector: AccidentDetector,
        snapshot_dir: str = "data/snapshots"
    ):
        self.detector = detector
        self.snapshot_dir = Path(snapshot_dir)
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)

    def process_video(
        self,
        video_path: str,
        camera_id: str = "CAM-01",
        sample_fps: float = 2.0,
        conf_threshold: float = 0.35,
        imgsz: int = 480,
        temporal_window_sec: float = 1.5,
        temporal_min_hits: int = 3,
        spatial_iou_threshold: float = 0.05,
        max_centroid_dist: float = 180.0,
        save_annotated_video: bool = False,
        output_video_path: Optional[str] = None
    ) -> PipelineResult:
        vpath = Path(video_path)
        if not vpath.exists():
            raise FileNotFoundError(f"Video file not found: {vpath.resolve()}")

        cap = cv2.VideoCapture(str(vpath))
        if not cap.isOpened():
            raise RuntimeError(f"OpenCV could not open video: {vpath.resolve()}")

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        if video_fps <= 0 or np.isnan(video_fps):
            video_fps = 25.0  # safe default fallback
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        video_duration_sec = total_frames / video_fps

        # Determine frame sampling step
        # E.g. If video is 25 FPS and sample_fps is 2.0, step = max(1, round(25 / 2)) = 12 frames
        frame_step = max(1, round(video_fps / sample_fps))
        effective_sample_fps = video_fps / frame_step

        temporal_validator = TemporalIncidentValidator(
            window_seconds=temporal_window_sec,
            min_hits=temporal_min_hits,
            spatial_iou_threshold=spatial_iou_threshold,
            max_centroid_dist=max_centroid_dist,
            cooldown_seconds=3.0,
            camera_id=camera_id
        )

        video_writer = None
        if save_annotated_video and output_video_path:
            out_p = Path(output_video_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(str(out_p), fourcc, effective_sample_fps, (frame_width, frame_height))

        latencies_ms: List[float] = []
        sampled_count = 0
        snapshot_paths: List[str] = []
        frame_idx = 0
        
        t_pipeline_start = time.perf_counter()

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Only process sampled frames
            if frame_idx % frame_step == 0:
                sampled_count += 1
                timestamp_sec = frame_idx / video_fps

                # Time inference
                t_inf_start = time.perf_counter()
                detections = self.detector.detect(frame, conf_threshold=conf_threshold, imgsz=imgsz)
                inf_latency = (time.perf_counter() - t_inf_start) * 1000.0
                latencies_ms.append(inf_latency)

                # Update temporal validator
                new_incident = temporal_validator.update(timestamp_sec, frame_idx, detections)
                
                # If an incident was confirmed or is active, save snapshot
                is_active = temporal_validator.is_incident_active
                if new_incident or (is_active and len(snapshot_paths) == 0):
                    snap_name = f"{camera_id}_{timestamp_sec:06.2f}s_frame{frame_idx}.jpg"
                    snap_path = self.snapshot_dir / snap_name
                    # Draw detections onto copy for evidence
                    evidence_frame = self._draw_annotations(frame.copy(), detections, timestamp_sec, is_active)
                    cv2.imwrite(str(snap_path), evidence_frame)
                    snapshot_paths.append(str(snap_path))

                if video_writer is not None:
                    annotated_frame = self._draw_annotations(frame.copy(), detections, timestamp_sec, is_active)
                    video_writer.write(annotated_frame)

            frame_idx += 1

        cap.release()
        if video_writer is not None:
            video_writer.release()

        confirmed_incidents = temporal_validator.finalize()
        total_processing_time = time.perf_counter() - t_pipeline_start
        total_inf_time = sum(latencies_ms) / 1000.0

        avg_lat = np.mean(latencies_ms) if latencies_ms else 0.0
        min_lat = np.min(latencies_ms) if latencies_ms else 0.0
        max_lat = np.max(latencies_ms) if latencies_ms else 0.0
        speed_factor = video_duration_sec / total_processing_time if total_processing_time > 0 else 0.0

        benchmark = PipelineBenchmark(
            imgsz=imgsz,
            sample_fps=effective_sample_fps,
            total_frames=total_frames,
            sampled_frames=sampled_count,
            video_duration_sec=video_duration_sec,
            total_inference_time_sec=total_inf_time,
            avg_inference_latency_ms=float(avg_lat),
            min_inference_latency_ms=float(min_lat),
            max_inference_latency_ms=float(max_lat),
            effective_video_speed_factor=float(speed_factor)
        )

        return PipelineResult(
            video_path=str(vpath),
            camera_id=camera_id,
            video_fps=video_fps,
            total_frames=total_frames,
            video_duration_sec=video_duration_sec,
            benchmark=benchmark,
            confirmed_incidents=confirmed_incidents,
            snapshot_paths=snapshot_paths,
            annotated_video_path=output_video_path if save_annotated_video else None
        )

    def _draw_annotations(
        self,
        frame: np.ndarray,
        detections: List[Detection],
        timestamp_sec: float,
        is_incident_active: bool
    ) -> np.ndarray:
        """Annotates frame with bounding boxes and system status HUD."""
        # Top banner HUD
        h, w = frame.shape[:2]
        banner_color = (0, 0, 180) if is_incident_active else (40, 40, 40)
        cv2.rectangle(frame, (0, 0), (w, 40), banner_color, -1)
        
        status_text = f"ALERT: ACCIDENT CONFIRMED (T={timestamp_sec:.2f}s)" if is_incident_active else f"MONITORING: NORMAL TRAFFIC (T={timestamp_sec:.2f}s)"
        cv2.putText(frame, status_text, (15, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # Draw boxes
        for det in detections:
            x1, y1, x2, y2 = det.box
            color = (0, 0, 255) if det.is_accident else (0, 200, 0)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            label = f"{det.class_name}: {det.confidence:.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x1, max(0, y1 - th - 6)), (x1 + tw + 4, max(th + 6, y1)), color, -1)
            cv2.putText(frame, label, (x1 + 2, max(th + 2, y1 - 3)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        return frame
