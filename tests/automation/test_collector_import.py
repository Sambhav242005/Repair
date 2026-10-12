"""Import real read-only collector output into an isolated temporary API database."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

class CollectorImportTest(unittest.TestCase):
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
