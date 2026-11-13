import os
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.config import ROOT_DIR, DEFAULT_MODEL_PATH, SNAPSHOTS_DIR
from backend.app.crud import create_incident_with_dedup, get_camera_by_id, create_or_update_camera
from backend.app.models import Incident, Camera
from backend.app.schemas import CameraCreate, VideoProcessRequest, VideoProcessResponse, PipelineBenchmarkSchema, IncidentResponse

from ai_engine.detector import AccidentDetector
from ai_engine.pipeline import VideoIncidentPipeline, PipelineResult

class AIService:
    _instance: Optional["AIService"] = None
    _detector: Optional[AccidentDetector] = None
    _pipeline: Optional[VideoIncidentPipeline] = None

    @classmethod
    def get_instance(cls) -> "AIService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_model_loaded(self) -> bool:
        return self._detector is not None

    def get_detector(self) -> AccidentDetector:
        if self._detector is None:
            if not DEFAULT_MODEL_PATH.exists():
                raise FileNotFoundError(f"AI Model weights not found at: {DEFAULT_MODEL_PATH.resolve()}")
            self._detector = AccidentDetector(model_path=str(DEFAULT_MODEL_PATH))
        return self._detector

    def get_pipeline(self) -> VideoIncidentPipeline:
        if self._pipeline is None:
            detector = self.get_detector()
            self._pipeline = VideoIncidentPipeline(detector=detector, snapshot_dir=str(SNAPSHOTS_DIR))
        return self._pipeline

    def process_video_and_sync_db(
        self,
        db: Session,
        request: VideoProcessRequest
    ) -> Dict[str, Any]:
        """
        Executes video processing through the AI pipeline, persists any confirmed
        incidents into SQLite, and enforces deduplication.
        """
        # Resolve video path
        v_path = Path(request.video_path)
        if not v_path.is_absolute():
            v_path = (ROOT_DIR / request.video_path).resolve()
            
        if not v_path.exists():
            raise FileNotFoundError(f"Video file not found at: {v_path}")

        # Derive relative video path for storage and response
        rel_video_source = str(v_path)
        try:
            rel_video_source = v_path.resolve().relative_to(ROOT_DIR).as_posix()
        except ValueError:
            pass

        camera_id = request.camera_id or "CAM-01"

        # Ensure camera exists in DB; if not auto-register default record
        cam = get_camera_by_id(db, camera_id)
        if not cam:
            create_or_update_camera(
                db,
                CameraCreate(
                    id=camera_id,
                    name=f"Traffic Camera {camera_id}",
                    location="Auto-registered Camera Location",
                    status="ACTIVE",
                    feed_url=str(v_path)
                )
            )

        pipeline = self.get_pipeline()

        # Run pipeline
        res: PipelineResult = pipeline.process_video(
            video_path=str(v_path),
            camera_id=camera_id,
            sample_fps=request.sample_fps,
            conf_threshold=request.conf_threshold,
            imgsz=480,
            temporal_window_sec=request.temporal_window_sec,
            temporal_min_hits=request.temporal_min_hits,
            spatial_iou_threshold=0.05,
            max_centroid_dist=180.0,
            save_annotated_video=request.save_annotated_video
        )

        persisted_incidents: List[Incident] = []
        new_count = 0
        dup_count = 0

        # Snapshot pairing
        snapshots = res.snapshot_paths

        for idx, inc_event in enumerate(res.confirmed_incidents):
            # Select matching snapshot path if available
            snap_path = snapshots[idx] if idx < len(snapshots) else (snapshots[0] if snapshots else None)
            
            # Make snapshot path relative for portability if inside ROOT_DIR
            relative_snap = None
            if snap_path:
                try:
                    relative_snap = Path(snap_path).resolve().relative_to(ROOT_DIR).as_posix()
                except ValueError:
                    relative_snap = str(snap_path)

            incident_orm, is_new = create_incident_with_dedup(
                db=db,
                camera_id=camera_id,
                video_source=rel_video_source,
                start_time_sec=inc_event.start_time_sec,
                end_time_sec=inc_event.end_time_sec,
                accident_class=inc_event.accident_class,
                confidence=inc_event.peak_confidence,
                hit_count=inc_event.hit_count,
                evidence_box=inc_event.evidence_box,
                evidence_snapshot_path=relative_snap
            )

            persisted_incidents.append(incident_orm)
            if is_new:
                new_count += 1
            else:
                dup_count += 1

        benchmark_dict = {
            "imgsz": res.benchmark.imgsz,
            "sample_fps": res.benchmark.sample_fps,
            "total_frames": res.benchmark.total_frames,
            "sampled_frames": res.benchmark.sampled_frames,
            "video_duration_sec": round(res.benchmark.video_duration_sec, 2),
            "avg_inference_latency_ms": round(res.benchmark.avg_inference_latency_ms, 2),
            "effective_video_speed_factor": round(res.benchmark.effective_video_speed_factor, 2)
        }

        # Build IncidentResponse list with evidence snapshot URLs
        incident_responses = []
        for inc in persisted_incidents:
            resp_dict = {
                "id": inc.id,
                "incident_code": inc.incident_code,
                "camera_id": inc.camera_id,
                "video_source": inc.video_source,
                "timestamp_start": inc.timestamp_start,
                "timestamp_end": inc.timestamp_end,
                "duration_sec": inc.duration_sec,
                "accident_class": inc.accident_class,
                "confidence": inc.confidence,
                "evidence_snapshot_path": inc.evidence_snapshot_path,
                "evidence_snapshot_url": f"/api/evidence/{Path(inc.evidence_snapshot_path).name}" if inc.evidence_snapshot_path else None,
                "evidence_box_json": inc.evidence_box_json,
                "hit_count": inc.hit_count,
                "status": inc.status,
                "detected_at": inc.detected_at,
                "updated_at": inc.updated_at
            }
            incident_responses.append(resp_dict)

        return {
            "video_path": rel_video_source,
            "camera_id": camera_id,
            "video_duration_sec": round(res.video_duration_sec, 2),
            "benchmark": benchmark_dict,
            "incidents_found": len(res.confirmed_incidents),
            "new_incidents_created": new_count,
            "duplicates_prevented": dup_count,
            "incidents": incident_responses,
            "evidence_snapshots": [Path(s).name for s in snapshots]
        }
