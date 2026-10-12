import os
import uuid
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import ValidationException
from backend.app.db.database import get_db
from backend.app.db.models import ScreenshotModel
from backend.app.models.schemas import ScreenshotUploadResponse

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "screenshots")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg"}

@router.post("/screenshots", response_model=ScreenshotUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_screenshot(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Check the declared type before reading; accept only formats we can
    # verify from the actual file bytes below.
    content_type = file.content_type or ""
    if content_type.lower() not in ALLOWED_MIME_TYPES:
        raise ValidationException(
            f"Invalid screenshot mime-type '{content_type}'. Allowed types are PNG and JPEG.",
            details={"allowed": list(ALLOWED_MIME_TYPES)},
        )

    # Read at most one byte beyond the limit so an oversized upload cannot
    # force the API to buffer an arbitrary amount of data in memory.
    content = await file.read(MAX_SCREENSHOT_BYTES + 1)
    await file.close()
    size_bytes = len(content)
    if size_bytes > MAX_SCREENSHOT_BYTES:
        raise ValidationException(
            f"Screenshot size ({size_bytes} bytes) exceeds maximum limit of 5 MB (5,242,880 bytes).",
            details={"size_bytes": size_bytes, "max_bytes": MAX_SCREENSHOT_BYTES},
        )
    if not content:
        raise ValidationException("Screenshot file is empty.")

    signature = b"\x89PNG\r\n\x1a\n" if content_type.lower() == "image/png" else b"\xff\xd8\xff"
    if not content.startswith(signature):
        raise ValidationException("Screenshot bytes do not match the declared PNG or JPEG format.")

    # Store under generated filename (never interpret client filename as path)
    screenshot_id = f"screenshot_{uuid.uuid4().hex[:12]}"
    extension = ".png" if "png" in content_type else ".jpg"
    safe_filename = f"{screenshot_id}{extension}"
    target_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(target_path, "wb") as f:
            f.write(content)

        model = ScreenshotModel(
            id=screenshot_id,
            file_path=target_path,
            mime_type=content_type,
            size_bytes=size_bytes,
        )
        db.add(model)
        db.commit()
    except Exception:
        db.rollback()
        try:
            os.remove(target_path)
        except OSError:
            pass
        raise

    return ScreenshotUploadResponse(
        id=screenshot_id,
        mime_type=content_type,
        size_bytes=size_bytes,
    )
