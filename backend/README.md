# AI-Powered Intelligent Traffic Safety System - Backend & Database

FastAPI backend service and SQLite persistence layer for automated traffic safety incident monitoring, evidence retrieval, and simulated emergency response.

---

## 1. Architecture Overview

- **Framework**: FastAPI with asynchronous endpoints and Pydantic v2 schemas.
- **Database**: SQLite with SQLAlchemy 2.0 ORM (`data/traffic_safety.db`).
- **AI Integration**: Direct interface to `ai_engine.pipeline.VideoIncidentPipeline` and `ai_engine.detector.AccidentDetector`.
- **Evidence Repository**: Direct filesystem snapshot streaming from `data/snapshots/`.
- **Emergency Dispatch**: Strictly simulated dispatch actions (`is_simulated = True`); no external emergency networks or real-world dispatchers are contacted.

---

## 2. Database Schema

The database consists of three relational tables:

### `cameras`
- `id` (VARCHAR PK): e.g., `CAM-DOWNTOWN-01`, `CAM-HIGHWAY-02`
- `name` (VARCHAR): Human-readable identifier
- `location` (VARCHAR): Road/intersection name
- `latitude` / `longitude` (FLOAT): Geographic coordinates
- `status` (VARCHAR): `ACTIVE`, `INACTIVE`, `MAINTENANCE`
- `feed_url` (VARCHAR): Default stream or video file path
- `created_at` / `updated_at` (DATETIME)

### `incidents`
- `id` (INTEGER PK AUTOINCREMENT)
- `incident_code` (VARCHAR UNIQUE): e.g., `INC-CAM-HIGHWAY-02-001`
- `camera_id` (VARCHAR FK -> `cameras.id`)
- `video_source` (VARCHAR): Relative or absolute video clip path
- `timestamp_start` / `timestamp_end` (FLOAT): Video seconds offset
- `duration_sec` (FLOAT): Temporal duration of confirmed incident
- `accident_class` (VARCHAR): e.g., `car_car_accident`
- `confidence` (FLOAT): Peak detection confidence
- `evidence_snapshot_path` (VARCHAR): Local path to evidence frame image
- `evidence_box_json` (VARCHAR): Bounding box `[x1, y1, x2, y2]`
- `hit_count` (INTEGER): Number of temporally validated hits
- `status` (VARCHAR): `DETECTED`, `VERIFIED`, `DISPATCHED`, `RESOLVED`, `FALSE_ALARM`
- `dedup_key` (VARCHAR INDEX): Signature used for deduplication
- `detected_at` / `updated_at` (DATETIME)

### `dispatch_logs`
- `id` (INTEGER PK AUTOINCREMENT)
- `incident_id` (INTEGER FK -> `incidents.id`)
- `dispatch_type` (VARCHAR): `POLICE`, `AMBULANCE`, `FIRE_RESCUE`, `TRAFFIC_CONTROL`
- `recipient_agency` (VARCHAR): Target agency (e.g., `Metro EMS Unit 4`)
- `status` (VARCHAR): `SIMULATED_SUCCESS`
- `notes` (TEXT): Incident response notes
- `is_simulated` (BOOLEAN): Always `True`
- `dispatched_at` (DATETIME)

---

## 3. Deduplication Strategy (Requirement 7)

Repeated processing of the same video or camera feed does **not** generate duplicate database rows.
When `/api/process-video` executes:
1. Candidate detections are checked against existing incidents for the same `camera_id`, `accident_class`, and source filename.
2. If an incident exists within a temporal window of `±3.0 seconds`, the existing record is matched rather than duplicated.
3. If the newly processed run detects a higher peak confidence, the existing record is updated in place with the better score and evidence snapshot.

---

## 4. Endpoints Quick Reference

| Method | URL | Description |
|---|---|---|
| `GET` | `/` | API Welcome and route index |
| `GET` | `/api/health` | Healthcheck (DB status, camera count, incident count) |
| `GET` | `/api/cameras` | List all cameras (optional `?status=ACTIVE`) |
| `GET` | `/api/cameras/{id}` | Get single camera details |
| `POST` | `/api/cameras` | Register or update camera |
| `GET` | `/api/incidents` | List incidents (filter by `camera_id`, `status`, `min_confidence`) |
| `GET` | `/api/incidents/{id}` | Get incident details with nested camera and dispatch logs |
| `PATCH` | `/api/incidents/{id}/status` | Update incident status (`VERIFIED`, `FALSE_ALARM`, `RESOLVED`, etc.) |
| `POST` | `/api/process-video` | Run AI pipeline on video and record new incidents |
| `GET` | `/api/evidence/{filename}` | Retrieve evidence snapshot JPEG |
| `POST` | `/api/dispatch` | Record simulated dispatch action |
| `GET` | `/api/dispatch-logs` | List dispatch audit history |

---

## 5. How to Run the Backend

Make sure the Conda environment `traffic_env` is activated:

```bash
conda activate traffic_env
```

Start the FastAPI development server with Uvicorn:

```bash
# From the project root (e:\Ai-based traffic management):
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Once started:
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Alternative ReDoc UI: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 6. How to Run Backend Verification Tests

Execute the automated backend test suite:

```bash
python scripts/run_milestone4_tests.py
```

This verifies:
1. Database schema generation and table seeding.
2. System health endpoint.
3. Camera CRUD and query filtering.
4. AI pipeline execution on accident clip (`data/test_videos/video2.mp4`).
5. Deduplication enforcement upon repeated processing of the same clip.
6. Incident retrieval and detail formatting.
7. Evidence snapshot streaming and directory traversal defense.
8. Simulated emergency dispatch logging and incident status updates.
9. Incident lifecycle transitions (`RESOLVED`, `FALSE_ALARM`).
10. Error handling for non-existent video files and cameras.

---

## 7. Model Reliability & Verification Telemetry

> [!WARNING]
> **Detector Academic Prototype Notice**:
> During verification testing, both available test clips were evaluated:
> - **Video 1 (Downtown Intersection Footage)** (`data/test_videos/video1.mp4`): Contains an urban intersection accident scenario; confirmed incident recorded at `T = 7.40s` to `10.60s` (`car_bike_accident` / `car_car_accident`, peak confidence: ~0.89).
> - **Video 2 (Highway Collision Footage)** (`data/test_videos/video2.mp4`): Confirmed highway collision at `T = 15.21s` to `15.62s` (`car_car_accident`, peak confidence: 0.84).
>
> **Implications for System Operation**:
> 1. An accident-free negative-control dataset is not yet established. Detection validity must be reviewed against actual footage.
> 2. The detector is **NOT claimed to be 100% reliable** or production-ready for automated real-world dispatch without human oversight.
> 3. The backend is explicitly designed with human-in-the-loop workflows: detections enter as `DETECTED` and can be marked as `FALSE_ALARM` or `VERIFIED` by an operator before simulated dispatch.
> 4. Detection sensitivity can be adjusted by tuning `conf_threshold` (e.g., 0.40–0.50) and `temporal_min_hits` (e.g., 3+ consecutive samples).
