"""Visibility & Knowledge repository — async CRUD for workflows, ideas, integrations, knowledge."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.workflow import Workflow
from app.models.idea import Idea
from app.models.integration_check import IntegrationCheck
from app.models.knowledge_entry import KnowledgeEntry


class WorkflowRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Workflow]:
        result = await self.session.execute(
            select(Workflow).order_by(Workflow.sort_order)
        )
        return list(result.scalars().all())

    async def get_by_id(self, workflow_id: str) -> Workflow | None:
        return await self.session.get(Workflow, workflow_id)

    async def create(self, workflow: Workflow) -> Workflow:
        self.session.add(workflow)
        await self.session.flush()
        return workflow


class IdeaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Idea]:
        result = await self.session.execute(
            select(Idea).order_by(Idea.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, idea_id: str) -> Idea | None:
        return await self.session.get(Idea, idea_id)

    async def create(self, idea: Idea) -> Idea:
        self.session.add(idea)
        await self.session.flush()
        return idea


class IntegrationCheckRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[IntegrationCheck]:
        result = await self.session.execute(
            select(IntegrationCheck).order_by(IntegrationCheck.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, check: IntegrationCheck) -> IntegrationCheck:
        self.session.add(check)
        await self.session.flush()
        return check


class KnowledgeEntryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[KnowledgeEntry]:
        result = await self.session.execute(
            select(KnowledgeEntry).order_by(KnowledgeEntry.created_at.desc())
        )
        return list(result.scalars().all())

    async def search(self, query: str) -> list[KnowledgeEntry]:
        stmt = select(KnowledgeEntry).where(
            KnowledgeEntry.title.ilike(f"%{query}%")
            | KnowledgeEntry.content.ilike(f"%{query}%")
        ).order_by(KnowledgeEntry.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, entry: KnowledgeEntry) -> KnowledgeEntry:
        self.session.add(entry)
        await self.session.flush()
        return entry