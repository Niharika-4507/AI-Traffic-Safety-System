from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.config import CORS_ORIGINS, API_HOST, API_PORT
from backend.app.database import init_db, get_db
from backend.app.models import Camera, Incident
from backend.app.schemas import HealthResponse
from backend.app.ai_service import AIService
from backend.app.routes import cameras, incidents, dispatch, video

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB schema & seed initial cameras
    init_db()
    yield
    # Shutdown logic (if any)

app = FastAPI(
    title="AI-Powered Intelligent Traffic Safety API",
    description="REST API for traffic camera monitoring, automated accident detection, temporal validation, evidence logging, and simulated emergency dispatch.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for future frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(cameras.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(dispatch.router, prefix="/api")
app.include_router(video.router, prefix="/api")

@app.get("/", tags=["Root"])
def root():
    return {
        "system": "AI-Powered Intelligent Traffic Safety & Incident Response System",
        "milestone": "Milestone 4 - Backend & Database",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "endpoints": {
            "cameras": "/api/cameras",
            "incidents": "/api/incidents",
            "video_processing": "/api/process-video",
            "evidence": "/api/evidence/{filename}",
            "dispatch": "/api/dispatch",
            "dispatch_logs": "/api/dispatch-logs"
        },
        "simulation_mode": True
    }

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """System health check verifying database connectivity and AI engine status."""
    cam_count = db.query(func.count(Camera.id)).scalar() or 0
    inc_count = db.query(func.count(Incident.id)).scalar() or 0
    ai_service = AIService.get_instance()

    return HealthResponse(
        status="healthy",
        database="connected",
        detector_loaded=ai_service.is_model_loaded(),
        cameras_count=cam_count,
        incidents_count=inc_count,
        simulation_mode=True,
        timestamp=datetime.utcnow()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=API_HOST, port=API_PORT, reload=True)
