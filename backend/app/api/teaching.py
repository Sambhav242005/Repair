import asyncio
import hashlib
import json
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.db.database import begin_write_transaction, get_db
from backend.app.db.models import CoursePlanModel, LessonModel
from backend.app.api.factory import lesson_to_schema, check_half_open_overlap
from backend.app.services.teaching import PlanInput, Topic, extract_document, holiday_dates, schedule_plan
from backend.app.services.ai.service import structured
from backend.app.services.ai.provider import ProviderError

router = APIRouter(prefix="/teaching", tags=["Syllabus planning"])

class OutlineRequest(BaseModel):
    text: str = Field(min_length=3, max_length=60000)

class SourcedTopic(Topic):
    source_excerpt: str = Field(min_length=1, max_length=500)

class Outline(BaseModel):
    topics: list[SourcedTopic] = Field(min_length=1, max_length=200)

@router.post("/documents")
async def read_document(file: UploadFile = File(...)):
    content = await file.read(5 * 1024 * 1024 + 1)
    try:
        text = await asyncio.to_thread(extract_document, file.filename or "", content)
    except Exception as exc:
        if isinstance(exc, (ValueError, UnicodeError)):
            detail = str(exc)
        else:
            detail = "Could not read this document. Export a text PDF, DOCX or UTF-8 text file."
        raise HTTPException(422, detail) from None
    return {"text": text, "fingerprint": hashlib.sha256(content).hexdigest(), "holiday_dates": holiday_dates(text)}

@router.post("/outline", response_model=Outline)
async def outline_syllabus(payload: OutlineRequest):
    def check(result):
        if any(topic.source_excerpt not in payload.text for topic in result.topics):
            raise ValueError("Topic evidence is not in the syllabus.")
    try:
        return await structured("Organize this college syllabus into ordered teaching topics. Estimate lectures per topic as editable suggestions. Include an exact source_excerpt from the supplied text for every topic. Do not omit syllabus units or add unrelated topics. Preparation should describe a simple teaching activity, not hardware repair. The teacher will review all estimates.",
            {"syllabus_text": payload.text}, Outline, check=check)
    except ProviderError as exc:
        raise HTTPException(503, str(exc)) from None

def plan_view(model):
    return {"id": model.id, "course": model.title, "status": model.status, **json.loads(model.payload_json)}

@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    return [plan_view(p) for p in db.query(CoursePlanModel).order_by(CoursePlanModel.created_at.desc()).all()]

@router.post("/plans")
def preview_plan(payload: PlanInput, db: Session = Depends(get_db)):
    begin_write_transaction(db)
    config = payload.model_dump(mode="json")
    fingerprint = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    existing = db.query(CoursePlanModel).filter_by(fingerprint=fingerprint).first()
    if existing:
        return plan_view(existing)
    result = schedule_plan(payload)
    model = CoursePlanModel(id="plan_" + uuid.uuid4().hex[:12], fingerprint=fingerprint,
        title=payload.course, payload_json=json.dumps({"config": config, **result}), status="draft")
    db.add(model)
    db.commit()
    return plan_view(model)

@router.post("/plans/{plan_id}/publish")
def publish_plan(plan_id: str, db: Session = Depends(get_db)):
    begin_write_transaction(db)
    model = db.query(CoursePlanModel).filter_by(id=plan_id).first()
    if not model:
        raise HTTPException(404, "Teaching plan not found.")
    data = json.loads(model.payload_json)
    if model.status == "published":
        return plan_view(model)
    if data["unallocated_lectures"]:
        raise HTTPException(409, "There are not enough lecture slots to finish the syllabus. Add class times or adjust lecture estimates before publishing.")
    existing = db.query(LessonModel).filter_by(status="scheduled", assignee=data["config"]["assignee"]).all()
    for session in data["sessions"]:
        if any(check_half_open_overlap(session["starts_at"], session["ends_at"], l.starts_at, l.ends_at) for l in existing):
            raise HTTPException(409, "The teacher already has a scheduled class in one of these time slots. No lectures were added.")
    ids = []
    for index, session in enumerate(data["sessions"]):
        lesson_id = f"{model.id}_lecture_{index + 1}"
        db.add(LessonModel(id=lesson_id, **session, status="scheduled"))
        ids.append(lesson_id)
    data["lesson_ids"] = ids
    model.payload_json = json.dumps(data)
    model.status = "published"
    db.commit()
    return plan_view(model)
