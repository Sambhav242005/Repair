"""Loopback and same-app-origin guard for features that inspect this PC."""
import ipaddress
from fastapi import HTTPException, Request

LOCAL_UI_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}


def require_local_ui(request: Request, feature: str) -> None:
    try:
        loopback = bool(request.client and ipaddress.ip_address(request.client.host).is_loopback)
    except ValueError:
        loopback = False
    if not loopback or request.headers.get("origin") not in LOCAL_UI_ORIGINS:
        raise HTTPException(status_code=403, detail=f"{feature} is available only from the local Repair Before Replace UI.")
