from datetime import datetime, timezone
from io import BytesIO
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.db.seed import seed_database
from backend.app.db.database import SessionLocal
from backend.app.db.models import AlertModel
from backend.app.api.alerts import evaluate_and_persist_alerts
from backend.app.services.teaching import PlanInput, extract_document, schedule_plan

@pytest.fixture(autouse=True)
def fresh_db():
    seed_database(reset=True)

def config():
    return {"course":"Networks · Section A", "assignee":"Teacher A", "start_date":"2035-01-01", "end_date":"2035-01-31",
        "topics":[{"title":"Protocols","lectures":2,"preparation":"Prepare a packet diagram"},{"title":"Routing","lectures":1}],
        "slots":[{"weekday":0,"starts":"09:00","minutes":60}], "holidays":["2035-01-01"], "reminder_minutes":60}

def test_schedule_respects_holidays_timezone_and_capacity():
    result = schedule_plan(PlanInput.model_validate(config()))
    assert result["available_slots"] == 4
    assert result["sessions"][0]["starts_at"] == "2035-01-08T03:30:00+00:00"
    assert result["sessions"][2]["title"].endswith("Routing")
    assert result["spare_slots"] == 1
    short = {**config(), "end_date":"2035-01-09"}
    assert schedule_plan(PlanInput.model_validate(short))["unallocated_lectures"] == 2

@pytest.mark.asyncio
async def test_preview_publish_idempotency_and_topic_reminders():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        before = (await client.get('/api/v1/lessons')).json()['total']
        result = await client.post('/api/v1/teaching/plans', json=config())
        assert result.status_code == 200
        plan = result.json()
        assert (await client.get('/api/v1/lessons')).json()['total'] == before
        duplicate = (await client.post('/api/v1/teaching/plans',json=config())).json()
        assert duplicate['id'] == plan['id']
        published = (await client.post(f"/api/v1/teaching/plans/{plan['id']}/publish")).json()
        assert published['status'] == 'published'
        again = await client.post(f"/api/v1/teaching/plans/{plan['id']}/publish")
        assert again.status_code == 200
        assert (await client.get('/api/v1/lessons')).json()['total'] == before + 3
        with SessionLocal() as db:
            evaluate_and_persist_alerts(db, now=datetime(2035,1,8,2,45,tzinfo=timezone.utc))
            alerts = db.query(AlertModel).filter_by(entity_id=published['lesson_ids'][0]).all()
            assert len(alerts) == 1
            assert 'Protocols' in alerts[0].message and 'packet diagram' in alerts[0].message
            evaluate_and_persist_alerts(db, now=datetime(2035,1,8,2,50,tzinfo=timezone.utc))
            assert db.query(AlertModel).filter_by(entity_id=published['lesson_ids'][0]).count() == 1

@pytest.mark.asyncio
async def test_insufficient_capacity_and_teacher_conflict_never_partially_publish():
    async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
        short = (await client.post('/api/v1/teaching/plans',json={**config(),"end_date":"2035-01-09"})).json()
        assert (await client.post(f"/api/v1/teaching/plans/{short['id']}/publish")).status_code == 409
        full = (await client.post('/api/v1/teaching/plans',json=config())).json()
        await client.post('/api/v1/lessons',json={**full['sessions'][1], "title":"Already booked"})
        count = (await client.get('/api/v1/lessons')).json()['total']
        assert (await client.post(f"/api/v1/teaching/plans/{full['id']}/publish")).status_code == 409
        assert (await client.get('/api/v1/lessons')).json()['total'] == count

@pytest.mark.asyncio
async def test_document_upload_and_holiday_review():
    async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
        result = await client.post('/api/v1/teaching/documents',files={'file':('calendar.txt',b'Holiday 2035-01-01\nInvalid 2035-02-30','text/plain')})
        assert result.status_code == 200
        assert result.json()['holiday_dates'] == ['2035-01-01']
        assert (await client.post('/api/v1/teaching/documents',files={'file':('bad.exe',b'test')})).status_code == 422

def test_docx_and_pdf_extraction():
    from docx import Document
    from pypdf import PdfWriter
    document=Document();document.add_paragraph('Unit 1: Networks')
    content=BytesIO();document.save(content)
    assert 'Networks' in extract_document('syllabus.docx',content.getvalue())
    pdf=PdfWriter();pdf.add_blank_page(width=300,height=300)
    content=BytesIO();pdf.write(content)
    with pytest.raises(ValueError,match='No readable text'):
        extract_document('scanned.pdf',content.getvalue())

def test_overlapping_timetable_is_rejected():
    payload=config();payload['slots'].append({"weekday":0,"starts":"09:30","minutes":60})
    with pytest.raises(ValueError,match='overlap'):
        PlanInput.model_validate(payload)

@pytest.mark.asyncio
async def test_ai_outline_rejects_unsourced_topics(monkeypatch):
    from backend.app.services.ai import service
    class FakeProvider:
        async def generate(self,*args):
            return '{"topics":[{"title":"Invented","lectures":1,"source_excerpt":"not in syllabus"}]}'
    monkeypatch.setattr(service,'configured_provider',lambda:FakeProvider())
    async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
        result=await client.post('/api/v1/teaching/outline',json={'text':'Unit 1: Computer networks'})
        assert result.status_code == 503
