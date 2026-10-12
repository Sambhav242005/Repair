import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.exceptions import NotFoundException
from backend.app.db.database import get_db
from backend.app.db.models import JobModel
from backend.app.models.schemas import Job, JobError

router = APIRouter(prefix="/jobs", tags=["Jobs"])

def model_to_schema(model: JobModel) -> Job:
    result_obj = json.loads(model.result_json) if model.result_json else None
    error_obj = None
    if model.error_json:
        err_dict = json.loads(model.error_json)
        error_obj = JobError(
            code=err_dict.get("code", "INTERNAL_ERROR"),
            message=err_dict.get("message", "Unknown error"),
        )

    return Job(
        id=model.id,
        kind=model.kind,
        status=model.status,
        result=result_obj,
        error=error_obj,
    )

@router.get("/{job_id}", response_model=Job)
def get_job(job_id: str, db: Session = Depends(get_db)):
    model = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not model:
        raise NotFoundException(f"Job '{job_id}' not found.")
    return model_to_schema(model)
