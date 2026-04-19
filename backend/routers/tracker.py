"""
Application Tracker — in-memory store for saved/applied job applications.
Designed for local single-user use. Swap `_store` for SQLModel + SQLite for persistence.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from models import TrackerSaveRequest

router = APIRouter()

# In-memory store: { id -> TrackerEntry dict }
_store: dict[str, dict] = {}

VALID_STATUSES = {"saved", "applied", "interview", "offer", "rejected"}


@router.post("/save")
async def save_application(body: TrackerSaveRequest):
    """Save a job to the application tracker."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            400,
            f"Invalid status '{body.status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    now = datetime.now(timezone.utc).isoformat()
    entry_id = uuid.uuid4().hex[:8]

    entry = {
        "id": entry_id,
        "job_title": body.job.title,
        "company": body.job.company,
        "location": body.job.location,
        "apply_url": body.job.apply_url,
        "source": body.job.source,
        "match_score": body.job.match_score,
        "salary": body.job.salary,
        "status": body.status,
        "saved_at": now,
        "applied_at": now if body.status == "applied" else None,
        "notes": "",
    }
    _store[entry_id] = entry
    return {"success": True, "entry": entry}


@router.get("/list")
async def list_applications():
    """Return all saved applications, newest first."""
    entries = sorted(_store.values(), key=lambda e: e["saved_at"], reverse=True)
    return {"success": True, "applications": entries, "total": len(entries)}


@router.patch("/{entry_id}/status")
async def update_status(entry_id: str, status: str):
    """Update the status of a tracked application."""
    if entry_id not in _store:
        raise HTTPException(404, f"Application '{entry_id}' not found")
    if status not in VALID_STATUSES:
        raise HTTPException(
            400,
            f"Invalid status '{status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )
    _store[entry_id]["status"] = status
    if status == "applied" and not _store[entry_id].get("applied_at"):
        from datetime import datetime, timezone
        _store[entry_id]["applied_at"] = datetime.now(timezone.utc).isoformat()
    return {"success": True, "entry": _store[entry_id]}


@router.delete("/{entry_id}")
async def delete_application(entry_id: str):
    """Remove an application from the tracker."""
    if entry_id not in _store:
        raise HTTPException(404, f"Application '{entry_id}' not found")
    del _store[entry_id]
    return {"success": True, "message": f"Application {entry_id} deleted"}
