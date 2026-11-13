from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.config import ROOT_DIR, SNAPSHOTS_DIR
from backend.app.database import get_db
from backend.app.crud import get_incidents, get_incident_by_id, update_incident_status
from backend.app.schemas import IncidentResponse, IncidentDetailResponse, IncidentUpdateStatus, CameraResponse, DispatchLogResponse

router = APIRouter(tags=["Incidents & Evidence"])

VALID_STATUSES = {"DETECTED", "VERIFIED", "DISPATCHED", "RESOLVED", "FALSE_ALARM"}

def _enrich_incident(inc) -> dict:
    data = {
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
    return data

@router.get("/incidents", response_model=List[IncidentResponse])
def list_incidents(
    camera_id: Optional[str] = Query(None, description="Filter by camera code (e.g. CAM-HIGHWAY-02)"),
    status: Optional[str] = Query(None, description="Filter by status (DETECTED, VERIFIED, DISPATCHED, RESOLVED, FALSE_ALARM)"),
    min_confidence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum detection confidence threshold"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve all recorded road incident detections with filtering and pagination."""
    incidents = get_incidents(
        db,
        camera_id=camera_id,
        status=status,
        min_confidence=min_confidence,
        limit=limit,
        offset=offset
    )
    return [_enrich_incident(inc) for inc in incidents]

@router.get("/incidents/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve detailed information for a specific incident, including camera info and dispatch history."""
    inc = get_incident_by_id(db, incident_id)
    if not inc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found."
        )
    
    enriched = _enrich_incident(inc)
    camera_data = CameraResponse.model_validate(inc.camera) if inc.camera else None
    dispatch_logs = [DispatchLogResponse.model_validate(log) for log in inc.dispatch_logs]
    
    enriched["camera"] = camera_data
    enriched["dispatch_logs"] = dispatch_logs
    return enriched

@router.patch("/incidents/{incident_id}/status", response_model=IncidentResponse)
def update_status(
    incident_id: int,
    payload: IncidentUpdateStatus,
    db: Session = Depends(get_db)
):
    """
    Update incident lifecycle status.
    Permitted states: DETECTED, VERIFIED, DISPATCHED, RESOLVED, FALSE_ALARM.
    """
    target_status = payload.status.upper()
    if target_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Permitted values: {sorted(list(VALID_STATUSES))}"
        )
        
    inc = update_incident_status(db, incident_id, target_status, notes=payload.notes)
    if not inc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found."
        )
        
    return _enrich_incident(inc)

@router.get("/evidence/{filename}")
def get_evidence_snapshot(filename: str):
    """
    Safely stream an evidence snapshot image from the snapshots repository.
    Includes security checks against directory traversal.
    """
    # Sanitize filename
    safe_filename = Path(filename).name
    target_path = (SNAPSHOTS_DIR / safe_filename).resolve()
    
    # Path traversal protection
    try:
        target_path.relative_to(SNAPSHOTS_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to the requested path is denied."
        )

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence snapshot '{safe_filename}' not found."
        )

    return FileResponse(
        path=str(target_path),
        media_type="image/jpeg",
        filename=safe_filename
    )
