"""Jobs API router — create, status and SSE events for job lifecycle."""
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime
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
    model_name: str | None = None
    effort: str | None = None
    model_provider: str | None = None

    model_config = {"protected_namespaces": ()}


class JobResponse(BaseModel):
    id: str
    task_id: str | None = None
    project_id: str | None = None
    agent_id: str | None = None
    origin: str
    model_provider: str | None = None
    model_name: str | None = None
    effort: str | None = None
    status: str
    workspace_path: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}


_background_job_tasks: set[asyncio.Task] = set()


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(req: CreateJobRequest, session: AsyncSession = Depends(get_session)):
    runner = JobRunner(session)
    job = await runner.create_job(
        task_id=req.task_id,
        project_id=req.project_id,
        agent_id=req.agent_id,
        command=req.command,
        model_name=req.model_name,
        effort=req.effort,
        model_provider=req.model_provider,
    )
    if req.task_id:
        from app.models.task import Task
        from datetime import timezone
        task = await session.get(Task, req.task_id)
        if task:
            task.active_job_id = job.id
            task.status = "in_progress"
            task.updated_at = datetime.now(timezone.utc)
            session.add(task)

    await session.commit()
    await session.refresh(job)

    # Fire-and-forget execution in background with strong reference to prevent GC cancellation
    t = asyncio.create_task(_run_job_background(job.id, req.command, req.timeout))
    _background_job_tasks.add(t)
    t.add_done_callback(_background_job_tasks.discard)
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
        seen_event_ids: set[str] = set()
        while True:
            async with async_session() as session:
                repo = JobRepository(session)
                # Verify job exists
                job = await repo.get_by_id(job_id)
                if not job:
                    yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                    break

                events = await repo.list_events(job_id)
                for event in events:
                    if event.id in seen_event_ids:
                        continue
                    seen_event_ids.add(event.id)
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

                # If job reached terminal state, stop streaming after emitting all events
                if job.status in ("succeeded", "failed"):
                    break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(job_id: str, session: AsyncSession = Depends(get_session)):
    runner = JobRunner(session)
    try:
        job = await runner.retry_job(job_id)
        await session.commit()
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: str, session: AsyncSession = Depends(get_session)):
    runner = JobRunner(session)
    try:
        job = await runner.cancel_job(job_id)
        await session.commit()
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


async def _run_job_background(job_id: str, command: str, timeout: int):
    """Background task to execute a job outside the request lifecycle."""
    async with async_session() as session:
        runner = JobRunner(session)
        try:
            await runner.run(job_id, command, timeout=timeout)
            await session.commit()
        except BaseException as e:
            await session.rollback()
            # Log but don't crash the background task
            print(f"[JobRunner] Background error for {job_id}: {e}")
            print(f"[JobRunner] Background error for {job_id}: {e}")