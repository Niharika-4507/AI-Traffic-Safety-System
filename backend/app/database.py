from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config import DATABASE_URL

# Connect args needed for SQLite concurrency
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency to provide a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """Create all tables and seed default traffic cameras if not already present."""
    # Import models here so Base knows all tables
    from backend.app.models import Camera, Incident, DispatchLog  # noqa: F401
    Base.metadata.create_all(bind=engine)
    
    # Seed initial test cameras
    db = SessionLocal()
    try:
        default_cameras = [
            {
                "id": "CAM-DOWNTOWN-01",
                "name": "Downtown 5th & Main Intersection",
                "location": "Downtown Sector 4, 5th Ave & Main St",
                "latitude": 37.7749,
                "longitude": -122.4194,
                "status": "ACTIVE",
                "feed_url": "data/test_videos/video1.mp4"
            },
            {
                "id": "CAM-HIGHWAY-02",
                "name": "Highway 101 Mile Marker 14",
                "location": "Highway 101 Northbound, Exit 14 Interchange",
                "latitude": 37.7833,
                "longitude": -122.4167,
                "status": "ACTIVE",
                "feed_url": "data/test_videos/video2.mp4"
            }
        ]
        for cam_data in default_cameras:
            existing = db.query(Camera).filter(Camera.id == cam_data["id"]).first()
            if not existing:
                cam = Camera(**cam_data)
                db.add(cam)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
