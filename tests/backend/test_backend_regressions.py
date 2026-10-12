"""Regression coverage for backend work remaining from the integration review."""
import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy import create_engine, inspect, text

from backend.app.db.database import SessionLocal
from backend.app.db.models import (
    AlertModel,
    AssetModel,
    CaseModel,
    DesktopSessionModel,
    JobModel,
    MaintenanceModel,
    ScreenshotModel,
)
from backend.app.db.migrations import run_sqlite_migrations
from backend.app.db.seed import seed_database
from backend.app.jobs.registry import JobRegistry
from backend.app.main import app
from backend.app.models.schemas import MaintenanceCreate, MaintenanceCompleteRequest
from backend.app.services.automation.models import Acceptance, Control, Observation, SessionResult, Window


@pytest.fixture(autouse=True)
def isolated_seeded_database(tmp_path, monkeypatch):
    from backend.app.api import desktop, uploads

    upload_dir = tmp_path / "screenshots"
    upload_dir.mkdir()
    monkeypatch.setattr(uploads, "UPLOAD_DIR", str(upload_dir))
    desktop._sessions.clear()
    seed_database(reset=True)


@pytest.mark.asyncio
async def test_offset_timestamps_are_required_and_normalized_at_api_boundary():
    with pytest.raises(ValidationError):
        MaintenanceCompleteRequest(completed_at="2035-02-03T14:30:00")

    payload = MaintenanceCreate(
        asset_id="asset_machine_2",
        title="Date normalization check",
        description="Teacher schedule entry",
        due_at="2035-02-03T14:30:00+05:30",
        starts_at="2035-02-03T15:00:00+05:30",
        ends_at="2035-02-03T16:00:00+05:30",
        assignee="Faculty",
    )
    assert payload.due_at == "2035-02-03T09:00:00+00:00"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        naive = await client.post("/api/v1/lessons", json={
            "title": "Naive date test",
            "instructions": "Lab orientation",
            "starts_at": "2035-02-03T14:00:00",
            "ends_at": "2035-02-03T15:00:00Z",
            "assignee": "Faculty",
        })
        assert naive.status_code == 422

        valid = await client.post("/api/v1/lessons", json={
            "title": "Timezone test",
            "instructions": "Lab orientation",
            "starts_at": "2035-02-03T14:00:00+05:30",
            "ends_at": "2035-02-03T15:00:00+05:30",
            "assignee": "Faculty",
        })
        assert valid.status_code == 201
        assert valid.json()["starts_at"] == "2035-02-03T08:30:00+00:00"


@pytest.mark.asyncio
async def test_local_device_detection_is_local_only_and_never_auto_registers(monkeypatch):
    from backend.app.api import assets as assets_api

    monkeypatch.setattr(assets_api, "detect_device_identity", lambda: {"manufacturer": "Test Maker", "model": "Model Z1"})
    headers = {"Origin": "http://localhost:5173"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1", headers=headers) as client:
        detected = await client.get("/api/v1/assets/local-device")
        assert detected.status_code == 200
        assert detected.json()["suggested_name"] == "Test Maker Model Z1"
        assert detected.json()["existing_asset_id"] is None
        assert (await client.get("/api/v1/assets")).json()["total"] == 3

        created = await client.post("/api/v1/assets", json={
            "name": "Test PC", "category": "computer", "manufacturer": " test maker ", "model": "model z1",
        })
        assert created.status_code == 201
        duplicate = await client.get("/api/v1/assets/local-device")
        assert duplicate.json()["existing_asset_id"] == created.json()["id"]
        assert duplicate.json()["existing_asset_name"] == "Test PC"

        blocked = await client.get("/api/v1/assets/local-device", headers={"Origin": "https://example.org"})
        assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_local_report_match_and_clef_review_are_read_only_advice(monkeypatch):
    from backend.app.api import diagnostics as diagnostics_api
    from backend.app.services.automation.models import Selection

    monkeypatch.setattr(diagnostics_api, "detect_device_identity", lambda: {"manufacturer": "Lenovo", "model": "T480"})
    monkeypatch.setattr(diagnostics_api, "collect", lambda asset_id: {
        "asset_id": asset_id, "collected_at": "2035-02-03T09:00:00+00:00",
        "os": {"name": "Windows", "version": "11"},
        "memory": {"total_bytes": 16_000, "available_bytes": 8_000},
        "disks": [{"label": "system", "total_bytes": 100_000, "free_bytes": 50_000}],
        "cpu": {"logical_count": 8}, "collector_version": "test",
    })

    class FakeClef:
        async def select_diagnostic_focus(self, state, choices):
            assert state["reported_issue"] == "The laptop feels slow"
            assert state["computer_model"] == {"manufacturer": "Lenovo", "model": "T480"}
            assert "hostname" not in state
            assert "hostname" not in state["read_only_report"]
            return Selection(action_id="clarify_symptoms", probabilities={key: float(key == "clarify_symptoms") for key in choices}, confidence=0.8)

    monkeypatch.setattr(diagnostics_api, "ClefSelector", FakeClef)
    headers = {"Origin": "http://localhost:5173"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1", headers=headers) as client:
        report = await client.post("/api/v1/diagnostics/collect-local", json={"asset_id": "asset_laptop_1"})
        assert report.status_code == 201
        assert report.json()["asset_id"] == "asset_laptop_1"

        reviewed = await client.post("/api/v1/diagnostics/clef-review", json={
            "asset_id": "asset_laptop_1", "diagnostic_id": report.json()["id"], "issue": "The laptop feels slow",
        })
        assert reviewed.status_code == 200
        assert reviewed.json()["focus"] == "clarify_symptoms"
        assert reviewed.json()["title"] == "Gather a few details"
        assert reviewed.json()["recommendation"].startswith("Ask when the issue started")

        mismatch = await client.post("/api/v1/diagnostics/collect-local", json={"asset_id": "asset_machine_1"})
        assert mismatch.status_code == 422


@pytest.mark.asyncio
async def test_factory_rejects_conflicts_in_both_orders_and_allows_touching_windows():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        production = await client.post("/api/v1/production", json={
            "asset_id": "asset_machine_2", "title": "Class demo batch",
            "starts_at": "2035-03-01T10:00:00Z", "ends_at": "2035-03-01T12:00:00Z", "quantity": 5,
        })
        assert production.status_code == 201

        overlap_maintenance = await client.post("/api/v1/maintenance", json={
            "asset_id": "asset_machine_2", "title": "Conflicting service",
            "description": "Test overlap", "due_at": "2035-03-01T10:00:00Z",
            "starts_at": "2035-03-01T11:00:00Z", "ends_at": "2035-03-01T13:00:00Z",
            "assignee": "Faculty",
        })
        assert overlap_maintenance.status_code == 409
        assert overlap_maintenance.json()["error"]["code"] == "SCHEDULE_CONFLICT"

        touching_maintenance = await client.post("/api/v1/maintenance", json={
            "asset_id": "asset_machine_2", "title": "After class service",
            "description": "Touching endpoint is allowed", "due_at": "2035-03-01T12:00:00Z",
            "starts_at": "2035-03-01T12:00:00Z", "ends_at": "2035-03-01T13:00:00Z",
            "assignee": "Faculty",
        })
        assert touching_maintenance.status_code == 201

        blocking_lesson = await client.post("/api/v1/lessons", json={
            "asset_id": "asset_machine_1", "title": "Workshop practical",
            "instructions": "Supervised equipment lab", "assignee": "Faculty", "blocks_asset": True,
            "starts_at": "2035-03-02T10:00:00Z", "ends_at": "2035-03-02T11:00:00Z",
        })
        assert blocking_lesson.status_code == 201
        overlap_production = await client.post("/api/v1/production", json={
            "asset_id": "asset_machine_1", "title": "Overlapping practical",
            "starts_at": "2035-03-02T10:30:00Z", "ends_at": "2035-03-02T11:30:00Z", "quantity": 1,
        })
        assert overlap_production.status_code == 409
        assert overlap_production.json()["error"]["code"] == "SCHEDULE_CONFLICT"

        await client.patch("/api/v1/assets/asset_machine_2", json={"status": "faulty"})
        unavailable = await client.post("/api/v1/production", json={
            "asset_id": "asset_machine_2", "title": "Unavailable asset",
            "starts_at": "2035-03-03T10:00:00Z", "ends_at": "2035-03-03T11:00:00Z", "quantity": 1,
        })
        assert unavailable.status_code == 409
        assert unavailable.json()["error"]["code"] == "ASSET_UNAVAILABLE"


@pytest.mark.asyncio
async def test_concurrent_recurring_maintenance_completion_creates_only_one_recurrence():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        created = await client.post("/api/v1/maintenance", json={
            "asset_id": "asset_machine_2", "title": "Recurring inspection",
            "description": "Every month", "interval_days": 30,
            "due_at": "2035-04-01T10:00:00Z", "assignee": "Faculty",
        })
        assert created.status_code == 201
        maintenance_id = created.json()["id"]

        responses = await asyncio.gather(*[
            client.post(f"/api/v1/maintenance/{maintenance_id}/complete", json={
                "completed_at": "2035-04-01T10:00:00Z",
            })
            for _ in range(2)
        ])
        assert sorted(response.status_code for response in responses) == [200, 409]

    db = SessionLocal()
    try:
        recurrences = db.query(MaintenanceModel).filter(
            MaintenanceModel.title == "Recurring inspection",
            MaintenanceModel.status == "scheduled",
        ).all()
        assert len(recurrences) == 1
        assert recurrences[0].due_at == "2035-05-01T10:00:00+00:00"
    finally:
        db.close()


def test_existing_sqlite_schema_migration_is_idempotent_and_backfills_history():
    engine = create_engine("sqlite:///:memory:")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE jobs (id VARCHAR PRIMARY KEY, kind VARCHAR NOT NULL, status VARCHAR NOT NULL, result_json TEXT, error_json TEXT, created_at VARCHAR NOT NULL, updated_at VARCHAR NOT NULL)"))
            connection.execute(text("CREATE TABLE cases (id VARCHAR PRIMARY KEY, outcome VARCHAR, created_at VARCHAR NOT NULL)"))
            connection.execute(text("CREATE TABLE assets (id VARCHAR PRIMARY KEY)"))
            connection.execute(text("INSERT INTO cases (id, outcome, created_at) VALUES ('case_old', 'repaired', '2025-01-01T00:00:00+00:00')"))

        run_sqlite_migrations(engine)
        run_sqlite_migrations(engine)

        inspector = inspect(engine)
        assert "entity_id" in {column["name"] for column in inspector.get_columns("jobs")}
        assert "retired_at" in {column["name"] for column in inspector.get_columns("assets")}
        with engine.connect() as connection:
            outcome_at = connection.execute(text("SELECT outcome_at FROM cases WHERE id = 'case_old'")).scalar_one()
        assert outcome_at == "2025-01-01T00:00:00+00:00"
    finally:
        engine.dispose()


@pytest.mark.asyncio
async def test_restart_recovery_fails_jobs_and_makes_cases_retryable():
    from backend.app.api.desktop import recover_desktop_sessions

    db = SessionLocal()
    try:
        case = CaseModel(
            id="case_restart", asset_id="asset_laptop_1", symptoms="No display",
            status="analysing", created_at="2030-01-01T00:00:00+00:00",
        )
        job = JobModel(
            id="job_restart", kind="case_analysis", entity_id=case.id, status="running",
            created_at="2030-01-01T00:00:00+00:00", updated_at="2030-01-01T00:00:00+00:00",
        )
        window = Window(handle=100, process_id=200, application="Calculator")
        acceptance = Acceptance(automation_id="CalculatorResults", name_equals="Display is 7")
        active_session = DesktopSessionModel(
            id="desktop_restart", window_json=window.model_dump_json(), goal="Display 7",
            acceptance_json=acceptance.model_dump_json(), status="running", stage="execution",
            started_at="2030-01-01T00:00:00+00:00", message="Running",
        )
        stale_preview = DesktopSessionModel(
            id="desktop_preview", window_json=window.model_dump_json(), goal="Inspect Settings",
            acceptance_json=acceptance.model_dump_json(), status="needs_approval", stage="inspection",
            started_at="2030-01-01T00:00:00+00:00", message="Review the action",
        )
        db.add_all([case, job, active_session, stale_preview])
        db.commit()
    finally:
        db.close()

    JobRegistry.cleanup_unfinished_jobs()
    recover_desktop_sessions(now=datetime(2035, 1, 1, tzinfo=timezone.utc))

    db = SessionLocal()
    try:
        assert db.query(CaseModel).filter_by(id="case_restart").one().status == "open"
        assert db.query(JobModel).filter_by(id="job_restart").one().status == "failed"
        assert db.query(DesktopSessionModel).filter_by(id="desktop_restart").one().status == "stopped"
        assert db.query(DesktopSessionModel).filter_by(id="desktop_preview").one().status == "stopped"
    finally:
        db.close()


@pytest.mark.asyncio
async def test_alerts_use_injected_clock_deduplicate_and_persist_acknowledgement():
    now = datetime(2035, 5, 2, 8, 0, tzinfo=timezone.utc)
    db = SessionLocal()
    try:
        db.add(MaintenanceModel(
            id="maint_alert_test", asset_id="asset_machine_1", title="Faculty lab check",
            description="Upcoming inspection", interval_days=None,
            due_at=(now + timedelta(hours=3)).isoformat(), assignee="Faculty", status="scheduled",
        ))
        db.commit()
        from backend.app.api.alerts import evaluate_and_persist_alerts
        evaluate_and_persist_alerts(db, now=now)
        evaluate_and_persist_alerts(db, now=now)
        alert = db.query(AlertModel).filter_by(entity_type="maintenance", entity_id="maint_alert_test", kind="due_soon").one()
        alert_id = alert.id
        assert alert.triggered_at == now.isoformat()
    finally:
        db.close()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        acknowledged = await client.post(f"/api/v1/alerts/{alert_id}/acknowledge")
        assert acknowledged.status_code == 200
        assert acknowledged.json()["acknowledged_at"]

    db = SessionLocal()
    try:
        assert db.query(AlertModel).filter_by(id=alert_id).one().acknowledged_at is not None
        assert db.query(AlertModel).filter_by(entity_id="maint_alert_test", kind="due_soon").count() == 1
    finally:
        db.close()


@pytest.mark.asyncio
async def test_replacement_removes_retained_asset_from_impact_until_a_new_repair():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        created_asset = await client.post("/api/v1/assets", json={
            "name": "Faculty demo laptop", "category": "computer", "mass_kg": 2.0,
        })
        asset_id = created_asset.json()["id"]
        first_case = await client.post("/api/v1/cases", json={"asset_id": asset_id, "symptoms": "Battery issue"})
        first_id = first_case.json()["id"]
        await client.post(f"/api/v1/cases/{first_id}/outcome", json={"outcome": "repaired", "note": "Battery replaced"})
        second_case = await client.post("/api/v1/cases", json={"asset_id": asset_id, "symptoms": "Mainboard failure"})
        second_id = second_case.json()["id"]
        await client.post(f"/api/v1/cases/{second_id}/outcome", json={"outcome": "replaced", "note": "Board not economical"})
        assert (await client.get("/api/v1/impact")).json()["confirmed_repairs"] == 0

        await client.patch(f"/api/v1/assets/{asset_id}", json={"status": "operational"})
        assert (await client.get("/api/v1/impact")).json()["confirmed_repairs"] == 0

        third_case = await client.post("/api/v1/cases", json={"asset_id": asset_id, "symptoms": "Repaired after parts replacement"})
        await client.post(f"/api/v1/cases/{third_case.json()['id']}/outcome", json={"outcome": "repaired", "note": "Returned to service"})
        final_impact = (await client.get("/api/v1/impact")).json()
        assert final_impact["confirmed_repairs"] == 1
        assert final_impact["estimated_retained_mass_kg"] == 2.0


@pytest.mark.asyncio
async def test_screenshot_content_validation_and_shared_case_cleanup(tmp_path, monkeypatch):
    from backend.app.api import uploads

    upload_dir = tmp_path / "case-uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(uploads, "UPLOAD_DIR", str(upload_dir))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        spoof = await client.post("/api/v1/uploads/screenshots", files={
            "file": ("fake.png", b"not a png", "image/png"),
        })
        assert spoof.status_code == 422

        image = await client.post("/api/v1/uploads/screenshots", files={
            "file": ("faculty.png", b"\x89PNG\r\n\x1a\n" + b"sample", "image/png"),
        })
        assert image.status_code == 201
        screenshot_id = image.json()["id"]
        db = SessionLocal()
        try:
            screenshot = db.query(ScreenshotModel).filter_by(id=screenshot_id).one()
            image_path = Path(screenshot.file_path)
        finally:
            db.close()
        assert image_path.is_file()

        case_ids = []
        for symptoms in ("Screen flickers", "Color banding"):
            response = await client.post("/api/v1/cases", json={
                "asset_id": "asset_laptop_1", "symptoms": symptoms, "screenshot_id": screenshot_id,
            })
            assert response.status_code == 201
            case_ids.append(response.json()["id"])

        await client.delete(f"/api/v1/cases/{case_ids[0]}")
        assert image_path.is_file()
        await client.delete(f"/api/v1/cases/{case_ids[1]}")
        assert not image_path.exists()

        db = SessionLocal()
        try:
            assert db.query(ScreenshotModel).filter_by(id=screenshot_id).first() is None
        finally:
            db.close()


@pytest.mark.asyncio
async def test_native_desktop_session_is_local_persistent_and_requires_approval(monkeypatch):
    from backend.app.api import desktop

    selected_window = Window(handle=100, process_id=200, application="Calculator")

    class FakeWindowsAdapter:
        def __init__(self, window=None):
            self.window = window

        async def windows(self):
            return [selected_window]

        async def observe(self):
            return Observation(
                snapshot_id="snapshot-test", captured_monotonic=1.0, window=selected_window,
                controls=[
                    Control(id="snapshot-test:button-seven", automation_id="num7Button", name="Seven",
                            kind="Button", enabled=True, operations=["invoke"]),
                    Control(id="snapshot-test:display", automation_id="CalculatorResults", name="Display is 0",
                            kind="Text", enabled=True, operations=[]),
                ],
            )

    class FakeDesktopSession:
        executions = 0

        def __init__(self, adapter, goal, acceptance, debug_sink=None, inspect_only=False, **kwargs):
            self.debug_sink = debug_sink
            self.inspect_only = inspect_only
            self.trace = []

        def stop(self):
            return None

        async def run(self):
            if self.inspect_only:
                self.debug_sink({"event": "inspection", "data": {"selected_action": {
                    "operation": "invoke", "control_id": "window-1:button-seven",
                    "expected_effect": "Display changes",
                }, "input_executed": False}})
                return SessionResult(status="needs_user", message="Inspected only", trace=[])
            type(self).executions += 1
            return SessionResult(status="succeeded", message="Verified test outcome", trace=[])

    monkeypatch.setattr(desktop, "WindowsAdapter", FakeWindowsAdapter)
    monkeypatch.setattr(desktop, "DesktopSession", FakeDesktopSession)
    headers = {"Origin": "http://localhost:5173"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1", headers=headers) as client:
        blocked = await client.get("/api/v1/desktop-sessions/windows", headers={"Origin": "https://example.org"})
        assert blocked.status_code == 403

        windows = await client.get("/api/v1/desktop-sessions/windows")
        assert windows.status_code == 200
        assert windows.json()[0]["application"] == "Calculator"

        started = await client.post("/api/v1/desktop-sessions", json={
            "window": selected_window.model_dump(),
            "goal": "Show the number seven in Calculator",
            "acceptance": {"automation_id": "CalculatorResults", "name_equals": "Display is 7"},
        })
        assert started.status_code == 202
        session_id = started.json()["id"]
        for _ in range(30):
            await asyncio.sleep(0.01)
            if desktop._sessions[session_id].status != "running":
                break
        preview = await client.get(f"/api/v1/desktop-sessions/{session_id}")
        assert preview.status_code == 200
        assert preview.json()["status"] == "needs_approval", preview.json().get("error")
        assert preview.json()["proposed_action"]["operation"] == "invoke"
        assert preview.json()["debug_events"]

        desktop._sessions.clear()
        restored = await client.get("/api/v1/desktop-sessions")
        assert restored.status_code == 200
        assert any(item["id"] == session_id for item in restored.json())

        approved = await client.post(f"/api/v1/desktop-sessions/{session_id}/approve")
        assert approved.status_code == 200
        for _ in range(30):
            await asyncio.sleep(0.01)
            if desktop._sessions[session_id].status != "running":
                break
        completed = await client.get(f"/api/v1/desktop-sessions/{session_id}")
        assert completed.json()["status"] == "completed"
        assert FakeDesktopSession.executions == 1


@pytest.mark.asyncio
async def test_two_cases_get_distinct_job_ids_and_failed_case_can_retry():
    from backend.app.services.ai.provider import ProviderError

    root = Path(__file__).resolve().parents[2]
    result = json.loads((root / "fixtures" / "ai" / "slow_laptop.json").read_text())["result"]

    class Provider:
        def __init__(self, should_fail=False):
            self.should_fail = should_fail

        async def generate(self, prompt, schema, image, timeout):
            await asyncio.sleep(0.15)
            if self.should_fail:
                raise ProviderError("Temporary provider outage")
            return json.dumps(result)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        case_ids = []
        for symptoms in ("Fan rattles", "Screen flickers"):
            created = await client.post("/api/v1/cases", json={"asset_id": "asset_laptop_1", "symptoms": symptoms})
            case_ids.append(created.json()["id"])

        with patch("backend.app.services.ai.service.configured_provider", return_value=Provider()):
            responses = await asyncio.gather(*[
                client.post(f"/api/v1/cases/{case_id}/analyse") for case_id in case_ids
            ])
            assert all(response.status_code == 202 for response in responses)
            job_ids = [response.json()["job_id"] for response in responses]
            assert job_ids[0] != job_ids[1]

            duplicate = await client.post(f"/api/v1/cases/{case_ids[0]}/analyse")
            assert duplicate.json()["job_id"] == job_ids[0]

            for job_id in job_ids:
                for _ in range(30):
                    job = await client.get(f"/api/v1/jobs/{job_id}")
                    if job.json()["status"] in {"succeeded", "failed"}:
                        break
                    await asyncio.sleep(0.03)
                assert job.json()["status"] == "succeeded"

        with patch("backend.app.services.ai.service.configured_provider", return_value=Provider(should_fail=True)):
            failed = await client.post(f"/api/v1/cases/{case_ids[0]}/analyse")
            failed_job_id = failed.json()["job_id"]
            for _ in range(30):
                job = await client.get(f"/api/v1/jobs/{failed_job_id}")
                if job.json()["status"] == "failed":
                    break
                await asyncio.sleep(0.03)
            assert job.json()["status"] == "failed"
            assert (await client.get(f"/api/v1/cases/{case_ids[0]}")).json()["status"] == "open"

        with patch("backend.app.services.ai.service.configured_provider", return_value=Provider()):
            retried = await client.post(f"/api/v1/cases/{case_ids[0]}/analyse")
            assert retried.status_code == 202
            assert retried.json()["job_id"] != failed_job_id

    db = SessionLocal()
    try:
        rows = db.query(JobModel).filter(JobModel.kind == "case_analysis", JobModel.entity_id == case_ids[0]).all()
        assert {row.id for row in rows} >= {job_ids[0], failed_job_id, retried.json()["job_id"]}
    finally:
        db.close()
