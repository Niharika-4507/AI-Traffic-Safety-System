from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Dict, Any
import numpy as np
from ultralytics import YOLO

COLLISION_KEYWORDS = ("accident", "crash", "collision")

@dataclass
class Detection:
    box: Tuple[int, int, int, int]  # x1, y1, x2, y2 (pixel coordinates)
    class_id: int
    class_name: str
    confidence: float
    is_accident: bool

class AccidentDetector:
    """
    Wraps the YOLOv8 accident detection model.
    Enforces strict taxonomy separation between normal traffic entities and
    collision/accident categories.
    """
    def __init__(self, model_path: str = "data/models/accident_yolov8m.pt"):
        self.model_path = Path(model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model checkpoint not found: {self.model_path.resolve()}")
            
        self.model = YOLO(str(self.model_path))
        self.names: Dict[int, str] = self.model.names
        
        # Categorize classes
        self.collision_class_ids = set()
        self.normal_class_ids = set()
        
        for cid, cname in self.names.items():
            if any(kw in cname.lower() for kw in COLLISION_KEYWORDS):
                self.collision_class_ids.add(cid)
            else:
                self.normal_class_ids.add(cid)
                
    def detect(self, frame: np.ndarray, conf_threshold: float = 0.35, imgsz: int = 640) -> List[Detection]:
        """
        Run inference on a single BGR frame.
        Returns a list of Detection objects.
        Only classes in self.collision_class_ids have is_accident=True.
        """
        results = self.model(frame, imgsz=imgsz, conf=conf_threshold, verbose=False)
        detections: List[Detection] = []
        
        if not results or len(results) == 0:
            return detections
            
        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return detections
            
        for box in boxes:
            cls_id = int(box.cls.item())
            cls_name = self.names.get(cls_id, f"class_{cls_id}")
            conf = float(box.conf.item())
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
            
            is_accident = cls_id in self.collision_class_ids
            
            detections.append(Detection(
                box=(x1, y1, x2, y2),
                class_id=cls_id,
                class_name=cls_name,
                confidence=conf,
                is_accident=is_accident
            ))
            
        return detections
