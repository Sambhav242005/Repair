import json
from datetime import datetime, timezone, timedelta
from backend.app.db.database import Base, engine, SessionLocal
from backend.app.db.models import (
    AssetModel,
    CaseModel,
    DiagnosticModel,
    MaintenanceModel,
    LessonModel,
    ProductionModel,
    AlertModel,
    JobModel,
)

def seed_database(reset: bool = True):
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(AssetModel).first():
            return

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # 1. Assets (SRS §3: one laptop and two factory machines)
        assets = [
            AssetModel(
                id="asset_laptop_1",
                name="ThinkPad T480 Laptop",
                category="computer",
                manufacturer="Lenovo",
                model="T480",
                status="operational",
                mass_kg=1.65,
            ),
            AssetModel(
                id="asset_machine_1",
                name="5-Axis CNC Milling Center",
                category="factory_machine",
                manufacturer="Haas",
                model="VF-2SS",
                status="operational",
                mass_kg=3500.0,
            ),
            AssetModel(
                id="asset_machine_2",
                name="Electric Injection Molding Machine",
                category="factory_machine",
                manufacturer="Engel",
                model="e-mac 100",
                status="operational",
                mass_kg=6200.0,
            ),
        ]
        db.add_all(assets)
        db.commit()

        # 2. Sample Diagnostic for Laptop
        sample_diag_payload = {
            "os": {"name": "Ubuntu Linux", "version": "22.04 LTS"},
            "memory": {"total_bytes": 16 * 1024**3, "available_bytes": 1200 * 1024**2},
            "disks": [
                {"label": "/dev/nvme0n1p2", "total_bytes": 512 * 1024**3, "free_bytes": 18 * 1024**3}
            ],
            "cpu": {"logical_count": 8},
        }
        diagnostic = DiagnosticModel(
            id="diag_laptop_1",
            asset_id="asset_laptop_1",
            collected_at=now_iso,
            payload_json=json.dumps(sample_diag_payload),
            collector_version="1.0.0",
        )
        db.add(diagnostic)
        db.commit()

        # 3. Sample Maintenance (Due soon for demo)
        due_soon_time = (now + timedelta(hours=6)).isoformat()
        maintenance = MaintenanceModel(
            id="maint_spindle_1",
            asset_id="asset_machine_1",
            title="Spindle Lubrication & Vibration Check",
            description="Inspect spindle bearing lubricant and run acoustic vibration diagnostics.",
            interval_days=30,
            due_at=due_soon_time,
            starts_at=None,
            ends_at=None,
            assignee="Ravi Kumar (Lead Tech)",
            status="scheduled",
            completed_at=None,
        )
        db.add(maintenance)

        # 4. Sample Training Lesson
        lesson_start = (now + timedelta(hours=24)).isoformat()
        lesson_end = (now + timedelta(hours=26)).isoformat()
        lesson = LessonModel(
            id="lesson_cnc_safety_1",
            asset_id="asset_machine_1",
            title="CNC High-Speed Tooling Safety Training",
            instructions="Review interlock systems, emergency stops, and chip clearing procedures.",
            starts_at=lesson_start,
            ends_at=lesson_end,
            assignee="Ananya Sharma (Apprentice)",
            blocks_asset=False,
            status="scheduled",
        )
        db.add(lesson)

        # 5. Sample Production Run
        prod_start = (now + timedelta(hours=28)).isoformat()
        prod_end = (now + timedelta(hours=34)).isoformat()
        production = ProductionModel(
            id="prod_batch_101",
            asset_id="asset_machine_1",
            title="Precision Flange Batch A-101",
            starts_at=prod_start,
            ends_at=prod_end,
            quantity=150,
            status="scheduled",
        )
        db.add(production)

        db.commit()
        print("Database initialized and seeded successfully with demo fixtures.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database(reset=True)
