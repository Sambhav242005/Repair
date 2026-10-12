import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional
from sqlalchemy.orm import Session
from backend.app.db.database import SessionLocal
from backend.app.db.models import JobModel

logger = logging.getLogger("jobs")

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class JobRegistry:
    main_loop: Optional[asyncio.AbstractEventLoop] = None

    @classmethod
    def set_loop(cls, loop: asyncio.AbstractEventLoop):
        cls.main_loop = loop

    @staticmethod
    def cleanup_unfinished_jobs():
        """On startup mark unfinished jobs failed with retry guidance."""
        db = SessionLocal()
        try:
            unfinished = (
                db.query(JobModel)
                .filter(JobModel.status.in_(["queued", "running"]))
                .all()
            )
            for j in unfinished:
                j.status = "failed"
                j.error_json = json.dumps({
                    "code": "SERVER_RESTARTED",
                    "message": "Server restarted before job completed. Please retry the request.",
                })
                j.updated_at = utc_now_iso()
                if j.kind == "case_analysis" and j.entity_id:
                    from backend.app.db.models import CaseModel
                    case = db.query(CaseModel).filter(CaseModel.id == j.entity_id).first()
                    if case and case.status == "analysing":
                        case.status = "open"
            if unfinished:
                db.commit()
                logger.info(f"Marked {len(unfinished)} unfinished jobs as failed.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to cleanup unfinished jobs: {e}")
        finally:
            db.close()

    @staticmethod
    def create_job(kind: str, db: Session, entity_id: Optional[str] = None, *, commit: bool = True) -> JobModel:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        now = utc_now_iso()
        job = JobModel(
            id=job_id,
            kind=kind,
            entity_id=entity_id,
            status="queued",
            result_json=None,
            error_json=None,
            created_at=now,
            updated_at=now,
        )
        db.add(job)
        if commit:
            db.commit()
            db.refresh(job)
        else:
            db.flush()
        return job

    @staticmethod
    def get_job(job_id: str, db: Session) -> Optional[JobModel]:
        return db.query(JobModel).filter(JobModel.id == job_id).first()

    @staticmethod
    def mark_running(job_id: str):
        db = SessionLocal()
        try:
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if job:
                job.status = "running"
                job.updated_at = utc_now_iso()
                db.commit()
        finally:
            db.close()

    @staticmethod
    def mark_succeeded(job_id: str, result: Dict[str, Any]):
        db = SessionLocal()
        try:
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if job:
                job.status = "succeeded"
                job.result_json = json.dumps(result)
                job.updated_at = utc_now_iso()
                db.commit()
        finally:
            db.close()

    @staticmethod
    def mark_failed(job_id: str, code: str, message: str):
        db = SessionLocal()
        try:
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if job:
                job.status = "failed"
                job.error_json = json.dumps({"code": code, "message": message})
                job.updated_at = utc_now_iso()
                db.commit()
        finally:
            db.close()

    @classmethod
    def dispatch_async(cls, job_id: str, target_func: Callable, *args, **kwargs):
        """Runs the target sync or async function in the background, updating job lifecycle."""
        async def _wrapper():
            import inspect
            cls.mark_running(job_id)
            try:
                if inspect.iscoroutinefunction(target_func):
                    result = await target_func(*args, **kwargs)
                else:
                    loop = asyncio.get_running_loop()
                    result = await loop.run_in_executor(None, lambda: target_func(*args, **kwargs))
                if result is not None:
                    cls.mark_succeeded(job_id, result)
            except Exception as e:
                logger.exception(f"Job {job_id} failed: {e}")
                err_code = getattr(e, "code", "INTERNAL_ERROR")
                err_msg = getattr(e, "message", str(e))
                cls.mark_failed(job_id, err_code, err_msg)

        # Check if current thread has running loop
        try:
            running_loop = asyncio.get_running_loop()
            running_loop.create_task(_wrapper())
        except RuntimeError:
            if cls.main_loop and cls.main_loop.is_running():
                asyncio.run_coroutine_threadsafe(_wrapper(), cls.main_loop)
            else:
                # Fallback: run directly in background thread
                import threading
                def _thread_target():
                    asyncio.run(_wrapper())
                t = threading.Thread(target=_thread_target, daemon=True)
                t.start()
