"""Idempotent seed script for TAVIR initial data."""
import asyncio
import uuid
from sqlalchemy import select
from app.shared.database import async_session
from app.models.agent import Agent
from app.models.project import Project
from app.models.task import Task


async def seed():
    async with async_session() as session:
        # Seed agents if empty
        result = await session.execute(select(Agent).limit(1))
        if not result.scalars().first():
            agents = [
                Agent(
                    id=str(uuid.uuid4()),
                    name="Atlas",
                    role="Engenheiro de Software",
                    sector="Engenharia",
                    status="active",
                    skills="python,fastapi,sqlalchemy",
                    model_provider="anthropic",
                ),
                Agent(
                    id=str(uuid.uuid4()),
                    name="Luna",
                    role="Designer de Produto",
                    sector="Design",
                    status="active",
                    skills="solidjs,css,design-system",
                    model_provider="anthropic",
                ),
            ]
            session.add_all(agents)
            print(f"Seeded {len(agents)} agents")
        else:
            print("Agents already seeded, skipping")

        # Seed project if empty
        result = await session.execute(select(Project).limit(1))
        if not result.scalars().first():
            project = Project(
                id=str(uuid.uuid4()),
                slug="tavir-escritorio",
                name="TAVIR Escritório",
                client="TAVIR",
                status="active",
                description="Painel operacional local single-user",
            )
            session.add(project)
            print("Seeded 1 project")
        else:
            print("Projects already seeded, skipping")

        # Seed task if empty
        result = await session.execute(select(Task).limit(1))
        if not result.scalars().first():
            proj_result = await session.execute(select(Project).limit(1))
            project = proj_result.scalars().first()
            if project:
                task = Task(
                    id=str(uuid.uuid4()),
                    project_id=project.id,
                    title="Validar ciclo de job mínimo",
                    description="Implementar e testar o fluxo queued→running→succeeded",
                    status="pending",
                    priority="high",
                    sector="Engenharia",
                )
                session.add(task)
                print("Seeded 1 task")
        else:
            print("Tasks already seeded, skipping")

        await session.commit()
        print("Seed completed successfully")


if __name__ == "__main__":
    asyncio.run(seed())