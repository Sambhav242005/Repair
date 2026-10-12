"""Terminate bounded helper trees so CLI launchers cannot outlive Stop."""
import asyncio
import os

async def terminate_helper(process):
    if process.returncode is None:
        if os.name == "nt":
            try:
                killer = await asyncio.create_subprocess_exec("taskkill.exe", "/PID", str(process.pid), "/T", "/F",
                    stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
                await asyncio.wait_for(killer.wait(), 3)
            except (OSError, asyncio.TimeoutError):
                if process.returncode is None:
                    process.kill()
        else:
            process.kill()
    await process.communicate()
