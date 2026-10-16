"""Task repository — async CRUD for tasks table."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.task import Task


class TaskRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Task]:
        result = await self.session.execute(select(Task).order_by(Task.created_at.desc()))
        return list(result.scalars().all())

    async def get_by_id(self, task_id: str) -> Task | None:
        return await self.session.get(Task, task_id)

    async def create(self, task: Task) -> Task:
        self.session.add(task)
        await self.session.flush()
        return task