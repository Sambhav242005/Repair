"""Read-only, privacy-preserving diagnostic JSON for POST /diagnostics."""
import argparse
from datetime import datetime, timezone
import json
import os
import platform
import shutil
import ctypes
import subprocess

UNKNOWN_DEVICE_VALUES = {"", "default string", "system product name", "to be filled by o.e.m.", "to be filled by oem"}

def parse_device_identity(output: str) -> dict:
    """Parse only the public make/model fields; serial numbers and hostnames are never queried."""
    try:
        payload = json.loads(output)
        manufacturer = str(payload.get("manufacturer") or "").strip()
        model = str(payload.get("model") or "").strip()
    except (json.JSONDecodeError, AttributeError, TypeError):
        raise RuntimeError("Windows returned an invalid computer model record.") from None
    if manufacturer.casefold() in UNKNOWN_DEVICE_VALUES or model.casefold() in UNKNOWN_DEVICE_VALUES:
        raise RuntimeError("This PC did not report a usable manufacturer and model.")
    if len(manufacturer) > 120 or len(model) > 160:
        raise RuntimeError("This PC returned an invalid manufacturer or model value.")
    return {"manufacturer": manufacturer, "model": model}

def detect_device_identity(runner=None) -> dict:
    """Read Windows make/model or the Mac hardware model without serial or user identity."""
    run = runner or subprocess.run
    if platform.system() == "Darwin":
        try:
            result = run(["/usr/sbin/sysctl", "-n", "hw.model"], capture_output=True,
                         text=True, encoding="utf-8", timeout=8, check=True)
            return parse_device_identity(json.dumps({"manufacturer": "Apple", "model": result.stdout.strip()}))
        except (OSError, subprocess.SubprocessError):
            raise RuntimeError("macOS could not read the hardware model.") from None
    if os.name != "nt":
        raise RuntimeError("Device model detection requires a local Windows or macOS backend.")
    script = (
        "$ErrorActionPreference='Stop'; "
        "$pc=Get-CimInstance -ClassName Win32_ComputerSystem; "
        "[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false); "
        "@{manufacturer=$pc.Manufacturer;model=$pc.Model} | ConvertTo-Json -Compress"
    )
    try:
        result = run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=8, check=True)
    except (OSError, subprocess.SubprocessError):
        raise RuntimeError("Windows could not read this PC's manufacturer and model.") from None
    return parse_device_identity(result.stdout)

def memory_bytes() -> tuple[int, int]:
    if os.name == "nt":
        class MemoryStatus(ctypes.Structure):
            _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [(name, ctypes.c_ulonglong) for name in
                ("total", "available", "page_total", "page_available", "virtual_total", "virtual_available", "extended")]
        status = MemoryStatus()
        status.length = ctypes.sizeof(status)
        if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
            raise OSError("Unable to read physical memory.")
        return status.total, status.available
    try:
        import psutil
        memory = psutil.virtual_memory()
        return memory.total, memory.available
    except ImportError:
        raise RuntimeError("Non-Windows collection requires psutil.") from None

def collect(asset_id: str) -> dict:
    if not asset_id or len(asset_id) > 200:
        raise ValueError("Supply a nonempty asset_id (maximum 200 characters).")
    total, available = memory_bytes()
    disk = shutil.disk_usage(os.path.abspath(os.sep))
    return {"asset_id": asset_id, "collected_at": datetime.now(timezone.utc).isoformat(),
        "os": {"name": platform.system(), "version": platform.release()},
        "memory": {"total_bytes": total, "available_bytes": available},
        "disks": [{"label": "system", "total_bytes": disk.total, "free_bytes": disk.free}],
        "cpu": {"logical_count": os.cpu_count() or 1}, "collector_version": "1.0.0"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset-id", required=True)
    args = parser.parse_args()
    print(json.dumps(collect(args.asset_id), indent=2))
