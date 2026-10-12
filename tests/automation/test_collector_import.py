"""Import real read-only collector output into an isolated temporary API database."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from scripts.collect_diagnostics import detect_device_identity, parse_device_identity

class CollectorImportTest(unittest.TestCase):
    def test_device_identity_accepts_make_and_model_only(self):
        self.assertEqual(parse_device_identity('{"manufacturer":"Lenovo","model":"ThinkPad T480"}'),
                         {"manufacturer": "Lenovo", "model": "ThinkPad T480"})

    def test_device_identity_rejects_oem_placeholders(self):
        with self.assertRaisesRegex(RuntimeError, "usable manufacturer and model"):
            parse_device_identity('{"manufacturer":"Default string","model":"System Product Name"}')

    def test_mac_device_identity_queries_only_the_hardware_model(self):
        with patch("scripts.collect_diagnostics.platform.system", return_value="Darwin"), patch(
                "scripts.collect_diagnostics.subprocess.run", return_value=SimpleNamespace(stdout="Mac14,7\n")) as run:
            self.assertEqual(detect_device_identity(), {"manufacturer":"Apple","model":"Mac14,7"})
            self.assertEqual(run.call_args.args[0], ["/usr/sbin/sysctl", "-n", "hw.model"])

    @unittest.skipUnless(os.name == "nt", "Local model detection uses Windows CIM.")
    def test_device_detection_requests_make_and_model_without_serial(self):
        with patch("scripts.collect_diagnostics.subprocess.run", return_value=SimpleNamespace(
                stdout='{"manufacturer":"Lenovo","model":"T480"}')) as run:
            self.assertEqual(detect_device_identity(), {"manufacturer": "Lenovo", "model": "T480"})
            command = " ".join(run.call_args.args[0])
            self.assertIn("Win32_ComputerSystem", command)
            self.assertNotIn("SerialNumber", command)
            self.assertNotIn("ExecutionPolicy", command)

    def test_collector_imports_through_api(self):
        code = '''
import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.db.seed import seed_database
from backend.app.db.database import engine
from scripts.collect_diagnostics import collect
async def main():
    seed_database(reset=False)
    async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
        created = await client.post("/api/v1/assets",json={"name":"Collector test asset","category":"computer"})
        assert created.status_code == 201, created.status_code
        asset_id = created.json()["id"]
        payload = collect(asset_id)
        imported = await client.post("/api/v1/diagnostics",json=payload)
        assert imported.status_code == 201, imported.status_code
        response = imported.json()
        assert response["asset_id"] == asset_id
        assert response["memory"] == payload["memory"]
        assert response["disks"] == payload["disks"]
        assert response["collected_at"] == payload["collected_at"]
    engine.dispose()
asyncio.run(main())
'''
        with tempfile.TemporaryDirectory(prefix="repair-import-test-") as directory:
            environment = dict(os.environ, DATABASE_URL="sqlite:///" + (Path(directory)/"isolated.db").as_posix())
            result = subprocess.run([sys.executable,"-c",code],cwd=Path(__file__).resolve().parents[2],
                env=environment,capture_output=True,text=True,timeout=20)
            self.assertEqual(result.returncode,0,result.stderr)

if __name__ == "__main__":
    unittest.main()
