"""Read-only, privacy-preserving diagnostic JSON for POST /diagnostics."""
import argparse
from datetime import datetime, timezone
import json
import os
import platform
import shutil
import ctypes

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
