from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas import VideoProcessRequest, VideoProcessResponse
from backend.app.ai_service import AIService

router = APIRouter(tags=["Video Ingestion & AI Processing"])

@router.post("/process-video", response_model=VideoProcessResponse)
def process_video_stream(
    payload: VideoProcessRequest,
    db: Session = Depends(get_db)
):
    """
    Ingest and process a video file through the accident detection AI pipeline.
    
    1. Runs OpenCV video frame ingestion at configurable sampling FPS.
    2. Runs YOLOv8 inference for collision candidates.
    3. Validates candidates across temporal rolling window.
    4. Automatically prevents duplicate incident records (Requirement 7).
    5. Saves evidence snapshots to disk.
    """
    ai_service = AIService.get_instance()
    try:
        result = ai_service.process_video_and_sync_db(db, payload)
        return result
    except FileNotFoundError as fnf_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video processing failed: {str(exc)}"
        )
