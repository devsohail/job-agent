import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ─── Startup Validation ────────────────────────────────────────────────────────

def _check_env():
    errors = []
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic_key or anthropic_key.startswith("sk-ant-your"):
        errors.append(
            "ANTHROPIC_API_KEY is missing or still set to the placeholder value. "
            "Please add your real key to backend/.env"
        )
    rapidapi_key = os.environ.get("RAPIDAPI_KEY", "")
    if not rapidapi_key or rapidapi_key == "YOUR_RAPIDAPI_KEY_HERE":
        errors.append(
            "RAPIDAPI_KEY is missing. Job search will not work without it."
        )
    return errors


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup checks before accepting requests."""
    warnings = _check_env()
    for w in warnings:
        print(f"⚠️  WARNING: {w}", file=sys.stderr)
    if warnings:
        print("🚀 Server starting despite warnings — some features may fail.", file=sys.stderr)
    else:
        print("✅ Environment validated — all API keys present.", file=sys.stderr)
    yield


# ─── App Init ─────────────────────────────────────────────────────────────────

from routers import jobs, applications, cv, skills, tracker  # noqa

app = FastAPI(
    title="Job Application Agent API",
    version="2.0.0",
    description="Agentic job search, CV parsing, application drafting & skill analysis",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# ─── Request Size Limit ────────────────────────────────────────────────────────

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    MAX_BODY = 1 * 1024 * 1024  # 1 MB for JSON payloads
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY:
        return JSONResponse(
            status_code=413,
            content={"detail": "Request body too large. Maximum is 1 MB."}
        )
    return await call_next(request)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(cv.router,           prefix="/api/cv",           tags=["CV"])
app.include_router(jobs.router,         prefix="/api/jobs",         tags=["Jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(skills.router,       prefix="/api/skills",       tags=["Skills"])
app.include_router(tracker.router,      prefix="/api/tracker",      tags=["Tracker"])

# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    """Health check — also returns which API keys are configured."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "anthropic_configured": bool(
            os.environ.get("ANTHROPIC_API_KEY", "").startswith("sk-ant-")
        ),
        "rapidapi_configured": bool(
            os.environ.get("RAPIDAPI_KEY") and
            os.environ.get("RAPIDAPI_KEY") != "YOUR_RAPIDAPI_KEY_HERE"
        ),
    }
