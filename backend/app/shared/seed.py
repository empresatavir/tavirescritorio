"""Idempotent seed script for TAVIR initial data."""
import asyncio
import uuid
from sqlalchemy import select
from app.shared.database import async_session
from app.models.agent import Agent
from app.models.project import Project
from app.models.task import Task

ROSTER_AGENTS = [
    ("ag-01", "Arquiteto", "Planejamento Estratégico", "Estratégia", "busy", "planejamento,estrategia,roadmaps", "claude-sonnet-4"),
    ("ag-02", "Pesquisador", "Coleta & Análise", "Conhecimento", "active", "pesquisa,vault,embeddings", "gpt-4o"),
    ("ag-03", "Redator", "Copywriting & Conteúdo", "Conteúdo", "busy", "copywriting,conteudo,headlines", "claude-sonnet-4"),
    ("ag-04", "Designer", "Design Visual", "Design", "active", "ui,design-tokens,figma", "dall-e-3"),
    ("ag-05", "Revisor", "QA & Aprovação", "Qualidade", "busy", "qa,revisao,gates", "claude-sonnet-4"),
    ("ag-06", "Deployer", "Publicação & Release", "Engenharia", "offline", "deploy,vercel,git", "gpt-4o"),
    ("ag-07", "Analista", "Métricas & Analytics", "Estratégia", "active", "telemetria,custos,sparklines", "gpt-4o"),
    ("ag-08", "Orquestrador", "Coordenação de Agentes", "Operação", "busy", "orquestracao,heartbeat,jobs", "claude-opus-4"),
    ("ag-09", "Social Media", "Instagram & LinkedIn", "Social", "active", "instagram,linkedin,cadencia", "gpt-4o"),
    ("ag-10", "Finanças", "Controle Orçamentário", "Finanças", "error", "orcamento,faturas,conciliacao", "gpt-4o"),
    ("ag-11", "Comercial", "Propostas & Funil", "Comercial", "active", "funil,propostas,vendas", "claude-sonnet-4"),
    ("ag-12", "Documentador", "Docs & Manuais", "Documentação", "busy", "openapi,manuais,docs", "claude-sonnet-4"),
]

async def seed():
    async with async_session() as session:
        # Seed agents
        for ag_id, name, role, sector, status, skills, model in ROSTER_AGENTS:
            existing = await session.execute(select(Agent).where(Agent.name == name))
            if not existing.scalars().first():
                session.add(
                    Agent(
                        id=ag_id,
                        name=name,
                        role=role,
                        sector=sector,
                        status=status,
                        skills=skills,
                        model_provider=model,
                    )
                )
        await session.commit()

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