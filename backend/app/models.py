from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(32), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE, MAINTENANCE
    feed_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    incidents = relationship("Incident", back_populates="camera", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Camera(id='{self.id}', name='{self.name}', status='{self.status}')>"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    incident_code = Column(String(64), unique=True, index=True, nullable=False)
    camera_id = Column(String(64), ForeignKey("cameras.id"), index=True, nullable=False)
    video_source = Column(String(255), nullable=False)
    timestamp_start = Column(Float, nullable=False)  # Seconds into video
    timestamp_end = Column(Float, nullable=False)    # Seconds into video
    duration_sec = Column(Float, nullable=False)
    accident_class = Column(String(64), nullable=False)
    confidence = Column(Float, nullable=False)
    evidence_snapshot_path = Column(String(255), nullable=True)
    evidence_box_json = Column(String(128), nullable=True)  # JSON [x1, y1, x2, y2]
    hit_count = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default="DETECTED", index=True, nullable=False)
    # Status options: DETECTED, VERIFIED, DISPATCHED, RESOLVED, FALSE_ALARM
    dedup_key = Column(String(128), index=True, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    camera = relationship("Camera", back_populates="incidents")
    dispatch_logs = relationship("DispatchLog", back_populates="incident", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Incident(code='{self.incident_code}', cam='{self.camera_id}', class='{self.accident_class}', conf={self.confidence:.2f}, status='{self.status}')>"


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True, nullable=False)
    dispatch_type = Column(String(64), nullable=False)  # POLICE, AMBULANCE, FIRE_RESCUE, TRAFFIC_CONTROL
    recipient_agency = Column(String(128), nullable=False)
    status = Column(String(32), default="SIMULATED_SUCCESS", nullable=False)
    notes = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=True, nullable=False)  # Always True in academic simulation
    dispatched_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="dispatch_logs")

    def __repr__(self):
        return f"<DispatchLog(id={self.id}, inc={self.incident_id}, type='{self.dispatch_type}', status='{self.status}')>"
