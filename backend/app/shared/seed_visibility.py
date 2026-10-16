"""Idempotent seed script for Visibility & Knowledge modules (G8)."""
import asyncio
import uuid
from sqlalchemy import select, text
from app.shared.database import async_session
from app.models.workflow import Workflow
from app.models.idea import Idea
from app.models.integration_check import IntegrationCheck
from app.models.knowledge_entry import KnowledgeEntry

WORKFLOWS = [
    {
        "name": "Onboarding de Cliente",
        "category": "comercial",
        "description": "Fluxo completo de integração de novos clientes ao TAVIR",
        "steps": [
            {"name": "Briefing Inicial", "owner": "account_manager"},
            {"name": "Configuração de Ambiente", "owner": "devops"},
            {"name": "Treinamento Básico", "owner": "customer_success"},
            {"name": "Ativação", "owner": "account_manager"},
        ],
        "trigger_type": "manual",
        "sort_order": 1,
    },
    {
        "name": "Pipeline Editorial Mensal",
        "category": "editorial",
        "description": "Planejamento e execução do calendário editorial mensal",
        "steps": [
            {"name": "Pauta", "owner": "editor"},
            {"name": "Produção", "owner": "writer"},
            {"name": "Revisão", "owner": "reviewer"},
            {"name": "Publicação", "owner": "publisher"},
        ],
        "trigger_type": "scheduled",
        "sort_order": 2,
    },
    {
        "name": "Suporte Nível 1",
        "category": "suporte",
        "description": "Triagem e resolução inicial de tickets de suporte",
        "steps": [
            {"name": "Triagem", "owner": "support_l1"},
            {"name": "Resolução ou Escalonamento", "owner": "support_l1"},
        ],
        "trigger_type": "event",
        "sort_order": 3,
    },
]


async def seed_visibility():
    async with async_session() as session:
        # Seed workflows if empty
        result = await session.execute(select(Workflow).limit(1))
        if not result.scalars().first():
            workflows = []
            for w in WORKFLOWS:
                workflow = Workflow(
                    id=str(uuid.uuid4()),
                    name=w["name"],
                    category=w["category"],
                    description=w["description"],
                    steps=w["steps"],
                    trigger_type=w["trigger_type"],
                    sort_order=w["sort_order"],
                )
                workflows.append(workflow)
            session.add_all(workflows)
            print(f"Seeded {len(workflows)} workflows")
        else:
            print("Workflows already seeded, skipping")

        # Seed ideas if empty
        result = await session.execute(select(Idea).limit(1))
        if not result.scalars().first():
            proj_result = await session.execute(text("SELECT id FROM projects LIMIT 1"))
            proj_row = proj_result.fetchone()
            idea = Idea(
                id=str(uuid.uuid4()),
                title="Integração com HubSpot para pipeline comercial",
                description="Conectar CRM externo ao módulo Comercial do TAVIR",
                source="brainstorm_q3",
                priority="high",
                project_id=proj_row[0] if proj_row else None,
            )
            session.add(idea)
            print("Seeded 1 idea")
        else:
            print("Ideas already seeded, skipping")

        # Seed integration checks if empty
        result = await session.execute(select(IntegrationCheck).limit(1))
        if not result.scalars().first():
            checks = [
                IntegrationCheck(
                    id=str(uuid.uuid4()),
                    integration_name="Sincron Brain MCP",
                    status="healthy",
                    response_time_ms=45,
                ),
                IntegrationCheck(
                    id=str(uuid.uuid4()),
                    integration_name="Supabase (Propostas)",
                    status="pending",
                    error_message="Contrato não configurado (D5 adapter mock)",
                ),
            ]
            session.add_all(checks)
            print(f"Seeded {len(checks)} integration checks")
        else:
            print("Integration checks already seeded, skipping")

        # Seed knowledge entries if empty
        result = await session.execute(select(KnowledgeEntry).limit(1))
        if not result.scalars().first():
            entries = [
                KnowledgeEntry(
                    id=str(uuid.uuid4()),
                    title="Guia de Onboarding de Agentes",
                    content="Passo a passo para configurar novos agentes no roster TAVIR",
                    source_type="vault",
                    source_path="absorcao-conteudo/agentes/onboarding.md",
                    tags=["agentes", "onboarding", "guia"],
                ),
                KnowledgeEntry(
                    id=str(uuid.uuid4()),
                    title="Especificação do Ciclo de Job",
                    content="Contrato completo de estados e transições do job runner",
                    source_type="artifact",
                    source_path="docs/planning/CHECKPOINT-TAVIR.md",
                    tags=["job", "ciclo", "especificação"],
                ),
            ]
            session.add_all(entries)
            print(f"Seeded {len(entries)} knowledge entries")
        else:
            print("Knowledge entries already seeded, skipping")

        await session.commit()
        print("Visibility seed completed successfully")


if __name__ == "__main__":
    asyncio.run(seed_visibility())