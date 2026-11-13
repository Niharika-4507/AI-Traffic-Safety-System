from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Camera Schemas
# ---------------------------------------------------------------------------
class CameraBase(BaseModel):
    name: str = Field(..., max_length=128, description="Camera display name")
    location: str = Field(..., max_length=255, description="Geographic location or intersection")
    latitude: Optional[float] = Field(None, description="GPS Latitude")
    longitude: Optional[float] = Field(None, description="GPS Longitude")
    status: str = Field("ACTIVE", description="Camera status: ACTIVE, INACTIVE, MAINTENANCE")
    feed_url: Optional[str] = Field(None, description="Default feed URL or test video path")

class CameraCreate(CameraBase):
    id: str = Field(..., max_length=64, description="Unique camera ID (e.g. CAM-HIGHWAY-02)")

class CameraResponse(CameraBase):
    id: str
    created_at: datetime
    updated_at: datetime
    incidents_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Dispatch Log Schemas
# ---------------------------------------------------------------------------
class DispatchLogBase(BaseModel):
    dispatch_type: str = Field(..., description="Type of dispatch: POLICE, AMBULANCE, FIRE_RESCUE, TRAFFIC_CONTROL")
    recipient_agency: str = Field(..., description="Target service (e.g. Metro EMS Unit 4)")
    notes: Optional[str] = Field(None, description="Notes on the incident response action")

class DispatchLogCreate(DispatchLogBase):
    incident_id: int = Field(..., description="ID of the incident to dispatch for")

class DispatchLogResponse(DispatchLogBase):
    id: int
    incident_id: int
    status: str
    is_simulated: bool
    dispatched_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Incident Schemas
# ---------------------------------------------------------------------------
class IncidentBase(BaseModel):
    camera_id: str
    video_source: str
    timestamp_start: float
    timestamp_end: float
    duration_sec: float
    accident_class: str
    confidence: float
    evidence_snapshot_path: Optional[str] = None
    evidence_box_json: Optional[str] = None
    hit_count: int = 1
    status: str = "DETECTED"

class IncidentUpdateStatus(BaseModel):
    status: str = Field(..., description="New status: DETECTED, VERIFIED, DISPATCHED, RESOLVED, FALSE_ALARM")
    notes: Optional[str] = Field(None, description="Reason for status change")

class IncidentResponse(IncidentBase):
    id: int
    incident_code: str
    evidence_snapshot_url: Optional[str] = None
    detected_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IncidentDetailResponse(IncidentResponse):
    camera: Optional[CameraResponse] = None
    dispatch_logs: List[DispatchLogResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Video Ingestion & Processing Schemas
# ---------------------------------------------------------------------------
class VideoProcessRequest(BaseModel):
    video_path: str = Field(..., description="Path to video file (relative to project root or absolute)")
    camera_id: Optional[str] = Field("CAM-HIGHWAY-02", description="Camera ID to attribute detections to")
    sample_fps: float = Field(5.0, ge=0.5, le=30.0, description="Processing sample frequency (Hz)")
    conf_threshold: float = Field(0.35, ge=0.05, le=1.0, description="Accident detection confidence threshold")
    temporal_min_hits: int = Field(2, ge=1, le=20, description="Minimum consecutive hits in window to confirm incident")
    temporal_window_sec: float = Field(1.5, ge=0.5, le=10.0, description="Rolling time window length in seconds")
    save_annotated_video: bool = Field(False, description="Optionally export annotated MP4 video")

class PipelineBenchmarkSchema(BaseModel):
    imgsz: int
    sample_fps: float
    total_frames: int
    sampled_frames: int
    video_duration_sec: float
    avg_inference_latency_ms: float
    effective_video_speed_factor: float

class VideoProcessResponse(BaseModel):
    video_path: str
    camera_id: str
    video_duration_sec: float
    benchmark: PipelineBenchmarkSchema
    incidents_found: int
    new_incidents_created: int
    duplicates_prevented: int
    incidents: List[IncidentResponse]
    evidence_snapshots: List[str]


# ---------------------------------------------------------------------------
# Health Schema
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    database: str
    detector_loaded: bool
    cameras_count: int
    incidents_count: int
    simulation_mode: bool
    timestamp: datetime
