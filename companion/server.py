"""Paired loopback service. No remote shell or arbitrary command endpoint."""
import argparse
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import ipaddress
import json
import os
import platform
from pathlib import Path
import secrets
import subprocess
from urllib.parse import urlsplit
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from typing import Literal
from scripts.collect_diagnostics import collect, detect_device_identity

LAUNCHES = {
    "calculator": ("Windows Calculator", "calc.exe"),
    "settings": ("Windows Settings", "ms-settings:"),
    "taskmanager": ("Task Manager", "taskmgr.exe"),
    "notepad": ("Notepad", "notepad.exe"),
}
MAC_LAUNCHES = {
    "calculator": ("Calculator", "Calculator"),
    "settings": ("System Settings", "System Settings"),
    "taskmanager": ("Activity Monitor", "Activity Monitor"),
    "notepad": ("TextEdit", "TextEdit"),
}

def launch_catalog():
    return MAC_LAUNCHES if platform.system() == "Darwin" else LAUNCHES

def installed_apps():
    if platform.system() == "Darwin":
        roots = [Path("/Applications"), Path("/Applications/Utilities"), Path("/System/Applications"),
                 Path("/System/Applications/Utilities"), Path.home() / "Applications"]
        return sorted({app.stem for root in roots if root.is_dir() for app in root.glob("*.app")})[:1000]
    if os.name != "nt":
        raise RuntimeError("The companion requires Windows.")
    script = "[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false); @(Get-StartApps | Select-Object -ExpandProperty Name) | ConvertTo-Json -Compress"
    result = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=10, check=True)
    names = json.loads(result.stdout)
    if isinstance(names, str):
        names = [names]
    return sorted({n for n in names if isinstance(n, str) and n.strip()})[:1000]

def launch_app(app_id):
    catalog = launch_catalog()
    if app_id not in catalog:
        raise ValueError("This application is not approved for launching.")
    if platform.system() == "Darwin":
        subprocess.run(["/usr/bin/open", "-a", catalog[app_id][1]], check=True, timeout=8,
                       capture_output=True)
        return
    if os.name != "nt":
        raise RuntimeError("The companion requires Windows.")
    if app_id not in LAUNCHES:
        raise ValueError("This application is not approved for launching.")
    target = LAUNCHES[app_id][1]
    if app_id == "settings":
        os.startfile(target)
    else:
        system_dir = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32"
        subprocess.Popen([str(system_dir / target)], shell=False)

class LaunchRequest(BaseModel):
    app_id: Literal["calculator", "settings", "taskmanager", "notepad"]

class CheckRequest(BaseModel):
    check: Literal["system_summary", "memory", "storage"]

def create_app(token: str, website_origin: str = "http://localhost:5173", audit_path: Path | None = None):
    if not token:
        raise ValueError("A nonempty pairing code is required.")
    parsed = urlsplit(website_origin)
    if (parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.path not in {"", "/"}
        or parsed.query or parsed.fragment or parsed.username or parsed.password
        or parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1"}):
        raise ValueError("Use an exact HTTPS website origin or localhost development origin.")
    origin = website_origin.rstrip("/")
    from backend.app.api import desktop
    from backend.app.db.seed import seed_database
    desktop.ALLOWED_ORIGINS.add(origin)

    @asynccontextmanager
    async def lifespan(app):
        seed_database(reset=False)
        desktop.recover_desktop_sessions()
        try:
            yield
        finally:
            await desktop.stop_all_desktop_sessions()

    app = FastAPI(title="Faculty laptop companion", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=[origin], allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"], max_age=300)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost"])

    def paired(request: Request):
        try:
            local = request.client and ipaddress.ip_address(request.client.host).is_loopback
        except ValueError:
            local = False
        if not local or request.headers.get("origin") != origin:
            raise HTTPException(403, "Only the paired website on this PC can request companion actions.")
        if not secrets.compare_digest(request.headers.get("authorization", ""), "Bearer " + token):
            raise HTTPException(401, "Enter the pairing code shown by the local companion.")

    def audit(action):
        if audit_path:
            audit_path.parent.mkdir(parents=True, exist_ok=True)
            with audit_path.open("a", encoding="utf-8") as file:
                file.write(json.dumps({"at": datetime.now(timezone.utc).isoformat(), "action": action}) + "\n")

    @app.get("/pairing", response_class=HTMLResponse)
    def pairing_page(request: Request):
        try:
            local = request.client and ipaddress.ip_address(request.client.host).is_loopback
        except ValueError:
            local = False
        # The code is shown only in a top-level local page, never through fetch or an iframe.
        if (not local or request.headers.get("origin") or
                request.headers.get("sec-fetch-dest", "document") != "document"):
            raise HTTPException(403, "Open the pairing page directly on this PC.")
        from html import escape
        return HTMLResponse(f"<!doctype html><html lang='en'><meta charset='utf-8'><title>Faculty companion pairing</title><body><h1>Pair this laptop</h1><p>Copy this code into the Faculty workspace's Local Windows companion section.</p><p><code>{escape(token)}</code></p><p>Allowed website: {escape(origin)}</p><p>Restarting the companion changes this code. Keep it on this PC.</p></body></html>",
            headers={"Cache-Control":"no-store", "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'", "X-Frame-Options":"DENY", "Referrer-Policy":"no-referrer"})

    if platform.system() == "Darwin":
        @app.get("/api/v1/desktop-sessions/windows", dependencies=[Depends(paired)])
        def no_native_mac_windows():
            return []
    app.include_router(desktop.router, prefix="/api/v1", dependencies=[Depends(paired)])

    @app.post("/disconnect", dependencies=[Depends(paired)])
    async def disconnect():
        await desktop.stop_all_desktop_sessions()
        audit("disconnect")
        return {"message": "Active companion desktop sessions were stopped."}

    @app.get("/status", dependencies=[Depends(paired)])
    def status():
        native = os.name == "nt" and platform.system() != "Darwin"
        capabilities = ["device_model", "installed_apps", "launch_approved_app", "read_only_checks"]
        if native:
            capabilities.append("approved_desktop_sessions")
        return {"connected": True, "platform": "macOS" if platform.system() == "Darwin" else "Windows" if os.name == "nt" else "unsupported", "version": "0.1.0",
            "capabilities": capabilities, "native_input_available": native,
            "launchable_apps": [{"id": key, "name": item[0]} for key, item in launch_catalog().items()]}

    @app.get("/device", dependencies=[Depends(paired)])
    def device():
        try:
            return detect_device_identity()
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from None

    @app.get("/apps", dependencies=[Depends(paired)])
    def apps():
        try:
            return {"names": installed_apps(), "source": "macOS application folders" if platform.system() == "Darwin" else "Windows Start menu for the current user"}
        except (RuntimeError, OSError, subprocess.SubprocessError, ValueError):
            raise HTTPException(503, "Could not read this computer's application list.") from None

    @app.post("/launch", dependencies=[Depends(paired)])
    def launch(payload: LaunchRequest):
        try:
            audit("launch:" + payload.app_id)
            launch_app(payload.app_id)
        except (ValueError, RuntimeError, OSError, subprocess.SubprocessError):
            raise HTTPException(503, "This app could not be launched. Check that it is installed.") from None
        return {"message": f"Launch requested for {launch_catalog()[payload.app_id][0]}."}

    @app.post("/checks", dependencies=[Depends(paired)])
    def check(payload: CheckRequest):
        try:
            audit("check:" + payload.check)
            report = collect("local_companion")
        except (OSError, RuntimeError):
            raise HTTPException(503, "Could not collect a local system snapshot.") from None
        if payload.check != "system_summary":
            report = {"collected_at": report["collected_at"], payload.check: report["memory" if payload.check == "memory" else "disks"]}
        return {"check": payload.check, "read_only": True, "report": report}

    return app

def main():
    import uvicorn
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / "backend" / ".env")
    parser = argparse.ArgumentParser(description="Pair this Windows or Mac laptop with one faculty website.")
    parser.add_argument("--website-origin", default="http://localhost:5173")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    token = secrets.token_urlsafe(24)
    data_root = Path.home() / "Library" / "Application Support" if platform.system() == "Darwin" else Path(os.environ.get("LOCALAPPDATA", str(Path.home())))
    audit = data_root / "FacultyCompanion" / "actions.jsonl"
    database = audit.parent / "companion.db"
    audit.parent.mkdir(parents=True, exist_ok=True)
    os.environ["DATABASE_URL"] = "sqlite:///" + database.as_posix()
    app = create_app(token, args.website_origin, audit)
    print("Faculty companion is starting on this PC.")
    print("Allowed website:", args.website_origin)
    print("Pairing code (paste into the website):", token, flush=True)
    print("Closing this process disconnects the website; restarting rotates the code.")
    # Windows subprocess helpers require the Proactor loop; do not use reload.
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning", access_log=False)

if __name__ == "__main__":
    main()
