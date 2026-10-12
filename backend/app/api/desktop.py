"""Loopback-only API for native, user-approved Windows desktop sessions."""
import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import ipaddress
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import SQLAlchemyError
from backend.app.db.database import SessionLocal
from backend.app.db.models import DesktopSessionModel

from backend.app.services.automation.desktop import DesktopSession, accepted
from backend.app.services.automation.models import Acceptance, SessionResult, Window
from backend.app.services.automation.windows import DesktopError, WindowsAdapter

router = APIRouter(tags=["Native Desktop Sessions"])

APP_IDS = {"Calculator": "calculator", "Settings": "settings", "TaskManager": "taskmgr"}
APP_TITLES = {"calculator": "Windows Calculator", "settings": "Windows Settings", "taskmgr": "Task Manager"}
ACTIVE_STATUSES = {"running", "needs_approval"}
ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}


class DesktopSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    window: Window
    goal: str = Field(min_length=1, max_length=500)
    acceptance: Acceptance


@dataclass
class ManagedDesktopSession:
    id: str
    window: Window
    goal: str
    acceptance: Acceptance
    status: str = "running"
    stage: str = "inspection"
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    stopped_at: str | None = None
    message: str = "Inspecting the selected window and asking Gemma and Clef for a bounded plan."
    verified_result: str | None = None
    error: str | None = None
    proposed_action: dict | None = None
    debug_events: list[dict] = field(default_factory=list)
    desktop_session: DesktopSession | None = None
    result: SessionResult | None = None
    task: asyncio.Task | None = None
    stop_requested: bool = False
    persistence_failed: bool = False
    steps_cache: list[dict] = field(default_factory=list)


_sessions: dict[str, ManagedDesktopSession] = {}
_session_lock = asyncio.Lock()


def _require_local_desktop_access(request: Request) -> None:
    """Do not expose native input endpoints to non-loopback clients or web origins."""
    try:
        client_host = request.client.host if request.client else ""
        is_loopback = ipaddress.ip_address(client_host).is_loopback
        origin = request.headers.get("origin")
        valid_origin = origin in ALLOWED_ORIGINS
    except ValueError:
        is_loopback = valid_origin = False
    if not is_loopback or not valid_origin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Native desktop control is available only to the local Repair Before Replace UI.")


def _session_or_404(session_id: str) -> ManagedDesktopSession:
    session = _sessions.get(session_id)
    if session is None:
        db = SessionLocal()
        try:
            record = db.query(DesktopSessionModel).filter(DesktopSessionModel.id == session_id).first()
            if record is None:
                raise HTTPException(status_code=404, detail="Desktop session not found.")
            session = ManagedDesktopSession(
                id=record.id,
                window=Window.model_validate_json(record.window_json),
                goal=record.goal,
                acceptance=Acceptance.model_validate_json(record.acceptance_json),
                status=record.status,
                stage=record.stage,
                started_at=record.started_at,
                stopped_at=record.stopped_at,
                message=record.message,
                verified_result=record.verified_result,
                error=record.error,
                proposed_action=json.loads(record.proposed_action_json) if record.proposed_action_json else None,
                debug_events=json.loads(record.debug_events_json or "[]"),
                steps_cache=json.loads(record.steps_json or "[]"),
            )
        finally:
            db.close()
        if session.status == "running":
            session.status = "stopped"
            session.stopped_at = datetime.now(timezone.utc).isoformat()
            session.message = "The local service restarted during this session. Its last input may be unverified; check the selected app before retrying."
            _persist_session(session)
        _sessions[session_id] = session
    return session


def _append_debug(session: ManagedDesktopSession, event: dict) -> None:
    # Keep recent structured inspection details locally. No tokens, screenshots or stderr.
    session.debug_events.append({"at": datetime.now(timezone.utc).isoformat(), **event})
    del session.debug_events[:-300]
    _persist_session(session)


def _finish(session: ManagedDesktopSession, result: SessionResult) -> None:
    session.result = result
    session.error = result.message if result.status == "failed" else None
    session.message = result.message
    if session.persistence_failed:
        session.status = "failed"
        session.error = "Local desktop session storage failed. Further input has been stopped."
        session.message = session.error
    elif result.status == "succeeded":
        session.status = "completed"
        session.verified_result = session.acceptance.name_equals
    elif result.status == "stopped":
        session.status = "stopped"
        session.stopped_at = datetime.now(timezone.utc).isoformat()
    elif result.status == "failed":
        session.status = "failed"
    else:
        inspection = next((event.get("data", {}) for event in reversed(session.debug_events)
                           if event.get("event") == "inspection"), {})
        proposed = inspection.get("selected_action", {})
        operation = proposed.get("operation")
        if operation in {"stop", "ask_user"}:
            session.status = "needs_user" if operation == "ask_user" else "stopped"
            session.message = "Clef recommends asking for clarification; no desktop input was run." if operation == "ask_user" else "Clef selected stop; no desktop input was run."
        else:
            session.status = "needs_approval"
            session.proposed_action = proposed
            session.message = "Inspection complete. Review the proposed action and approve before any input is sent."


def _debug_sink(session: ManagedDesktopSession):
    return lambda event: _append_debug(session, event)


async def _inspect(session: ManagedDesktopSession) -> None:
    try:
        adapter = WindowsAdapter(session.window)
        initial = await adapter.observe()
        if session.stop_requested:
            session.status = "stopped"
            session.stopped_at = datetime.now(timezone.utc).isoformat()
            session.message = "Stopped before provider review; no desktop input was sent."
            return
        if accepted(initial, session.acceptance):
            session.status = "completed"
            session.message = "The selected window already matches the expected state; no input was sent."
            session.verified_result = session.acceptance.name_equals
            return
        native = DesktopSession(adapter, session.goal, session.acceptance,
                                debug_sink=_debug_sink(session), inspect_only=True)
        session.desktop_session = native
        if session.stop_requested:
            native.stop()
        _finish(session, await native.run())
    except Exception as exc:
        session.status = "failed"
        session.error = str(exc)
        session.message = str(exc)
    finally:
        _persist_session(session)


async def _execute(session: ManagedDesktopSession) -> None:
    try:
        native = DesktopSession(WindowsAdapter(session.window), session.goal, session.acceptance,
                                debug_sink=_debug_sink(session))
        session.desktop_session = native
        if session.stop_requested:
            native.stop()
        _finish(session, await native.run())
    except Exception as exc:
        session.status = "failed"
        session.error = str(exc)
        session.message = str(exc)
    finally:
        _persist_session(session)


def _steps(session: ManagedDesktopSession) -> list[dict]:
    native = session.desktop_session
    if native is None:
        return session.steps_cache
    mapped = []
    old_timestamps = {
        step.get("step_number"): step.get("timestamp")
        for step in session.steps_cache
        if step.get("step_number") is not None
    }
    for index, trace in enumerate(native.trace, 1):
        action = trace.action
        status_map = {"verified": "succeeded", "no_effect": "failed", "failed": "failed", "interrupted": "stopped"}
        mapped.append({
            "step_number": index,
            "timestamp": old_timestamps.get(index) or datetime.now(timezone.utc).isoformat(),
            "control_name": action.expected_effect,
            "control_type": "UI Automation",
            "action": action.operation,
            "value": action.argument,
            "verified_state": "Visible change verified" if trace.effect_verified else "No verified visible change",
            "status": status_map[trace.status],
        })
    return mapped


def _persist_session(session: ManagedDesktopSession) -> None:
    db = SessionLocal()
    try:
        record = db.query(DesktopSessionModel).filter(DesktopSessionModel.id == session.id).first()
        if record is None:
            record = DesktopSessionModel(id=session.id, window_json="{}", goal=session.goal,
                acceptance_json="{}", status=session.status, stage=session.stage,
                started_at=session.started_at, message=session.message)
        if session.desktop_session is not None:
            session.steps_cache = _steps(session)
        record.window_json = json.dumps(session.window.model_dump())
        record.goal = session.goal
        record.acceptance_json = json.dumps(session.acceptance.model_dump())
        record.status = session.status
        record.stage = session.stage
        record.started_at = session.started_at
        record.stopped_at = session.stopped_at
        record.message = session.message
        record.verified_result = session.verified_result
        record.error = session.error
        record.proposed_action_json = json.dumps(session.proposed_action) if session.proposed_action else None
        record.debug_events_json = json.dumps(session.debug_events, ensure_ascii=False)
        record.steps_json = json.dumps(session.steps_cache, ensure_ascii=False)
        db.add(record)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        session.persistence_failed = True
        session.stop_requested = True
        session.status = "failed"
        session.error = "Local desktop session storage failed. Further input has been stopped."
        session.message = session.error
        if session.desktop_session is not None:
            session.desktop_session.stop()
    finally:
        db.close()


def recover_desktop_sessions(now: datetime | None = None) -> None:
    """Stop interrupted runs after restart; preserve no-input previews for review."""
    db = SessionLocal()
    try:
        now = now or datetime.now(timezone.utc)
        if now.tzinfo is None or now.utcoffset() is None:
            raise ValueError("Desktop recovery time must include a UTC offset.")
        now = now.astimezone(timezone.utc)
        cutoff = (now - timedelta(days=30)).isoformat()
        approval_cutoff = (now - timedelta(hours=24)).isoformat()
        rows = db.query(DesktopSessionModel).filter(DesktopSessionModel.status == "running").all()
        for row in rows:
            row.status = "stopped"
            row.stopped_at = now.isoformat()
            row.message = "The local service restarted during this session. Its last input may be unverified; check the selected app before retrying."
        stale_previews = db.query(DesktopSessionModel).filter(
            DesktopSessionModel.status == "needs_approval",
            DesktopSessionModel.started_at < approval_cutoff,
        ).all()
        for row in stale_previews:
            row.status = "stopped"
            row.stopped_at = now.isoformat()
            row.message = "This approval preview expired after 24 hours. Inspect the application again before running it."
        db.query(DesktopSessionModel).filter(
            DesktopSessionModel.started_at < cutoff,
            DesktopSessionModel.status.in_(["completed", "failed", "stopped", "needs_user"]),
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


async def stop_all_desktop_sessions() -> None:
    """Stop active local sessions before the API process shuts down."""
    pending = []
    now = datetime.now(timezone.utc).isoformat()
    for session in list(_sessions.values()):
        if session.status not in ACTIVE_STATUSES:
            continue
        session.stop_requested = True
        session.status = "stopped"
        session.stopped_at = now
        session.message = "The local service is shutting down. Check the selected app before retrying."
        if session.desktop_session is not None:
            session.desktop_session.stop()
        if session.task is not None and not session.task.done():
            session.task.cancel()
            pending.append(session.task)
        _persist_session(session)
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)


def _has_active_persisted_session() -> bool:
    db = SessionLocal()
    try:
        return db.query(DesktopSessionModel.id).filter(DesktopSessionModel.status.in_(ACTIVE_STATUSES)).first() is not None
    finally:
        db.close()


def _serialize(session: ManagedDesktopSession) -> dict:
    return {
        "id": session.id,
        "app_id": APP_IDS[session.window.application],
        "app_title": APP_TITLES[APP_IDS[session.window.application]],
        "goal": session.goal,
        "status": session.status,
        "stage": session.stage,
        "started_at": session.started_at,
        "stopped_at": session.stopped_at,
        "steps": _steps(session),
        "verified_result": session.verified_result,
        "error": session.error,
        "message": session.message,
        "window": session.window.model_dump(),
        "proposed_action": session.proposed_action,
        "debug_events": session.debug_events,
        "approval_scope": {"max_actions": 12, "deadline_seconds": 120, "inspect_only": session.stage == "inspection"},
    }


@router.get("/desktop-sessions/windows")
async def list_desktop_windows(request: Request):
    _require_local_desktop_access(request)
    try:
        windows = await WindowsAdapter().windows()
    except DesktopError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    return [window.model_dump() for window in windows]


@router.get("/desktop-sessions")
async def list_desktop_sessions(request: Request, limit: int = Query(20, ge=1, le=100)):
    _require_local_desktop_access(request)
    db = SessionLocal()
    try:
        rows = (db.query(DesktopSessionModel)
                .order_by(DesktopSessionModel.started_at.desc())
                .limit(limit).all())
        session_ids = [row.id for row in rows]
    finally:
        db.close()
    return [_serialize(_session_or_404(session_id)) for session_id in session_ids]


@router.post("/desktop-sessions", status_code=status.HTTP_202_ACCEPTED)
async def start_desktop_inspection(payload: DesktopSessionCreate, request: Request):
    _require_local_desktop_access(request)
    async with _session_lock:
        if any(session.status in ACTIVE_STATUSES for session in _sessions.values()) or _has_active_persisted_session():
            raise HTTPException(status_code=409, detail="Stop or finish the active desktop session before starting another.")
        try:
            available = await WindowsAdapter().windows()
        except DesktopError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from None
        if payload.window not in available:
            raise HTTPException(status_code=409, detail="That application window changed or closed. Refresh the window list and select it again.")

        session = ManagedDesktopSession(id=uuid.uuid4().hex, window=payload.window, goal=payload.goal.strip(),
                                        acceptance=payload.acceptance)
        _sessions[session.id] = session
        _persist_session(session)
        if session.persistence_failed:
            return _serialize(session)
        session.task = asyncio.create_task(_inspect(session))
        return _serialize(session)


@router.get("/desktop-sessions/{session_id}")
async def get_desktop_session(session_id: str, request: Request):
    _require_local_desktop_access(request)
    return _serialize(_session_or_404(session_id))


@router.post("/desktop-sessions/{session_id}/approve")
async def approve_desktop_session(session_id: str, request: Request):
    _require_local_desktop_access(request)
    async with _session_lock:
        session = _session_or_404(session_id)
        if session.status != "needs_approval":
            raise HTTPException(status_code=409, detail="This session is not waiting for approval.")
        # Revalidate the exact target at the moment of approval; never execute against a recycled HWND.
        try:
            available = await WindowsAdapter().windows()
        except DesktopError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from None
        if session.window not in available:
            session.status = "failed"
            session.error = "The selected application window changed or closed. Inspect it again before retrying."
            session.message = session.error
            _persist_session(session)
            raise HTTPException(status_code=409, detail=session.error)
        session.status = "running"
        session.stage = "execution"
        session.message = "Approved. Running bounded native UI Automation and verifying each visible change."
        session.stop_requested = False
        _persist_session(session)
        if session.persistence_failed:
            return _serialize(session)
        session.task = asyncio.create_task(_execute(session))
        return _serialize(session)


@router.post("/desktop-sessions/{session_id}/stop")
async def stop_desktop_session(session_id: str, request: Request):
    _require_local_desktop_access(request)
    async with _session_lock:
        session = _session_or_404(session_id)
        if session.status == "needs_approval":
            session.status = "stopped"
            session.stopped_at = datetime.now(timezone.utc).isoformat()
            session.message = "Stopped before approval; no desktop input was sent."
        elif session.status == "running" and session.desktop_session is not None:
            session.stop_requested = True
            session.desktop_session.stop()
            session.message = "Stop requested. Any input already delivered cannot be undone; further actions are blocked."
        elif session.status == "running":
            session.stop_requested = True
            session.message = "Stop requested before input; waiting for the session to reach its cancellation check."
        _persist_session(session)
        return _serialize(session)
