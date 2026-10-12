"""Keep backend tests away from a developer's local application database."""
import os
from pathlib import Path
import tempfile


_test_data_dir = Path(tempfile.mkdtemp(prefix="repair-before-replace-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_test_data_dir.as_posix()}/repair-test.db"
