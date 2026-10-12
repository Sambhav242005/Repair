from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class AssetModel(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # computer, factory_machine, appliance
    manufacturer = Column(String, nullable=True)
    model = Column(String, nullable=True)
    status = Column(String, nullable=False, default="operational")
    mass_kg = Column(Float, nullable=True)

    cases = relationship("CaseModel", back_populates="asset", cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceModel", back_populates="asset")
    lessons = relationship("LessonModel", back_populates="asset")
    production_runs = relationship("ProductionModel", back_populates="asset")

class CaseModel(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    symptoms = Column(Text, nullable=False)
    screenshot_id = Column(String, nullable=True)
    diagnostic_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="open")  # open, analysing, ready, closed
    analysis_json = Column(Text, nullable=True)
    outcome = Column(String, nullable=True)  # repaired, unresolved, replaced
    outcome_note = Column(Text, nullable=True)
    created_at = Column(String, nullable=False, default=utc_now_iso)

    asset = relationship("AssetModel", back_populates="cases")

class DiagnosticModel(Base):
    __tablename__ = "diagnostics"

    id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    collected_at = Column(String, nullable=False)
    payload_json = Column(Text, nullable=False)
    collector_version = Column(String, nullable=False)

class ScreenshotModel(Base):
    __tablename__ = "screenshots"

    id = Column(String, primary_key=True, index=True)
    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(String, nullable=False, default=utc_now_iso)

class MaintenanceModel(Base):
    __tablename__ = "maintenance"

    id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    interval_days = Column(Integer, nullable=True)
    due_at = Column(String, nullable=False)
    starts_at = Column(String, nullable=True)
    ends_at = Column(String, nullable=True)
    assignee = Column(String, nullable=False)
    status = Column(String, nullable=False, default="scheduled")  # scheduled, completed, cancelled
    completed_at = Column(String, nullable=True)

    asset = relationship("AssetModel", back_populates="maintenance_tasks")

class LessonModel(Base):
    __tablename__ = "lessons"

    id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False)
    instructions = Column(Text, nullable=False)
    starts_at = Column(String, nullable=False)
    ends_at = Column(String, nullable=False)
    assignee = Column(String, nullable=False)
    blocks_asset = Column(Boolean, nullable=False, default=False)
    status = Column(String, nullable=False, default="scheduled")

    asset = relationship("AssetModel", back_populates="lessons")

class ProductionModel(Base):
    __tablename__ = "production"

    id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    starts_at = Column(String, nullable=False)
    ends_at = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="scheduled")

    asset = relationship("AssetModel", back_populates="production_runs")

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    entity_type = Column(String, nullable=False)  # maintenance, lesson, production
    entity_id = Column(String, nullable=False)
    kind = Column(String, nullable=False)  # due_soon, due, overdue, equipment_unavailable
    severity = Column(String, nullable=False)  # info, warning, critical
    message = Column(Text, nullable=False)
    triggered_at = Column(String, nullable=False, default=utc_now_iso)
    acknowledged_at = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "kind", name="uq_alert_entity_kind"),
    )

class JobModel(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    kind = Column(String, nullable=False)  # case_analysis, screenshot_analysis, browser_run
    entity_id = Column(String, nullable=True, index=True)  # associated case_id, screenshot_id, or run target
    status = Column(String, nullable=False, default="queued")  # queued, running, succeeded, failed
    result_json = Column(Text, nullable=True)
    error_json = Column(Text, nullable=True)
    created_at = Column(String, nullable=False, default=utc_now_iso)
    updated_at = Column(String, nullable=False, default=utc_now_iso)
