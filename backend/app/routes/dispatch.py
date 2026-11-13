from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.crud import create_dispatch_log, get_dispatch_logs, get_incident_by_id
from backend.app.schemas import DispatchLogCreate, DispatchLogResponse

router = APIRouter(prefix="/dispatch", tags=["Simulated Dispatch"])

ALLOWED_DISPATCH_TYPES = {"POLICE", "AMBULANCE", "FIRE_RESCUE", "TRAFFIC_CONTROL", "MULTI_AGENCY"}

@router.post("", response_model=DispatchLogResponse, status_code=status.HTTP_201_CREATED)
def record_simulated_dispatch(
    payload: DispatchLogCreate,
    db: Session = Depends(get_db)
):
    """
    Record a simulated emergency response dispatch event (Requirement 6).
    
    SAFETY NOTICE:
    This endpoint executes strictly in local simulation mode.
    No live emergency services (911, dispatch CAD systems, SMS, or external networks) are contacted.
    """
    dispatch_type = payload.dispatch_type.upper()
    if dispatch_type not in ALLOWED_DISPATCH_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid dispatch_type '{payload.dispatch_type}'. Permitted: {sorted(list(ALLOWED_DISPATCH_TYPES))}"
        )

    # Verify target incident exists
    incident = get_incident_by_id(db, payload.incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot dispatch: Incident with ID {payload.incident_id} does not exist."
        )

    log_entry = create_dispatch_log(
        db=db,
        incident_id=payload.incident_id,
        dispatch_type=dispatch_type,
        recipient_agency=payload.recipient_agency,
        notes=payload.notes
    )

    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record dispatch event."
        )

    return DispatchLogResponse.model_validate(log_entry)

@router.get("-logs", response_model=List[DispatchLogResponse])
def list_dispatch_logs(
    incident_id: Optional[int] = Query(None, description="Filter logs for a specific incident ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List audit log of simulated emergency dispatch actions."""
    logs = get_dispatch_logs(db, incident_id=incident_id, limit=limit, offset=offset)
    return [DispatchLogResponse.model_validate(l) for l in logs]
