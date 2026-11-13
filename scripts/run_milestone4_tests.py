import sys
import os
import json
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import init_db, SessionLocal, engine, Base
from backend.app.models import Camera, Incident, DispatchLog

def run_milestone4_backend_verification():
    print("=" * 75)
    print("AI-Powered Traffic Safety System - Milestone 4 Backend Verification")
    print("FastAPI Endpoints, SQLite Schema, AI Engine Sync & Deduplication Tests")
    print("=" * 75)

    passed_tests = 0
    total_tests = 0

    def assert_test(condition: bool, test_name: str, detail: str = ""):
        nonlocal passed_tests, total_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  [PASS] Test {total_tests:02d}: {test_name}")
            if detail:
                print(f"         └─ {detail}")
        else:
            print(f"  [FAIL] Test {total_tests:02d}: {test_name}")
            if detail:
                print(f"         └─ ERROR: {detail}")

    # Use TestClient for in-process HTTP requests
    client = TestClient(app)

    # -----------------------------------------------------------------------
    # TEST 1: Database Initialization & Tables Check
    # -----------------------------------------------------------------------
    print("\n[Section 1] Verifying Database Schema & Table Creation:")
    init_db()
    with SessionLocal() as db:
        cam_count = db.query(Camera).count()
        assert_test(cam_count >= 2, "Database Schema & Seed Cameras Created", f"Seeded {cam_count} cameras.")

    # -----------------------------------------------------------------------
    # TEST 2: Health Check Endpoint
    # -----------------------------------------------------------------------
    print("\n[Section 2] Verifying System Health Endpoint (GET /api/health):")
    res = client.get("/api/health")
    assert_test(res.status_code == 200, "Health Check Status Code == 200")
    health_data = res.json()
    assert_test(health_data.get("status") == "healthy", "Health Status == 'healthy'")
    assert_test(health_data.get("database") == "connected", "Database Status == 'connected'")
    assert_test(health_data.get("simulation_mode") is True, "Simulation Mode == True (Safe Mode)")

    # -----------------------------------------------------------------------
    # TEST 3: Camera Endpoints
    # -----------------------------------------------------------------------
    print("\n[Section 3] Verifying Camera Management Endpoints:")
    res = client.get("/api/cameras")
    assert_test(res.status_code == 200, "GET /api/cameras returns 200 OK")
    cameras = res.json()
    cam_ids = [c["id"] for c in cameras]
    assert_test("CAM-HIGHWAY-02" in cam_ids, "CAM-HIGHWAY-02 is listed in cameras")

    res = client.get("/api/cameras/CAM-HIGHWAY-02")
    assert_test(res.status_code == 200, "GET /api/cameras/CAM-HIGHWAY-02 returns 200 OK")
    assert_test(res.json().get("name") == "Highway 101 Mile Marker 14", "Camera name correctly matched")

    # Register a new camera
    new_cam_payload = {
        "id": "CAM-NORTH-03",
        "name": "North Expressway Junction 9",
        "location": "North Expressway & 9th Bypass",
        "latitude": 37.7911,
        "longitude": -122.4088,
        "status": "ACTIVE",
        "feed_url": "data/test_videos/video2.mp4"
    }
    res = client.post("/api/cameras", json=new_cam_payload)
    assert_test(res.status_code == 201, "POST /api/cameras returns 201 Created")
    assert_test(res.json().get("id") == "CAM-NORTH-03", "New camera successfully registered")

    # Camera not found check
    res = client.get("/api/cameras/NONEXISTENT-CAM")
    assert_test(res.status_code == 404, "GET non-existent camera returns 404 Not Found")

    # -----------------------------------------------------------------------
    # TEST 4: Video Processing & Incident Ingestion (First Run)
    # -----------------------------------------------------------------------
    print("\n[Section 4] Processing Video via AI Pipeline (POST /api/process-video):")
    proc_payload = {
        "video_path": "data/test_videos/video2.mp4",
        "camera_id": "CAM-HIGHWAY-02",
        "conf_threshold": 0.35,
        "sample_fps": 5.0,
        "temporal_min_hits": 2,
        "temporal_window_sec": 1.5,
        "save_annotated_video": False
    }
    t_start = os.times().elapsed
    res = client.post("/api/process-video", json=proc_payload)
    assert_test(res.status_code == 200, "POST /api/process-video returns 200 OK")
    
    proc_data = res.json()
    incidents_found = proc_data.get("incidents_found", 0)
    new_created = proc_data.get("new_incidents_created", 0)
    assert_test(incidents_found >= 1, "Pipeline detected at least 1 incident in accident video", f"Found: {incidents_found}")
    assert_test(new_created >= 1, "Newly created incident recorded in SQLite", f"Created: {new_created}")

    first_incident = proc_data["incidents"][0] if proc_data["incidents"] else None
    assert_test(first_incident is not None, "Returned incident object is present")
    inc_id = first_incident["id"] if first_incident else None
    inc_code = first_incident["incident_code"] if first_incident else None
    print(f"         └─ Recorded: {inc_code} (Class: {first_incident['accident_class']}, Conf: {first_incident['confidence']:.2f})")

    # -----------------------------------------------------------------------
    # TEST 5: Deduplication Check (Requirement 7)
    # -----------------------------------------------------------------------
    print("\n[Section 5] Verifying Incident Deduplication (Requirement 7):")
    # Re-running the identical video on the same camera MUST NOT create duplicate rows
    with SessionLocal() as db:
        count_before = db.query(Incident).count()

    res_dup = client.post("/api/process-video", json=proc_payload)
    assert_test(res_dup.status_code == 200, "Second POST /api/process-video returns 200 OK")
    dup_data = res_dup.json()
    assert_test(dup_data.get("new_incidents_created") == 0, "Deduplication: new_incidents_created == 0")
    assert_test(dup_data.get("duplicates_prevented") >= 1, "Deduplication: duplicates_prevented >= 1", f"Prevented: {dup_data.get('duplicates_prevented')}")

    with SessionLocal() as db:
        count_after = db.query(Incident).count()
        assert_test(count_before == count_after, "Deduplication: Total database row count remained unchanged", f"Row count: {count_after}")

    # -----------------------------------------------------------------------
    # TEST 6: Incident Query Endpoints
    # -----------------------------------------------------------------------
    print("\n[Section 6] Querying Incidents (GET /api/incidents & GET /api/incidents/{id}):")
    res = client.get("/api/incidents")
    assert_test(res.status_code == 200, "GET /api/incidents returns 200 OK")
    inc_list = res.json()
    assert_test(len(inc_list) >= 1, "Incident list is not empty")

    res = client.get(f"/api/incidents/{inc_id}")
    assert_test(res.status_code == 200, f"GET /api/incidents/{inc_id} returns 200 OK")
    inc_detail = res.json()
    assert_test(inc_detail.get("camera_id") == "CAM-HIGHWAY-02", "Incident camera_id matches CAM-HIGHWAY-02")
    assert_test(inc_detail.get("camera") is not None, "Camera metadata nested in incident detail response")

    # -----------------------------------------------------------------------
    # TEST 7: Evidence Snapshot Retrieval & Security
    # -----------------------------------------------------------------------
    print("\n[Section 7] Evidence Snapshot Serving & Security Checks:")
    evidence_url = first_incident.get("evidence_snapshot_url")
    assert_test(evidence_url is not None, "Evidence snapshot URL is present in incident", f"URL: {evidence_url}")

    if evidence_url:
        res = client.get(evidence_url)
        assert_test(res.status_code == 200, f"GET {evidence_url} returns 200 OK")
        assert_test("image/jpeg" in res.headers.get("content-type", ""), "Evidence snapshot Content-Type == image/jpeg")
        assert_test(len(res.content) > 1000, "Evidence image payload is non-empty")

    # Security: Directory Traversal rejection
    res = client.get("/api/evidence/../../backend/app/main.py")
    assert_test(res.status_code in (400, 403, 404), "Directory traversal blocked securely (status 400/403/404)")

    # Missing snapshot returns 404
    res = client.get("/api/evidence/missing_non_existent.jpg")
    assert_test(res.status_code == 404, "Missing snapshot returns 404 Not Found")

    # -----------------------------------------------------------------------
    # TEST 8: Simulated Emergency Dispatch (Requirement 6)
    # -----------------------------------------------------------------------
    print("\n[Section 8] Simulated Emergency Dispatch (POST /api/dispatch & Logs):")
    dispatch_payload = {
        "incident_id": inc_id,
        "dispatch_type": "AMBULANCE",
        "recipient_agency": "Metro Emergency Services (Simulated)",
        "notes": "Automated simulated dispatch test for severe collision."
    }
    res = client.post("/api/dispatch", json=dispatch_payload)
    assert_test(res.status_code == 201, "POST /api/dispatch returns 201 Created")
    dispatch_resp = res.json()
    assert_test(dispatch_resp.get("is_simulated") is True, "Dispatch is strictly flagged is_simulated == True")
    assert_test(dispatch_resp.get("status") == "SIMULATED_SUCCESS", "Dispatch status is SIMULATED_SUCCESS")

    # Verify incident status automatically transitioned to DISPATCHED
    res = client.get(f"/api/incidents/{inc_id}")
    assert_test(res.json().get("status") == "DISPATCHED", "Incident status updated to 'DISPATCHED'")

    # Verify dispatch audit logs
    res = client.get(f"/api/dispatch-logs?incident_id={inc_id}")
    assert_test(res.status_code == 200, "GET /api/dispatch-logs returns 200 OK")
    logs = res.json()
    assert_test(len(logs) >= 1, "Dispatch log record found in audit trail")

    # Test dispatch for invalid incident ID returns 404
    bad_dispatch = client.post("/api/dispatch", json={"incident_id": 99999, "dispatch_type": "POLICE", "recipient_agency": "Test"})
    assert_test(bad_dispatch.status_code == 404, "Dispatch to non-existent incident returns 404 Not Found")

    # -----------------------------------------------------------------------
    # TEST 9: Incident Lifecycle Status Update
    # -----------------------------------------------------------------------
    print("\n[Section 9] Incident Status Lifecycle Updates (PATCH /api/incidents/{id}/status):")
    res = client.patch(f"/api/incidents/{inc_id}/status", json={"status": "RESOLVED", "notes": "Scene cleared by units."})
    assert_test(res.status_code == 200, "PATCH status to 'RESOLVED' returns 200 OK")
    assert_test(res.json().get("status") == "RESOLVED", "Incident status correctly transitioned to RESOLVED")

    # Invalid status rejection
    res = client.patch(f"/api/incidents/{inc_id}/status", json={"status": "INVALID_STATE"})
    assert_test(res.status_code == 400, "Invalid status string rejected with 400 Bad Request")

    # -----------------------------------------------------------------------
    # TEST 10: Error Handling on Invalid Video
    # -----------------------------------------------------------------------
    print("\n[Section 10] Video Processing Error Handling:")
    res = client.post("/api/process-video", json={"video_path": "data/test_videos/does_not_exist.mp4", "camera_id": "CAM-01"})
    assert_test(res.status_code == 404, "Processing non-existent video path returns 404 Not Found")

    # -----------------------------------------------------------------------
    # SUMMARY
    # -----------------------------------------------------------------------
    print("\n" + "=" * 75)
    print(f"MILESTONE 4 VERIFICATION RESULTS: {passed_tests} / {total_tests} Tests Passed")
    print("=" * 75)
    
    if passed_tests == total_tests:
        print("[SUCCESS] All Milestone 4 backend and database requirements verified successfully.")
        return 0
    else:
        print(f"[FAILURE] {total_tests - passed_tests} test(s) failed.")
        return 1

if __name__ == "__main__":
    exit_code = run_milestone4_backend_verification()
    sys.exit(exit_code)
