"""Task repository — async CRUD and status management for tasks table."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.models.task import Task


class TaskRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(
        self,
        status: str | None = None,
        priority: str | None = None,
        project_id: str | None = None,
    ) -> list[Task]:
        query = select(Task)
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if project_id:
            query = query.where(Task.project_id == project_id)

        query = query.order_by(Task.seq.asc().nullslast(), Task.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, task_id: str) -> Task | None:
        return await self.session.get(Task, task_id)

    async def create(self, task: Task) -> Task:
        self.session.add(task)
        await self.session.flush()
        return task

    async def update_status(self, task_id: str, new_status: str) -> Task | None:
        task = await self.get_by_id(task_id)
        if not task:
            return None
        task.status = new_status
        await self.session.flush()
        return task

    async def update(self, task_id: str, **kwargs: Any) -> Task | None:
        task = await self.get_by_id(task_id)
        if not task:
            return None
        for key, val in kwargs.items():
            if hasattr(task, key) and val is not None:
                setattr(task, key, val)
        await self.session.flush()
        return task

    async def delete(self, task_id: str) -> bool:
        task = await self.get_by_id(task_id)
        if not task:
            return False
        await self.session.delete(task)
        await self.session.flush()
        return True