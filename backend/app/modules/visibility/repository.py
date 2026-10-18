"""Visibility & Knowledge repository — async CRUD for workflows, ideas, integrations, knowledge."""
from datetime import datetime
from sqlalchemy import select, or_, and_, text
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
            select(IntegrationCheck).order_by(IntegrationCheck.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, check_id: str) -> IntegrationCheck | None:
        return await self.session.get(IntegrationCheck, check_id)

    async def get_by_name(self, name: str) -> IntegrationCheck | None:
        stmt = select(IntegrationCheck).where(IntegrationCheck.integration_name == name).limit(1)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def update_check(
        self,
        check_id: str,
        status: str,
        response_time_ms: int | None = None,
        error_message: str | None = None,
    ) -> IntegrationCheck | None:
        check = await self.get_by_id(check_id)
        if not check:
            return None
        check.status = status
        check.response_time_ms = response_time_ms
        check.error_message = error_message
        check.last_checked_at = datetime.utcnow()
        await self.session.flush()
        return check

    async def create(self, check: IntegrationCheck) -> IntegrationCheck:
        self.session.add(check)
        await self.session.flush()
        return check


class KnowledgeEntryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self, limit: int = 200, offset: int = 0) -> list[KnowledgeEntry]:
        result = await self.session.execute(
            select(KnowledgeEntry)
            .order_by(KnowledgeEntry.title.asc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_id(self, entry_id: str) -> KnowledgeEntry | None:
        return await self.session.get(KnowledgeEntry, entry_id)

    async def search(
        self,
        query: str | None = None,
        domain: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[KnowledgeEntry]:
        stmt = select(KnowledgeEntry)
        clauses = []

        if query:
            q_clean = query.strip()
            clauses.append(
                or_(
                    KnowledgeEntry.title.ilike(f"%{q_clean}%"),
                    KnowledgeEntry.content.ilike(f"%{q_clean}%"),
                    KnowledgeEntry.source_path.ilike(f"%{q_clean}%"),
                )
            )

        if domain and domain.lower() != "todos":
            dom_pattern = f'%"{domain.lower()}"%'
            clauses.append(
                or_(
                    KnowledgeEntry.source_path.ilike(f"%/{domain.lower()}/%"),
                    KnowledgeEntry.source_path.ilike(f"%\\{domain.lower()}\\%"),
                    text("LOWER(json_extract(metadata, '$.domain')) = :dom").bindparams(dom=domain.lower()),
                )
            )

        if clauses:
            stmt = stmt.where(and_(*clauses))

        stmt = stmt.order_by(KnowledgeEntry.title.asc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, entry: KnowledgeEntry) -> KnowledgeEntry:
        self.session.add(entry)
        await self.session.flush()
        return entry