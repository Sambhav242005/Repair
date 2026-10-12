# Backend — Repair Before Replace

FastAPI backend with SQLite persistence, asynchronous job lifecycle, schedule conflict checks, and canonical error envelope strictly matching [00_SRS.md](../00_SRS.md).

## Quick Start

### 1. Setup Environment
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```

### 3. Run Development Server
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- OpenAPI Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Interactive ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### 4. Run Automated Smoke Tests
```bash
pytest tests/backend/test_api_smoke.py -v
```

### 5. Live End-to-End Check
With server running on port 8000:
```bash
python3 scripts/smoke_test.py http://localhost:8000
```

### 6. Reset Database Fixtures
```bash
python3 scripts/reset_db.py
```

## Integration Endpoints

All endpoints are mounted under `/api/v1` (with `/health` also available at root):

| Path | Method | Description |
|---|---|---|
| `/health` | GET | Health check (`{"status": "ok"}`) |
| `/api/v1/assets` | GET, POST | Asset catalog & CRUD |
| `/api/v1/assets/{id}` | PATCH | Asset update (raises alert if faulty/maintenance) |
| `/api/v1/uploads/screenshots` | POST | 5 MB validated screenshot upload |
| `/api/v1/diagnostics` | POST | 100 KB JSON diagnostic import |
| `/api/v1/cases` | GET, POST | Repair cases |
| `/api/v1/cases/{id}/analyse` | POST | 202 Accepted async job analysis |
| `/api/v1/cases/{id}/steps/{step_id}` | PATCH | Sequential step status update |
| `/api/v1/cases/{id}/outcome` | POST | Record repair outcome (`repaired`, `unresolved`, `replaced`) |
| `/api/v1/cases/{id}` | DELETE | 204 No Content; cleans unreferenced uploads |
| `/api/v1/jobs/{id}` | GET | Async job status polling |
| `/api/v1/screenshot-advice` | POST | 202 Screenshot guidance job |
| `/api/v1/browser-sources` | GET | Approved support documentation sources |
| `/api/v1/browser-runs` | POST | 202 Playwright browser execution job |
| `/api/v1/maintenance` | GET, POST | Maintenance tasks & reservations |
| `/api/v1/maintenance/{id}/complete`| POST | Complete maintenance & compute next recurrence |
| `/api/v1/lessons` | GET, POST | Factory training lessons |
| `/api/v1/lessons/{id}/complete` | POST | Complete lesson |
| `/api/v1/production` | GET, POST | Production jobs & half-open conflict rejection |
| `/api/v1/production/{id}/complete`| POST | Complete production run |
| `/api/v1/alerts` | GET | Deduplicated alerts |
| `/api/v1/alerts/{id}/acknowledge` | POST | In-app alert acknowledgement |
| `/api/v1/impact` | GET | Confirmed repairs & retained mass calculation |
