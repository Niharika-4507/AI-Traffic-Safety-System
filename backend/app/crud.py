import json
from pathlib import Path
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.models import Camera, Incident, DispatchLog
from backend.app.schemas import CameraCreate

# ---------------------------------------------------------------------------
# Cameras CRUD
# ---------------------------------------------------------------------------
def get_cameras(db: Session, status: Optional[str] = None) -> List[Camera]:
    query = db.query(Camera)
    if status:
        query = query.filter(Camera.status == status.upper())
    return query.order_by(Camera.id).all()

def get_camera_by_id(db: Session, camera_id: str) -> Optional[Camera]:
    return db.query(Camera).filter(Camera.id == camera_id).first()

def create_or_update_camera(db: Session, camera_in: CameraCreate) -> Camera:
    cam = get_camera_by_id(db, camera_in.id)
    if cam:
        cam.name = camera_in.name
        cam.location = camera_in.location
        cam.latitude = camera_in.latitude
        cam.longitude = camera_in.longitude
        cam.status = camera_in.status.upper()
        if camera_in.feed_url:
            cam.feed_url = camera_in.feed_url
    else:
        cam = Camera(
            id=camera_in.id,
            name=camera_in.name,
            location=camera_in.location,
            latitude=camera_in.latitude,
            longitude=camera_in.longitude,
            status=camera_in.status.upper(),
            feed_url=camera_in.feed_url
        )
        db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam


# ---------------------------------------------------------------------------
# Incidents CRUD & Deduplication
# ---------------------------------------------------------------------------
def get_incidents(
    db: Session,
    camera_id: Optional[str] = None,
    status: Optional[str] = None,
    min_confidence: Optional[float] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Incident]:
    query = db.query(Incident)
    if camera_id:
        query = query.filter(Incident.camera_id == camera_id)
    if status:
        query = query.filter(Incident.status == status.upper())
    if min_confidence is not None:
        query = query.filter(Incident.confidence >= min_confidence)
    return query.order_by(Incident.detected_at.desc(), Incident.id.desc()).offset(offset).limit(limit).all()

def get_incident_by_id(db: Session, incident_id: int) -> Optional[Incident]:
    return db.query(Incident).filter(Incident.id == incident_id).first()

def get_incident_by_code(db: Session, incident_code: str) -> Optional[Incident]:
    return db.query(Incident).filter(Incident.incident_code == incident_code).first()

def update_incident_status(
    db: Session,
    incident_id: int,
    new_status: str,
    notes: Optional[str] = None
) -> Optional[Incident]:
    inc = get_incident_by_id(db, incident_id)
    if not inc:
        return None
    inc.status = new_status.upper()
    db.commit()
    db.refresh(inc)
    return inc

def create_incident_with_dedup(
    db: Session,
    camera_id: str,
    video_source: str,
    start_time_sec: float,
    end_time_sec: float,
    accident_class: str,
    confidence: float,
    hit_count: int,
    evidence_box: Tuple[int, int, int, int],
    evidence_snapshot_path: Optional[str] = None,
    time_tolerance_sec: float = 3.0
) -> Tuple[Incident, bool]:
    """
    Deduplication Strategy (Requirement 7):
    Checks if an incident with matching camera, video_source, accident_class,
    and temporally overlapping window (within time_tolerance_sec) already exists.
    
    Returns:
        (Incident, is_new: bool)
    """
    normalized_source = Path(video_source).as_posix()
    
    # Query for potential duplicates on the same camera and source clip
    candidates = (
        db.query(Incident)
        .filter(
            Incident.camera_id == camera_id,
            Incident.accident_class == accident_class
        )
        .all()
    )
    
    for existing in candidates:
        # Check source filename match and temporal proximity
        source_match = Path(existing.video_source).name == Path(normalized_source).name
        temporal_match = abs(existing.timestamp_start - start_time_sec) <= time_tolerance_sec
        if source_match and temporal_match:
            # Duplicate match found! Update peak confidence/evidence if this run is higher
            if confidence > existing.confidence:
                existing.confidence = confidence
                if evidence_snapshot_path:
                    existing.evidence_snapshot_path = evidence_snapshot_path
                existing.evidence_box_json = json.dumps(list(evidence_box))
                existing.hit_count = max(existing.hit_count, hit_count)
                db.commit()
                db.refresh(existing)
            return existing, False

    # No duplicate found -> Generate unique incident_code
    existing_count = db.query(func.count(Incident.id)).filter(Incident.camera_id == camera_id).scalar() or 0
    incident_code = f"INC-{camera_id}-{existing_count + 1:03d}"
    
    # Ensure code uniqueness if conflicts exist
    while db.query(Incident).filter(Incident.incident_code == incident_code).first():
        existing_count += 1
        incident_code = f"INC-{camera_id}-{existing_count + 1:03d}"

    dedup_key = f"{camera_id}:{Path(normalized_source).name}:{accident_class}:{int(start_time_sec)}"
    duration_sec = max(0.1, round(end_time_sec - start_time_sec, 2))

    new_incident = Incident(
        incident_code=incident_code,
        camera_id=camera_id,
        video_source=normalized_source,
        timestamp_start=round(start_time_sec, 2),
        timestamp_end=round(end_time_sec, 2),
        duration_sec=duration_sec,
        accident_class=accident_class,
        confidence=round(confidence, 4),
        evidence_snapshot_path=evidence_snapshot_path,
        evidence_box_json=json.dumps(list(evidence_box)) if evidence_box else None,
        hit_count=hit_count,
        status="DETECTED",
        dedup_key=dedup_key
    )

    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    return new_incident, True


# ---------------------------------------------------------------------------
# Dispatch Logs CRUD
# ---------------------------------------------------------------------------
def create_dispatch_log(
    db: Session,
    incident_id: int,
    dispatch_type: str,
    recipient_agency: str,
    notes: Optional[str] = None
) -> Optional[DispatchLog]:
    """
    Records a simulated emergency dispatch action (Requirement 6).
    No real emergency services are contacted.
    """
    inc = get_incident_by_id(db, incident_id)
    if not inc:
        return None

    # Update incident status to DISPATCHED if still in DETECTED or VERIFIED
    if inc.status in ("DETECTED", "VERIFIED"):
        inc.status = "DISPATCHED"

    dispatch_log = DispatchLog(
        incident_id=incident_id,
        dispatch_type=dispatch_type.upper(),
        recipient_agency=recipient_agency,
        status="SIMULATED_SUCCESS",
        notes=notes,
        is_simulated=True
    )

    db.add(dispatch_log)
    db.commit()
    db.refresh(dispatch_log)
    return dispatch_log

def get_dispatch_logs(
    db: Session,
    incident_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> List[DispatchLog]:
    query = db.query(DispatchLog)
    if incident_id:
        query = query.filter(DispatchLog.incident_id == incident_id)
    return query.order_by(DispatchLog.dispatched_at.desc(), DispatchLog.id.desc()).offset(offset).limit(limit).all()
