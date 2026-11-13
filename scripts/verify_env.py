import sys
import torch
import torchvision
import cv2
import ultralytics
import fastapi
import uvicorn
import sqlalchemy
import pydantic

print("=== Traffic Safety System - Environment Verification ===")
print(f"Python:       {sys.version.split()[0]} ({sys.executable})")
print(f"PyTorch:      {torch.__version__} (CUDA available: {torch.cuda.is_available()})")
print(f"Torchvision:  {torchvision.__version__}")
print(f"OpenCV:       {cv2.__version__}")
print(f"Ultralytics:  {ultralytics.__version__}")
print(f"FastAPI:      {fastapi.__version__}")
print(f"Uvicorn:      {uvicorn.__version__}")
print(f"SQLAlchemy:   {sqlalchemy.__version__}")
print(f"Pydantic:     {pydantic.__version__}")
print("STATUS: ALL_MODULES_LOADED_SUCCESSFULLY")
