"""Project repository — async CRUD for projects table."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Project


class ProjectRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Project]:
        result = await self.session.execute(select(Project).order_by(Project.name))
        return list(result.scalars().all())

    async def get_by_id(self, project_id: str) -> Project | None:
        return await self.session.get(Project, project_id)

    async def create(self, project: Project) -> Project:
        self.session.add(project)
        await self.session.flush()
        return project