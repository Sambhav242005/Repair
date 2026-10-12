import json
import logging
import os
from typing import Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import NotFoundException, ValidationException
from backend.app.db.database import SessionLocal, get_db
from backend.app.db.models import AssetModel, ScreenshotModel
from backend.app.jobs.registry import JobRegistry
from backend.app.models.schemas import (
    BrowserRunRequest,
    BrowserSource,
    JobIdResponse,
    ListEnvelope,
    ScreenshotAdviceRequest,
)

logger = logging.getLogger("advice")
router = APIRouter(tags=["Computer Assistance"])

# Approved support pages per SRS §5 FR-07: "No arbitrary URL navigation in MVP"
APPROVED_SOURCES: Dict[str, BrowserSource] = {
    "lenovo_t480": BrowserSource(
        id="lenovo_t480",
        title="Lenovo ThinkPad T480 Hardware Maintenance Guide",
        url="https://pcsupport.lenovo.com/products/laptops-and-netbooks/thinkpad-t-series-laptops/thinkpad-t480-type-20l5-20l6/documentation",
    ),
    "haas_vf2": BrowserSource(
        id="haas_vf2",
        title="Haas VF-2 Spindle & Preventive Maintenance Manual",
        url="https://www.haascnc.com/service/troubleshooting-guides/spindle-maintenance.html",
    ),
    "engel_emac": BrowserSource(
        id="engel_emac",
        title="Engel e-mac Electric Press Service & Alarm Code Guide",
        url="https://www.engelglobal.com/en/service/troubleshooting.html",
    ),
}

@router.get("/browser-sources", response_model=ListEnvelope[BrowserSource])
def get_browser_sources():
    sources_list = list(APPROVED_SOURCES.values())
    return ListEnvelope(items=sources_list, total=len(sources_list))

async def _execute_screenshot_advice(screenshot_id: str, question: str, job_id: str):
    db = SessionLocal()
    try:
        screenshot = db.query(ScreenshotModel).filter(ScreenshotModel.id == screenshot_id).first()
        if not screenshot or not os.path.exists(screenshot.file_path):
            JobRegistry.mark_failed(job_id, "NOT_FOUND", f"Screenshot '{screenshot_id}' not found on disk.")
            return

        with open(screenshot.file_path, "rb") as f:
            image_bytes = f.read()

        from backend.app.services.ai.service import explain_screenshot
        res = await explain_screenshot(image_bytes=image_bytes, question=question)
        advice_dict = res.model_dump(mode="json")

        JobRegistry.mark_succeeded(job_id, advice_dict)
        return advice_dict
    except Exception as e:
        logger.exception(f"Screenshot advice job {job_id} failed: {e}")
        JobRegistry.mark_failed(job_id, getattr(e, "code", "INTERNAL_ERROR"), str(e))
        return None
    finally:
        db.close()

@router.post("/screenshot-advice", response_model=JobIdResponse, status_code=status.HTTP_202_ACCEPTED)
def request_screenshot_advice(
    payload: ScreenshotAdviceRequest,
    db: Session = Depends(get_db),
):
    screenshot = db.query(ScreenshotModel).filter(ScreenshotModel.id == payload.screenshot_id).first()
    if not screenshot:
        raise NotFoundException(f"Screenshot '{payload.screenshot_id}' not found.")

    job = JobRegistry.create_job(kind="screenshot_analysis", db=db)
    JobRegistry.dispatch_async(job.id, _execute_screenshot_advice, payload.screenshot_id, payload.question, job.id)
    return JobIdResponse(job_id=job.id)

async def _execute_browser_run(asset_id: str, source_id: str, question: str, job_id: str):
    source = APPROVED_SOURCES.get(source_id)
    if not source:
        JobRegistry.mark_failed(job_id, "VALIDATION_ERROR", f"Unknown source_id '{source_id}'.")
        return None

    try:
        from backend.app.services.automation.service import run_browser
        res = await run_browser(asset_id=asset_id, source_id=source_id, question=question)
        browser_result = res.model_dump(mode="json")

        JobRegistry.mark_succeeded(job_id, browser_result)
        return browser_result
    except Exception as e:
        logger.exception(f"Browser run job {job_id} failed: {e}")
        JobRegistry.mark_failed(job_id, getattr(e, "code", "INTERNAL_ERROR"), str(e))
        return None

@router.post("/browser-runs", response_model=JobIdResponse, status_code=status.HTTP_202_ACCEPTED)
def request_browser_run(
    payload: BrowserRunRequest,
    db: Session = Depends(get_db),
):
    asset = db.query(AssetModel).filter(AssetModel.id == payload.asset_id).first()
    if not asset:
        raise NotFoundException(f"Asset '{payload.asset_id}' not found.")

    if payload.source_id not in APPROVED_SOURCES:
        raise ValidationException(
            f"Unknown source ID '{payload.source_id}'. Arbitrary navigation is disallowed in MVP.",
            details={"allowed_sources": list(APPROVED_SOURCES.keys())},
        )

    job = JobRegistry.create_job(kind="browser_run", db=db)
    JobRegistry.dispatch_async(job.id, _execute_browser_run, payload.asset_id, payload.source_id, payload.question, job.id)
    return JobIdResponse(job_id=job.id)
