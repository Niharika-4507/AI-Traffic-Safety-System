from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.crud import get_cameras, get_camera_by_id, create_or_update_camera
from backend.app.schemas import CameraResponse, CameraCreate
from backend.app.models import Incident
from sqlalchemy import func

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=List[CameraResponse])
def list_cameras(
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, INACTIVE, MAINTENANCE)"),
    db: Session = Depends(get_db)
):
    """Retrieve all registered traffic cameras with their incident counts."""
    cameras = get_cameras(db, status=status)
    results = []
    for cam in cameras:
        inc_count = db.query(func.count(Incident.id)).filter(Incident.camera_id == cam.id).scalar() or 0
        resp = CameraResponse.model_validate(cam)
        resp.incidents_count = inc_count
        results.append(resp)
    return results

@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(
    camera_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve a single camera by its unique camera code."""
    cam = get_camera_by_id(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")
    inc_count = db.query(func.count(Incident.id)).filter(Incident.camera_id == cam.id).scalar() or 0
    resp = CameraResponse.model_validate(cam)
    resp.incidents_count = inc_count
    return resp

@router.post("", response_model=CameraResponse, status_code=201)
def register_camera(
    camera_in: CameraCreate,
    db: Session = Depends(get_db)
):
    """Register a new traffic camera or update existing configuration."""
    cam = create_or_update_camera(db, camera_in)
    inc_count = db.query(func.count(Incident.id)).filter(Incident.camera_id == cam.id).scalar() or 0
    resp = CameraResponse.model_validate(cam)
    resp.incidents_count = inc_count
    return resp
