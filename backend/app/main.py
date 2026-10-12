import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment
load_dotenv()

from backend.app.core.exceptions import AppException
from backend.app.db.seed import seed_database
from backend.app.jobs.registry import JobRegistry

from backend.app.api.health import router as health_router
from backend.app.api.teaching import router as teaching_router
from backend.app.api.assets import router as assets_router
from backend.app.api.cases import router as cases_router
from backend.app.api.uploads import router as uploads_router
from backend.app.api.diagnostics import router as diagnostics_router
from backend.app.api.advice import router as advice_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.factory import router as factory_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.impact import router as impact_router
from backend.app.api.desktop import recover_desktop_sessions, router as desktop_router, stop_all_desktop_sessions

async def _alert_scheduler_loop():
    from backend.app.db.database import SessionLocal
    from backend.app.api.alerts import evaluate_and_persist_alerts
    import asyncio
    while True:
        try:
            await asyncio.sleep(15)
            db = SessionLocal()
            try:
                evaluate_and_persist_alerts(db)
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: store running event loop, ensure tables and demo fixtures exist, clean up unfinished jobs
    import asyncio
    JobRegistry.set_loop(asyncio.get_running_loop())
    seed_database(reset=False)
    recover_desktop_sessions()
    JobRegistry.cleanup_unfinished_jobs()
    scheduler_task = asyncio.create_task(_alert_scheduler_loop())
    try:
        yield
    finally:
        scheduler_task.cancel()
        await asyncio.gather(scheduler_task, return_exceptions=True)
        await stop_all_desktop_sessions()

app = FastAPI(
    title="Repair Before Replace API",
    version="1.0.0",
    description="Authoritative API contract for Repair Before Replace MVP (SRS v1.0)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for frontend origin
cors_origin = os.getenv("CORS_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[cors_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Canonical Error Envelope Handlers (SRS §8)
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload or schema mismatch.",
            "details": jsonable_encoder(exc.errors()),
            }
        },
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Internal server error.",
                "details": str(exc),
            }
        },
    )

# Root health check
app.include_router(health_router)

# /api/v1 prefixed routers
API_V1_PREFIX = "/api/v1"
app.include_router(health_router, prefix=API_V1_PREFIX)
app.include_router(assets_router, prefix=API_V1_PREFIX)
app.include_router(teaching_router, prefix=API_V1_PREFIX)
app.include_router(uploads_router, prefix=API_V1_PREFIX)
app.include_router(diagnostics_router, prefix=API_V1_PREFIX)
app.include_router(cases_router, prefix=API_V1_PREFIX)
app.include_router(advice_router, prefix=API_V1_PREFIX)
app.include_router(jobs_router, prefix=API_V1_PREFIX)
app.include_router(factory_router, prefix=API_V1_PREFIX)
app.include_router(alerts_router, prefix=API_V1_PREFIX)
app.include_router(impact_router, prefix=API_V1_PREFIX)
app.include_router(desktop_router, prefix=API_V1_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000)
