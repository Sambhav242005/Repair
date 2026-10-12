#!/usr/bin/env python3
"""
End-to-end smoke test script for live running Repair backend.
Usage: python3 scripts/smoke_test.py [base_url]
Default: http://localhost:8000
"""
import sys
import time
import httpx

def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    print(f"Testing live backend at {base_url}...")

    with httpx.Client(base_url=base_url, timeout=10.0) as client:
        # 1. Health check
        r = client.get("/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        print("✓ GET /health is OK")

        # 2. Assets
        r = client.get("/api/v1/assets")
        assert r.status_code == 200, f"List assets failed: {r.text}"
        assets = r.json().get("items", [])
        assert len(assets) >= 3, "Seeded assets missing"
        print(f"✓ GET /api/v1/assets returned {len(assets)} assets")

        # 3. Create Case
        laptop_id = assets[0]["id"]
        case_payload = {
            "asset_id": laptop_id,
            "symptoms": "Live smoke test: fan noise and excessive throttling",
        }
        r = client.post("/api/v1/cases", json=case_payload)
        assert r.status_code == 201, f"Create case failed: {r.text}"
        case_id = r.json()["id"]
        print(f"✓ POST /api/v1/cases created {case_id}")

        # 4. Analyse Case
        r = client.post(f"/api/v1/cases/{case_id}/analyse")
        assert r.status_code == 202, f"Analyse case failed: {r.text}"
        job_id = r.json()["job_id"]
        print(f"✓ POST /api/v1/cases/{case_id}/analyse returned 202 with {job_id}")

        # 5. Poll Job
        for _ in range(20):
            time.sleep(0.2)
            r = client.get(f"/api/v1/jobs/{job_id}")
            assert r.status_code == 200
            if r.json()["status"] == "succeeded":
                break
        assert r.json()["status"] == "succeeded", "Job did not complete"
        print("✓ Background analysis job completed successfully")

        # 6. Complete step and record outcome
        r = client.get(f"/api/v1/cases/{case_id}")
        steps = r.json()["analysis"]["steps"]
        step_id = steps[0]["id"]
        r = client.patch(f"/api/v1/cases/{case_id}/steps/{step_id}", json={"status": "completed"})
        assert r.status_code == 200

        r = client.post(
            f"/api/v1/cases/{case_id}/outcome",
            json={"outcome": "repaired", "note": "Smoke test confirmed repair"},
        )
        assert r.status_code == 200
        print("✓ Recorded case outcome: repaired")

        # 7. Check Impact
        r = client.get("/api/v1/impact")
        assert r.status_code == 200
        impact = r.json()
        assert impact["confirmed_repairs"] >= 1
        print(f"✓ Impact verified: {impact['confirmed_repairs']} confirmed repairs, {impact['estimated_retained_mass_kg']} kg retained")

        # 8. Check Alerts
        r = client.get("/api/v1/alerts")
        assert r.status_code == 200
        alerts = r.json().get("items", [])
        print(f"✓ GET /api/v1/alerts returned {len(alerts)} alerts")

    print("\nAll live smoke tests PASSED successfully!")

if __name__ == "__main__":
    main()
