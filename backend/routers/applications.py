import asyncio
from fastapi import APIRouter, HTTPException
from models import ApplicationRequest
from agents.recruiter import draft_application

router = APIRouter()


@router.post("/draft")
async def draft_applications(body: ApplicationRequest):
    """
    Draft tailored cover letters + emails for all selected jobs.
    Runs all drafts concurrently for speed.
    """
    if not body.jobs:
        raise HTTPException(400, "No jobs provided")

    async def safe_draft(job):
        try:
            return await draft_application(cv_text=body.cv_text, job=job.model_dump())
        except Exception as e:
            return {"job_id": job.id, "error": str(e)}

    # Run all drafts concurrently
    results = await asyncio.gather(*[safe_draft(job) for job in body.jobs])

    drafts = [r for r in results if "error" not in r]
    errors = [r for r in results if "error" in r]

    return {
        "success": True,
        "drafts": drafts,
        "errors": errors,
        "total": len(drafts),
    }
