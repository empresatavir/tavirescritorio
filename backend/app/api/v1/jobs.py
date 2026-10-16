"""Jobs API router — create, status and SSE events for job lifecycle."""
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database import get_session, async_session
from app.modules.jobs.repository import JobRepository
from app.modules.jobs.runner import JobRunner

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


class CreateJobRequest(BaseModel):
    task_id: str | None = None
    project_id: str | None = None
    agent_id: str | None = None
    command: str = "echo hello"
    timeout: int = 30


class JobResponse(BaseModel):
    id: str
    task_id: str | None = None
    project_id: str | None = None
    agent_id: str | None = None
    origin: str
    status: str
    workspace_path: str | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(req: CreateJobRequest, session: AsyncSession = Depends(get_session)):
    runner = JobRunner(session)
    job = await runner.create_job(
        task_id=req.task_id,
        project_id=req.project_id,
        agent_id=req.agent_id,
        command=req.command,
    )
    await session.commit()
    # Fire-and-forget execution in background
    asyncio.create_task(_run_job_background(job.id, req.command, req.timeout))
    return job


@router.get("/", response_model=list[JobResponse])
async def list_jobs(session: AsyncSession = Depends(get_session)):
    repo = JobRepository(session)
    return await repo.list_all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, session: AsyncSession = Depends(get_session)):
    repo = JobRepository(session)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@router.get("/{job_id}/events")
async def stream_events(job_id: str):
    """SSE endpoint streaming job events with cursor-based reconnection."""

    async def event_generator():
        last_event_id: str | None = None
        while True:
            async with async_session() as session:
                repo = JobRepository(session)
                # Verify job exists
                job = await repo.get_by_id(job_id)
                if not job:
                    yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                    break

                events = await repo.list_events(job_id, after_event_id=last_event_id)
                for event in events:
                    data = {
                        "id": event.id,
                        "event_type": event.event_type,
                        "previous_state": event.previous_state,
                        "new_state": event.new_state,
                        "actor": event.actor,
                        "action": event.action,
                        "details": event.details,
                        "created_at": str(event.created_at),
                    }
                    yield f"id: {event.id}\ndata: {json.dumps(data)}\n\n"
                    last_event_id = event.id

                # If job reached terminal state, stop streaming
                if job.status in ("succeeded", "failed"):
                    break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


async def _run_job_background(job_id: str, command: str, timeout: int):
    """Background task to execute a job outside the request lifecycle."""
    async with async_session() as session:
        runner = JobRunner(session)
        try:
            await runner.run(job_id, command, timeout=timeout)
            await session.commit()
        except Exception as e:
            await session.rollback()
            # Log but don't crash the background task
            print(f"[JobRunner] Background error for {job_id}: {e}")