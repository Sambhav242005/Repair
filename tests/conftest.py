"""Keep backend tests away from a developer's local application database."""
import os
from pathlib import Path
import tempfile


_test_data_dir = Path(tempfile.mkdtemp(prefix="repair-before-replace-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_test_data_dir.as_posix()}/repair-test.db"

# Smoke tests create background jobs. Never inherit a developer's live cloud
# credentials/model from backend/.env; provider tests inject their own adapters.
if os.environ.get("RUN_LIVE_AI_TESTS") != "1":
    os.environ["AI_PROVIDER"] = "gemini"
    os.environ["GEMINI_API_KEY"] = ""
    os.environ["GEMINI_MODEL"] = ""
