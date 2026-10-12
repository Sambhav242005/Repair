import asyncio
import io
import json
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.db.seed import seed_database

@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    from backend.app.api import uploads

    upload_dir = tmp_path / "screenshots"
    upload_dir.mkdir()
    monkeypatch.setattr(uploads, "UPLOAD_DIR", str(upload_dir))
    seed_database(reset=True)

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}

        res_v1 = await client.get("/api/v1/health")
        assert res_v1.status_code == 200
        assert res_v1.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_assets_crud():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # List assets (seeded assets exist)
        res = await client.get("/api/v1/assets")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 3

        # Create new asset
        new_asset = {
            "name": "Industrial Robotic Arm",
            "category": "factory_machine",
            "manufacturer": "KUKA",
            "model": "KR 6 R900",
            "mass_kg": 54.0,
        }
        res_create = await client.post("/api/v1/assets", json=new_asset)
        assert res_create.status_code == 201
        created = res_create.json()
        assert created["name"] == new_asset["name"]
        asset_id = created["id"]

        # Patch asset
        res_patch = await client.patch(f"/api/v1/assets/{asset_id}", json={"mass_kg": 55.5})
        assert res_patch.status_code == 200
        assert res_patch.json()["mass_kg"] == 55.5

@pytest.mark.asyncio
async def test_diagnostics_list_can_filter_by_equipment():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/diagnostics", params={"asset_id": "asset_laptop_1"})

    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all(item["asset_id"] == "asset_laptop_1" for item in data["items"])

@pytest.mark.asyncio
async def test_screenshot_upload_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Invalid mime type rejected
        txt_file = ("dummy.txt", io.BytesIO(b"hello world"), "text/plain")
        res_invalid = await client.post("/api/v1/uploads/screenshots", files={"file": txt_file})
        assert res_invalid.status_code == 422
        assert res_invalid.json()["error"]["code"] == "VALIDATION_ERROR"

        # Valid PNG accepted
        png_file = ("test.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100), "image/png")
        res_valid = await client.post("/api/v1/uploads/screenshots", files={"file": png_file})
        assert res_valid.status_code == 201
        data = res_valid.json()
        assert "id" in data
        assert data["mime_type"] == "image/png"

@pytest.mark.asyncio
class FakeTestProvider:
    def __init__(self, response_data, delay: float = 0.15):
        self.response_data = response_data
        self.delay = delay

    async def generate(self, prompt, schema, image, timeout):
        if self.delay:
            await asyncio.sleep(self.delay)
        return json.dumps(self.response_data)

@pytest.mark.asyncio
async def test_repair_case_lifecycle():
    from unittest.mock import patch
    from pathlib import Path
    root = Path(__file__).resolve().parents[2]
    slow_laptop_fixture = json.loads((root / "fixtures" / "ai" / "slow_laptop.json").read_text())["result"]

    with patch("backend.app.services.ai.service.configured_provider", return_value=FakeTestProvider(slow_laptop_fixture)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Create case
            case_payload = {
                "asset_id": "asset_laptop_1",
                "symptoms": "Fan making grinding noise, system throttling under load.",
                "screenshot_id": None,
                "diagnostic_id": "diag_laptop_1",
            }
            res_case = await client.post("/api/v1/cases", json=case_payload)
            assert res_case.status_code == 201
            case = res_case.json()
            case_id = case["id"]
            assert case["status"] == "open"

            # 2. Trigger analysis (202 Accepted)
            res_analyse = await client.post(f"/api/v1/cases/{case_id}/analyse")
            assert res_analyse.status_code == 202
            job_id = res_analyse.json()["job_id"]

            # Duplicate analyse returns same job_id
            res_duplicate = await client.post(f"/api/v1/cases/{case_id}/analyse")
            assert res_duplicate.status_code == 202
            assert res_duplicate.json()["job_id"] == job_id

            # Poll job until succeeded
            for _ in range(15):
                await asyncio.sleep(0.1)
                job_res = await client.get(f"/api/v1/jobs/{job_id}")
                assert job_res.status_code == 200
                j_data = job_res.json()
                if j_data["status"] == "succeeded":
                    break

            assert j_data["status"] == "succeeded"

            # 3. Fetch case, verify analysis populated
            res_updated_case = await client.get(f"/api/v1/cases/{case_id}")
            assert res_updated_case.status_code == 200
            case_data = res_updated_case.json()
            assert case_data["status"] == "ready"
            assert case_data["analysis"] is not None
            steps = case_data["analysis"]["steps"]
            assert len(steps) > 0

            # 4. Patch step status
            first_step_id = steps[0]["id"]
            res_step = await client.patch(
                f"/api/v1/cases/{case_id}/steps/{first_step_id}",
                json={"status": "completed"},
            )
            assert res_step.status_code == 200
            step_case = res_step.json()
            assert step_case["analysis"]["steps"][0]["status"] == "completed"

            # 5. Record outcome
            res_outcome = await client.post(
                f"/api/v1/cases/{case_id}/outcome",
                json={"outcome": "repaired", "note": "Replaced fan bearing and cleared thermal dust."},
            )
            assert res_outcome.status_code == 200
            assert res_outcome.json()["outcome"] == "repaired"
            assert res_outcome.json()["status"] == "closed"

            # 6. Verify impact reflects confirmed repair
            res_impact = await client.get("/api/v1/impact")
            assert res_impact.status_code == 200
            impact = res_impact.json()
            assert impact["confirmed_repairs"] >= 1
            assert impact["estimated_retained_mass_kg"] >= 1.65

@pytest.mark.asyncio
async def test_provider_failure_resets_case_to_open():
    from backend.app.services.ai.provider import ProviderError
    from unittest.mock import patch

    with patch("backend.app.services.ai.service.configured_provider", side_effect=ProviderError("Provider unavailable")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res_case = await client.post("/api/v1/cases", json={
                "asset_id": "asset_laptop_1",
                "symptoms": "Laptop screen flickers",
            })
            case_id = res_case.json()["id"]

            res_analyse = await client.post(f"/api/v1/cases/{case_id}/analyse")
            job_id = res_analyse.json()["job_id"]

            for _ in range(15):
                await asyncio.sleep(0.1)
                job_res = await client.get(f"/api/v1/jobs/{job_id}")
                if job_res.json()["status"] == "failed":
                    break

            assert job_res.json()["status"] == "failed"

            # SRS §8 rule: Failed analysis leaves case open for retry
            res_case_check = await client.get(f"/api/v1/cases/{case_id}")
            assert res_case_check.json()["status"] == "open"

@pytest.mark.asyncio
async def test_factory_conflicts_and_recurrence():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Schedule maintenance window
        maint_data = {
            "asset_id": "asset_machine_2",
            "title": "Hydraulic Seal Inspection",
            "description": "Annual seal overhaul",
            "interval_days": 90,
            "due_at": "2026-10-20T10:00:00Z",
            "starts_at": "2026-10-20T08:00:00Z",
            "ends_at": "2026-10-20T12:00:00Z",
            "assignee": "Tech Dave",
        }
        res_m = await client.post("/api/v1/maintenance", json=maint_data)
        assert res_m.status_code == 201
        maint_id = res_m.json()["id"]

        # Attempt conflicting production during same window -> 409 SCHEDULE_CONFLICT
        conflict_prod = {
            "asset_id": "asset_machine_2",
            "title": "Rush Molding Run",
            "starts_at": "2026-10-20T09:00:00Z",
            "ends_at": "2026-10-20T11:00:00Z",
            "quantity": 50,
        }
        res_conflict = await client.post("/api/v1/production", json=conflict_prod)
        assert res_conflict.status_code == 409
        assert res_conflict.json()["error"]["code"] == "SCHEDULE_CONFLICT"

        # Back-to-back non-overlapping production window [12:00, 14:00) -> Allowed
        valid_prod = {
            "asset_id": "asset_machine_2",
            "title": "Post-Maintenance Molding Run",
            "starts_at": "2026-10-20T12:00:00Z",
            "ends_at": "2026-10-20T14:00:00Z",
            "quantity": 50,
        }
        res_valid_prod = await client.post("/api/v1/production", json=valid_prod)
        assert res_valid_prod.status_code == 201

        # Complete recurring maintenance -> creates next scheduled recurrence
        res_comp = await client.post(
            f"/api/v1/maintenance/{maint_id}/complete",
            json={"completed_at": "2026-10-20T11:45:00Z"},
        )
        assert res_comp.status_code == 200
        comp_data = res_comp.json()
        assert comp_data["completed"]["status"] == "completed"
        assert comp_data["next"] is not None
        assert comp_data["next"]["status"] == "scheduled"

        # Repeating completion -> 409 ALREADY_COMPLETED
        res_repeat = await client.post(
            f"/api/v1/maintenance/{maint_id}/complete",
            json={"completed_at": "2026-10-20T11:45:00Z"},
        )
        assert res_repeat.status_code == 409
        assert res_repeat.json()["error"]["code"] == "ALREADY_COMPLETED"

@pytest.mark.asyncio
async def test_browser_run_and_sources():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get browser sources
        res_sources = await client.get("/api/v1/browser-sources")
        assert res_sources.status_code == 200
        sources = res_sources.json()["items"]
        assert len(sources) > 0

        # Reject unknown source with 422
        bad_run = {
            "asset_id": "asset_laptop_1",
            "source_id": "unknown_random_site",
            "question": "How to fix fan?",
        }
        res_bad = await client.post("/api/v1/browser-runs", json=bad_run)
        assert res_bad.status_code == 422
        assert res_bad.json()["error"]["code"] == "VALIDATION_ERROR"

        # Legacy browser route remains compatible, but native desktop supersedes execution.
        good_run = {
            "asset_id": "asset_laptop_1",
            "source_id": "lenovo_t480",
            "question": "How to disassemble thermal fan unit?",
        }
        res_good = await client.post("/api/v1/browser-runs", json=good_run)
        assert res_good.status_code == 202
        job_id = res_good.json()["job_id"]

        for _ in range(10):
            await asyncio.sleep(0.1)
            j_res = await client.get(f"/api/v1/jobs/{job_id}")
            if j_res.json()["status"] == "failed":
                break

        assert j_res.json()["status"] == "failed"
        assert j_res.json()["error"]["code"] == "PROVIDER_UNAVAILABLE"
        assert j_res.json()["result"] is None
