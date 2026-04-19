import json
import asyncio
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from models import SearchRequest
from agents.recruiter import search_and_rank_jobs

router = APIRouter()


@router.post("/search")
async def search_jobs(request: Request, body: SearchRequest):
    """Search and rank jobs using real JSearch + LinkedIn APIs."""
    try:
        jobs = await search_and_rank_jobs(
            cv_text=body.cv_text,
            location=body.location,
            job_type=body.job_type,
            target_roles=body.target_roles,
            key_skills=body.key_skills,
            salary=body.salary_expectation,
            search_source=body.search_source,
        )
        return {"success": True, "jobs": jobs, "total": len(jobs)}
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Job search failed: {str(e)}")


@router.post("/search/stream")
async def search_jobs_stream(body: SearchRequest):
    """
    SSE endpoint — streams agent status updates to the frontend.
    Use this for real-time progress indication during the agentic search loop.
    """

    async def event_generator():
        async def send(event: str, data: dict):
            yield f"event: {event}\ndata: {json.dumps(data)}\n\n"

        try:
            async for chunk in send("status", {"message": f"🔍 Searching for jobs in {body.location}..."}):
                yield chunk
            await asyncio.sleep(0.1)

            async for chunk in send("status", {"message": "🤖 Agent querying JSearch & LinkedIn APIs..."}):
                yield chunk
            await asyncio.sleep(0.1)

            jobs = await search_and_rank_jobs(
                cv_text=body.cv_text,
                location=body.location,
                job_type=body.job_type,
                target_roles=body.target_roles,
                key_skills=body.key_skills,
                salary=body.salary_expectation,
                search_source=body.search_source,
            )

            async for chunk in send("status", {"message": f"✅ Found {len(jobs)} matches. Ranking by fit..."}):
                yield chunk
            await asyncio.sleep(0.1)

            async for chunk in send("results", {"jobs": jobs, "total": len(jobs)}):
                yield chunk

            async for chunk in send("done", {"message": "Search complete"}):
                yield chunk

        except Exception as e:
            async for chunk in send("error", {"message": str(e)}):
                yield chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")
