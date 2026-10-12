"""Bounded Windows UIA subprocess adapter. No browser or shell tool exposed to AI."""
import asyncio
import base64
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import tempfile
import time
import uuid
from .models import Candidate, Control, Observation, Window
from .processes import terminate_helper

class DesktopError(RuntimeError):
    code = "DESKTOP_UNAVAILABLE"

CALCULATOR_IDS = {f"num{n}Button" for n in range(10)} | {
    "clearButton", "plusButton", "minusButton", "multiplyButton", "divideButton", "equalButton", "decimalSeparatorButton"}
DIAGNOSTIC_IDS = {"Performance", "PerformanceButton", "NavigationViewItemPerformance", "NavPerformance", "System", "SystemSettings_System", "Memory", "Cpu", "CPU", "SettingsPageScrollViewer"}

def permitted(control: Control, window: Window, operation: str) -> bool:
    if not control.enabled:
        return False
    if window.application == "Calculator":
        return control.automation_id in CALCULATOR_IDS and operation in {"invoke", "key", "text"} and "invoke" in control.operations
    return control.automation_id in DIAGNOSTIC_IDS and operation in {"invoke", "select", "scroll"} and operation in control.operations

class WindowsAdapter:
    def __init__(self, window: Window | None = None):
        if os.name != "nt":
            raise DesktopError("Native computer use requires Windows in an interactive desktop session.")
        self.window = window
        self.latest: Observation | None = None
        self.bridge = Path(__file__).with_name("windows_bridge.ps1")

    async def _call(self, request: dict) -> dict | list:
        with tempfile.TemporaryDirectory(prefix="repair-uia-") as directory:
            path = Path(directory) / "request.json"
            path.write_text(json.dumps(request), encoding="utf-8")
            try:
                process = await asyncio.create_subprocess_exec(
                    "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", str(self.bridge), "-RequestPath", str(path),
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
                try:
                    output, _ = await asyncio.wait_for(process.communicate(), 8)
                except BaseException:
                    await terminate_helper(process)
                    raise
                if process.returncode:
                    raise DesktopError("UI Automation rejected input or observation; refresh the selected window and retry.")
                return json.loads(output.decode("utf-8-sig"))
            except (OSError, asyncio.TimeoutError, ValueError):
                raise DesktopError("Windows UI Automation is unavailable or timed out.") from None

    async def windows(self) -> list[Window]:
        return [Window.model_validate(w) for w in await self._call({"operation": "windows"})]

    async def observe(self) -> Observation:
        if self.window is None:
            raise DesktopError("Select an application window first.")
        result = await self._call({"operation": "observe", "window": self.window.model_dump()})
        snapshot_id = uuid.uuid4().hex
        self.latest = Observation(snapshot_id=snapshot_id, captured_monotonic=time.monotonic(), window=self.window,
            controls=[Control.model_validate({**c, "id": snapshot_id + ":" + c["id"]}) for c in result["controls"]])
        return self.latest

    async def screenshot(self) -> bytes:
        """Optional local capture. Never automatically sent to a cloud model."""
        if self.window is None:
            raise DesktopError("Select an application window first.")
        result = await self._call({"operation": "screenshot", "window": self.window.model_dump()})
        image = base64.b64decode(result["png"], validate=True)
        if len(image) > 4 * 1024 * 1024:
            raise DesktopError("Selected-window screenshot exceeds 4 MiB.")
        return image

    async def execute(self, observation: Observation, action: Candidate, stop_path: Path) -> None:
        if stop_path.exists():
            raise DesktopError("Session stopped.")
        if (self.latest is not observation or self.window != observation.window
                or action.snapshot_id != observation.snapshot_id
                or time.monotonic() - observation.captured_monotonic > 5):
            raise DesktopError("Stale snapshot; observe again before input.")
        target = next((c for c in observation.controls if c.id == action.control_id), None)
        if target is None or not permitted(target, observation.window, action.operation):
            raise DesktopError("Unknown or prohibited target/action.")
        if action.operation == "text" and (action.argument is None or not action.argument.isascii()
                or not action.argument.isdigit() or not 1 <= len(action.argument) <= 16):
            raise DesktopError("Only 1-16 Calculator digits may be entered.")
        raw = target.model_dump()
        raw["id"] = raw["id"].split(":", 1)[1]
        await self._call({"operation": action.operation, "argument": action.argument, "target": raw,
            "window": self.window.model_dump(), "stop_path": str(stop_path),
            "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=max(0, 5 - (time.monotonic() - observation.captured_monotonic)))).isoformat()})
