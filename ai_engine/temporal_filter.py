from collections import deque
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from ai_engine.detector import Detection

def compute_iou(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
    """Computes Intersection-over-Union (IoU) between two bounding boxes (x1, y1, x2, y2)."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interWidth = max(0, xB - xA)
    interHeight = max(0, yB - yA)
    interArea = interWidth * interHeight

    boxAArea = max(0, boxA[2] - boxA[0]) * max(0, boxA[3] - boxA[1])
    boxBArea = max(0, boxB[2] - boxB[0]) * max(0, boxB[3] - boxB[1])
    unionArea = float(boxAArea + boxBArea - interArea)

    return interArea / unionArea if unionArea > 0 else 0.0

def boxes_are_spatially_consistent(
    boxA: Tuple[int, int, int, int],
    boxB: Tuple[int, int, int, int],
    min_iou: float = 0.05,
    max_center_distance: float = 180.0
) -> bool:
    """
    Checks spatial consistency between detections in successive frames.
    Accepts if there is IoU overlap OR if bounding box centroids are close
    (to account for moving vehicle trajectory during collision).
    """
    if compute_iou(boxA, boxB) >= min_iou:
        return True
    cA = ((boxA[0] + boxA[2]) / 2.0, (boxA[1] + boxA[3]) / 2.0)
    cB = ((boxB[0] + boxB[2]) / 2.0, (boxB[1] + boxB[3]) / 2.0)
    dist = ((cA[0] - cB[0]) ** 2 + (cA[1] - cB[1]) ** 2) ** 0.5
    return dist <= max_center_distance

@dataclass
class TimestampedCandidate:
    timestamp_sec: float
    frame_index: int
    detection: Detection

@dataclass
class IncidentEvent:
    incident_id: str
    camera_id: str
    start_time_sec: float
    end_time_sec: float
    peak_confidence: float
    accident_class: str
    evidence_frame_idx: int
    evidence_box: Tuple[int, int, int, int]
    hit_count: int

class TemporalIncidentValidator:
    """
    Validates candidate detections across a rolling physical time window.
    
    Why Time-Based (Seconds) Rather Than Fixed Frame Count:
    Video frame rates vary (e.g., 10, 15, 25, 30, 60 FPS) and processing pipelines
    often sample frames at configurable intervals (e.g., 1, 2, or 5 FPS).
    Hardcoding a policy like '5 consecutive frames' means 0.16s on a 30 FPS stream
    but 2.5s on a 2 Hz sampled stream.
    
    By parameterizing in physical seconds:
    - window_seconds: The length of the rolling window (e.g., 1.5s).
    - min_hits: Minimum number of accident-bearing sampled frames within that window.
      (E.g., at sample_fps=5.0, a 1.5s window has ~7 samples; requiring min_hits=3
       demands persistent consecutive detections).
    - spatial_iou_threshold: Requires consecutive detections to have spatial overlap or
      centroid proximity, preventing disparate random noise from combining.
    - cooldown_seconds: Time without detections before a confirmed incident closes.
    """
    def __init__(
        self,
        window_seconds: float = 1.5,
        min_hits: int = 3,
        spatial_iou_threshold: float = 0.05,
        max_centroid_dist: float = 180.0,
        cooldown_seconds: float = 3.0,
        camera_id: str = "CAM-01"
    ):
        self.window_seconds = window_seconds
        self.min_hits = min_hits
        self.spatial_iou_threshold = spatial_iou_threshold
        self.max_centroid_dist = max_centroid_dist
        self.cooldown_seconds = cooldown_seconds
        self.camera_id = camera_id
        
        # Internal state
        self.history: deque[TimestampedCandidate] = deque()
        self.is_incident_active = False
        self.active_incident: Optional[IncidentEvent] = None
        self.last_hit_time: float = -1.0
        self.incident_counter: int = 0
        self.closed_incidents: List[IncidentEvent] = []

    def update(self, timestamp_sec: float, frame_index: int, detections: List[Detection]) -> Optional[IncidentEvent]:
        """
        Ingests detections for a sampled frame at `timestamp_sec`.
        Only collision detections (is_accident=True) are evaluated as candidates.
        Returns newly confirmed IncidentEvent or None.
        """
        # Filter for accident-specific detections
        accident_dets = [d for d in detections if d.is_accident]
        
        # Add new candidates to history
        for d in accident_dets:
            self.history.append(TimestampedCandidate(
                timestamp_sec=timestamp_sec,
                frame_index=frame_index,
                detection=d
            ))
            
        # Prune records older than (timestamp_sec - window_seconds)
        cutoff_time = timestamp_sec - self.window_seconds
        while self.history and self.history[0].timestamp_sec < cutoff_time:
            self.history.popleft()
            
        newly_confirmed_incident = None
        
        if accident_dets:
            self.last_hit_time = timestamp_sec
            
            # Check if threshold is reached within current window
            if not self.is_incident_active:
                if self._verify_spatial_temporal_consistency():
                    self.incident_counter += 1
                    inc_id = f"INC-{self.camera_id}-{self.incident_counter:03d}"
                    
                    # Find peak detection in window for evidence
                    best_cand = max(self.history, key=lambda c: c.detection.confidence)
                    
                    self.active_incident = IncidentEvent(
                        incident_id=inc_id,
                        camera_id=self.camera_id,
                        start_time_sec=self.history[0].timestamp_sec,
                        end_time_sec=timestamp_sec,
                        peak_confidence=best_cand.detection.confidence,
                        accident_class=best_cand.detection.class_name,
                        evidence_frame_idx=best_cand.frame_index,
                        evidence_box=best_cand.detection.box,
                        hit_count=len(self.history)
                    )
                    self.is_incident_active = True
                    newly_confirmed_incident = self.active_incident
            else:
                # Active incident continuation - update end time and peak confidence
                best_new = max(accident_dets, key=lambda d: d.confidence)
                if self.active_incident:
                    self.active_incident.end_time_sec = timestamp_sec
                    self.active_incident.hit_count += 1
                    if best_new.confidence > self.active_incident.peak_confidence:
                        self.active_incident.peak_confidence = best_new.confidence
                        self.active_incident.accident_class = best_new.class_name
                        self.active_incident.evidence_frame_idx = frame_index
                        self.active_incident.evidence_box = best_new.box
        else:
            # No accident detected in this frame
            if self.is_incident_active:
                if (timestamp_sec - self.last_hit_time) >= self.cooldown_seconds:
                    if self.active_incident:
                        self.closed_incidents.append(self.active_incident)
                    self.is_incident_active = False
                    self.active_incident = None

        return newly_confirmed_incident

    def _verify_spatial_temporal_consistency(self) -> bool:
        """
        Verifies that there are at least `min_hits` distinct timestamps in the window,
        and that candidate detections form a spatially coherent sequence.
        """
        if len(self.history) < self.min_hits:
            return False
            
        unique_timestamps = sorted(set(c.timestamp_sec for c in self.history))
        if len(unique_timestamps) < self.min_hits:
            return False
            
        # Check that consecutive time steps are spatially consistent
        boxes_by_time = {}
        for c in self.history:
            boxes_by_time.setdefault(c.timestamp_sec, []).append(c.detection.box)
            
        consistent_steps = 0
        for i in range(len(unique_timestamps) - 1):
            t1, t2 = unique_timestamps[i], unique_timestamps[i+1]
            # Check if any box at t1 is spatially consistent with any box at t2
            step_match = any(
                boxes_are_spatially_consistent(
                    b1, b2,
                    min_iou=self.spatial_iou_threshold,
                    max_center_distance=self.max_centroid_dist
                )
                for b1 in boxes_by_time[t1]
                for b2 in boxes_by_time[t2]
            )
            if step_match:
                consistent_steps += 1
                
        return consistent_steps >= (self.min_hits - 1)

    def finalize(self) -> List[IncidentEvent]:
        """Flushes any currently active incident at video conclusion."""
        if self.is_incident_active and self.active_incident:
            self.closed_incidents.append(self.active_incident)
            self.is_incident_active = False
            self.active_incident = None
        return self.closed_incidents
