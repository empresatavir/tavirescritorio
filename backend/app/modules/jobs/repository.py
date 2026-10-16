"""Job repository — async CRUD for jobs table."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.job import Job
from app.models.event import Event


class JobRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, job_id: str) -> Job | None:
        return await self.session.get(Job, job_id)

    async def create(self, job: Job) -> Job:
        self.session.add(job)
        await self.session.flush()
        return job

    async def list_events(self, job_id: str, after_event_id: str | None = None) -> list[Event]:
        stmt = select(Event).where(Event.job_id == job_id).order_by(Event.created_at)
        if after_event_id:
            # Simple cursor: get events created after the cursor event
            cursor_event = await self.session.get(Event, after_event_id)
            if cursor_event:
                stmt = stmt.where(Event.created_at > cursor_event.created_at)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_all(self, limit: int = 50) -> list[Job]:
        stmt = select(Job).order_by(Job.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())