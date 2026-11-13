# AI-Powered Intelligent Traffic Safety Dashboard (Frontend)

Operations dashboard for the **AI-Powered Intelligent Traffic Safety & Incident Response System**.
Built with React, Vite, Tailwind CSS, Axios, React Router, and Lucide Icons.

---

## 1. Design Specification & Color Palette

Built to strict editorial traffic operations specifications:
- **Main Background**: `#12161C`
- **Sidebar Background**: `#191E26`
- **Panel Background**: `#2C323B`
- **Primary Text**: `#F8F9FA`
- **Secondary Text**: `#A0ABBA`
- **Borders & Thin Separators**: `#3E4651`
- **Success / Active**: `#00C853`
- **Information / Navigation**: `#1E88E5`
- **Warning / Pending Review**: `#FFC107`
- **Critical / Accident Alert**: `#D32F2F`
- **Temporary Conditions**: `#FF6D00`

**Non-Negotiable Constraints**:
- Absolutely no gradients.
- Solid colors only.
- Asymmetric layout without standard 4-card statistic grids.
- Technical monospace font for sensor telemetry, timestamps, and bounding box coordinates.

---

## 2. Implemented Pages & Capabilities

1. **Overview (`/`)**:
   - Live telemetry metrics strip (Total Cameras, Active Feeds, Total Incidents, Awaiting Review, Verified/Active, Simulated Dispatches).
   - Prominent current priority incident inspection card.
   - Asymmetric split view of recent incident timeline and camera status feeds.
2. **Cameras (`/cameras`)**:
   - Structured camera list with status filtering (`ALL`, `ACTIVE`, `INACTIVE`, `MAINTENANCE`).
   - Split-pane camera telemetry details (physical location, GPS coordinates, incident counts).
   - Camera registration modal connected to backend `POST /api/cameras`.
3. **Incidents (`/incidents`)**:
   - Incident triage list with filtering by camera, status, and minimum detection confidence.
   - Investigation dossier with bounding box coordinates and evidence snapshot preview.
   - Operator lifecycle controls with confirmation modal: `Verify`, `False Alarm`, `Resolve`.
4. **Video Analysis (`/video-analysis`)**:
   - Ingestion form connecting to `POST /api/process-video`.
   - Sample presets for highway collision footage (`video2.mp4`) and downtown intersection accident footage (`video1.mp4`).
   - CPU inference benchmark telemetry (speed factor, average latency, sampled frame count).
   - Direct links to review confirmed incident records.
5. **Evidence Viewer (`/evidence`)**:
   - High-resolution frame canvas streaming directly from `GET /api/evidence/{filename}`.
   - Bounding box coordinates, timestamp, and incident metadata.
6. **Simulated Dispatch (`/dispatch-log`)**:
   - Mock emergency dispatch form for `AMBULANCE`, `POLICE`, `FIRE_RESCUE`, `TRAFFIC_CONTROL`.
   - Operator confirmation modal before recording.
   - Live database audit trail of simulated emergency response events.
7. **Settings (`/settings`)**:
   - Live backend health diagnostics (`/api/health`).
   - SQLite database, PyTorch CPU hardware, and YOLOv8m checkpoint information.
   - Operational calibration recommendations and academic prototype disclaimer.

---

## 3. How to Run

### Development Mode

Ensure the backend server is running on `http://127.0.0.1:8000`:

```bash
# In project root:
conda activate traffic_env
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

In a separate terminal, start the Vite development server:

```bash
cd frontend
npm run dev
```

The frontend dashboard will be available at:
**[http://127.0.0.1:5173/](http://127.0.0.1:5173/)**

### Production Build

```bash
cd frontend
npm run build
npm run preview
```

---

## 4. Academic Prototype Notice

> **ACADEMIC PROTOTYPE — AI detections may be incorrect. Human verification is required. Emergency dispatch is simulated.**
>
> Both current test clips (`video1.mp4` and `video2.mp4`) contain collision scenarios. An accident-free negative-control dataset is not yet established. The dashboard enforces human-in-the-loop validation where all raw detections start in `DETECTED` status and must be verified by an operator before simulated dispatch.
