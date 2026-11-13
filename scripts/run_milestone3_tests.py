import sys
import time
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import cv2
import numpy as np

from ai_engine.detector import AccidentDetector
from ai_engine.temporal_filter import TemporalIncidentValidator
from ai_engine.pipeline import VideoIncidentPipeline

def run_milestone3_benchmarks_and_tests():
    print("=" * 70)
    print("AI-Powered Traffic Safety System - Milestone 3 Verification")
    print("Video Ingestion, Temporal Validation & CPU Benchmarking")
    print("=" * 70)

    # 1. Initialize Detector
    model_path = "data/models/accident_yolov8m.pt"
    print(f"\n[1] Initializing AccidentDetector with: {model_path}")
    detector = AccidentDetector(model_path)
    pipeline = VideoIncidentPipeline(detector, snapshot_dir="data/snapshots")
    print(f"    Collision classes ({len(detector.collision_class_ids)}): {[detector.names[c] for c in detector.collision_class_ids]}")
    print(f"    Normal classes    ({len(detector.normal_class_ids)}): {[detector.names[c] for c in detector.normal_class_ids]}")

    # 2. CPU Inference Benchmarks across multiple image sizes
    print("\n[2] Benchmarking CPU Inference Latency Across Image Sizes (640, 480, 320):")
    # Grab a representative frame from video1.mp4
    cap = cv2.VideoCapture("data/test_videos/video1.mp4")
    ret, bench_frame = cap.read()
    cap.release()
    if not ret:
        print("[-] Could not read test frame for benchmark.")
        sys.exit(1)

    benchmark_sizes = [640, 480, 320]
    bench_results = {}

    for size in benchmark_sizes:
        # Warmup
        _ = detector.detect(bench_frame, conf_threshold=0.35, imgsz=size)
        latencies = []
        for _ in range(5):
            t0 = time.perf_counter()
            _ = detector.detect(bench_frame, conf_threshold=0.35, imgsz=size)
            latencies.append((time.perf_counter() - t0) * 1000.0)
            
        avg_lat = float(np.mean(latencies))
        fps_cpu = 1000.0 / avg_lat if avg_lat > 0 else 0
        bench_results[size] = (avg_lat, fps_cpu)
        print(f"    - imgsz={size}x{size}: Mean Latency = {avg_lat:6.2f} ms | Max Single-Thread Throughput = {fps_cpu:4.1f} FPS")

    # 3. Test on Video 1: Downtown Intersection Accident Footage
    print("\n[3] Testing Clip 1: Downtown Intersection Accident Footage (data/test_videos/video1.mp4):")
    print("    Source: Open traffic test clip from Gaurav Hegade accident detection project.")
    print("    Characteristics: Urban intersection scenario containing road collision event.")
    print("    Target Objective: Ingest video and evaluate temporal incident confirmation.")

    res_norm = pipeline.process_video(
        video_path="data/test_videos/video1.mp4",
        camera_id="CAM-DOWNTOWN-01",
        sample_fps=5.0,           # 5 samples per second (every 0.2s of video)
        conf_threshold=0.35,      # Collision confidence threshold
        imgsz=480,                # High speed on CPU (~86ms)
        temporal_window_sec=1.5,  # 1.5 second temporal persistence window
        temporal_min_hits=2,      # At least 2 spatially consistent hits in window
        spatial_iou_threshold=0.05,
        max_centroid_dist=180.0,
        save_annotated_video=True,
        output_video_path="data/test_videos/annotated_video1_intersection.mp4"
    )

    print(f"    Video Duration:      {res_norm.video_duration_sec:.2f}s ({res_norm.total_frames} frames @ {res_norm.video_fps:.1f} FPS)")
    print(f"    Sampled Frames:      {res_norm.benchmark.sampled_frames} frames (effective {res_norm.benchmark.sample_fps:.1f} Hz)")
    print(f"    Avg Inference Time:  {res_norm.benchmark.avg_inference_latency_ms:.2f} ms per sample")
    print(f"    Real-Time Factor:    {res_norm.benchmark.effective_video_speed_factor:.2f}x video time")
    print(f"    Confirmed Incidents: {len(res_norm.confirmed_incidents)}")
    if len(res_norm.confirmed_incidents) > 0:
        for inc in res_norm.confirmed_incidents:
            print(f"    [CONFIRMED INCIDENT] {inc.incident_id}:")
            print(f"      - Class:           {inc.accident_class}")
            print(f"      - Peak Confidence: {inc.peak_confidence:.2f}")
            print(f"      - Timestamp:       {inc.start_time_sec:.2f}s to {inc.end_time_sec:.2f}s (Duration: {inc.end_time_sec - inc.start_time_sec:.2f}s)")
            print(f"      - Validated Hits:  {inc.hit_count} sampled frames")
            print(f"      - Evidence Box:    {inc.evidence_box}")
        print(f"    [+] Saved Evidence Snapshots ({len(res_norm.snapshot_paths)}):")
        for sp in res_norm.snapshot_paths:
            print(f"      - {sp}")
    else:
        print("    [-] Notice: No incident was confirmed at current threshold.")

    # 4. Test on Video 2: Highway Collision Footage
    print("\n[4] Testing Clip 2: Highway Collision Footage (data/test_videos/video2.mp4):")
    print("    Source: Open traffic collision clip from Gaurav Hegade accident detection project.")
    print("    Characteristics: Multi-vehicle intersection crash with collision impact.")
    print("    Target Objective: Verify that collision IS detected and confirmed with evidence snapshot.")

    res_acc = pipeline.process_video(
        video_path="data/test_videos/video2.mp4",
        camera_id="CAM-HIGHWAY-02",
        sample_fps=5.0,           # 5 samples per second
        conf_threshold=0.35,
        imgsz=480,
        temporal_window_sec=1.5,
        temporal_min_hits=2,
        spatial_iou_threshold=0.05,
        max_centroid_dist=180.0,
        save_annotated_video=True,
        output_video_path="data/test_videos/annotated_video2_accident.mp4"
    )

    print(f"    Video Duration:      {res_acc.video_duration_sec:.2f}s ({res_acc.total_frames} frames @ {res_acc.video_fps:.1f} FPS)")
    print(f"    Sampled Frames:      {res_acc.benchmark.sampled_frames} frames (effective {res_acc.benchmark.sample_fps:.1f} Hz)")
    print(f"    Avg Inference Time:  {res_acc.benchmark.avg_inference_latency_ms:.2f} ms per sample")
    print(f"    Real-Time Factor:    {res_acc.benchmark.effective_video_speed_factor:.2f}x video time")
    print(f"    Confirmed Incidents: {len(res_acc.confirmed_incidents)}")
    
    if len(res_acc.confirmed_incidents) > 0:
        for inc in res_acc.confirmed_incidents:
            print(f"    [CONFIRMED INCIDENT] {inc.incident_id}:")
            print(f"      - Class:           {inc.accident_class}")
            print(f"      - Peak Confidence: {inc.peak_confidence:.2f}")
            print(f"      - Timestamp:       {inc.start_time_sec:.2f}s to {inc.end_time_sec:.2f}s (Duration: {inc.end_time_sec - inc.start_time_sec:.2f}s)")
            print(f"      - Validated Hits:  {inc.hit_count} sampled frames")
            print(f"      - Evidence Box:    {inc.evidence_box}")
        print(f"    [+] Saved Evidence Snapshots ({len(res_acc.snapshot_paths)}):")
        for sp in res_acc.snapshot_paths:
            print(f"      - {sp}")
    else:
        print("    [-] Notice: No incident was confirmed at current threshold.")

    # 5. Output Summary Table
    print("\n" + "=" * 70)
    print("MILESTONE 3 VERIFICATION SUMMARY")
    print("=" * 70)
    print(f"{'Metric':<30} | {'Video 1 (Intersection)':<22} | {'Video 2 (Highway)':<18}")
    print("-" * 76)
    print(f"{'Duration':<30} | {res_norm.video_duration_sec:6.2f} s                | {res_acc.video_duration_sec:6.2f} s")
    print(f"{'Sampled Frames':<30} | {res_norm.benchmark.sampled_frames:<22} | {res_acc.benchmark.sampled_frames:<18}")
    print(f"{'Avg Inference (CPU)':<30} | {res_norm.benchmark.avg_inference_latency_ms:6.2f} ms               | {res_acc.benchmark.avg_inference_latency_ms:6.2f} ms")
    print(f"{'Processing Speed':<30} | {res_norm.benchmark.effective_video_speed_factor:6.2f}x Real-time        | {res_acc.benchmark.effective_video_speed_factor:6.2f}x Real-time")
    print(f"{'Confirmed Incidents':<30} | {len(res_norm.confirmed_incidents):<22} | {len(res_acc.confirmed_incidents):<18}")
    print("=" * 70)

if __name__ == "__main__":
    run_milestone3_benchmarks_and_tests()
