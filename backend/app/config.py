import os
from pathlib import Path
from typing import List

# Base directories anchored to project root
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

DATA_DIR = ROOT_DIR / "data"
MODELS_DIR = DATA_DIR / "models"
SNAPSHOTS_DIR = DATA_DIR / "snapshots"
TEST_VIDEOS_DIR = DATA_DIR / "test_videos"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Database
DB_PATH = DATA_DIR / "traffic_safety.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

# Default AI Model checkpoint
DEFAULT_MODEL_PATH = MODELS_DIR / "accident_yolov8m.pt"

# Server configuration
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
CORS_ORIGINS: List[str] = ["*"]
