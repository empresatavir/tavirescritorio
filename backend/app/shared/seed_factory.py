"""Idempotent seed script for the 6 engineering templates (Fábrica)."""
import asyncio
import uuid
from sqlalchemy import select
from app.shared.database import async_session
from app.models.template import EngineeringTemplate

TEMPLATES = [
    {
        "name": "LP Criação",
        "category": "lp",
        "mode": "criacao",
        "description": "Template completo para criação de Landing Pages do zero",
        "stages": [
            {"name": "Briefing", "owner": "product", "gate": False},
            {"name": "Copywriting", "owner": "copywriter", "gate": False},
            {"name": "Design", "owner": "designer", "gate": True},
            {"name": "Desenvolvimento", "owner": "developer", "gate": False},
            {"name": "QA", "owner": "qa", "gate": True},
            {"name": "Deploy", "owner": "devops", "gate": True},
        ],
        "owner_role": "product_manager",
        "default_commands": {"build": "echo build-lp", "test": "echo test-lp"},
        "gate_required": True,
        "sort_order": 1,
    },
    {
        "name": "LP Manutenção",
        "category": "lp",
        "mode": "manutencao",
        "description": "Template para manutenção e otimização de Landing Pages existentes",
        "stages": [
            {"name": "Diagnóstico", "owner": "analyst", "gate": False},
            {"name": "Implementação", "owner": "developer", "gate": False},
            {"name": "Testes", "owner": "qa", "gate": True},
            {"name": "Deploy", "owner": "devops", "gate": True},
        ],
        "owner_role": "developer",
        "default_commands": {"build": "echo maintain-lp", "test": "echo test-lp-maint"},
        "gate_required": True,
        "sort_order": 2,
    },
    {
        "name": "Oferta Criação",
        "category": "oferta",
        "mode": "criacao",
        "description": "Template para criação de páginas de oferta e vendas",
        "stages": [
            {"name": "Estratégia", "owner": "marketer", "gate": False},
            {"name": "Copy", "owner": "copywriter", "gate": True},
            {"name": "Design", "owner": "designer", "gate": False},
            {"name": "Implementação", "owner": "developer", "gate": False},
            {"name": "Revisão", "owner": "reviewer", "gate": True},
        ],
        "owner_role": "marketer",
        "default_commands": {"build": "echo build-oferta", "test": "echo test-oferta"},
        "gate_required": True,
        "sort_order": 3,
    },
    {
        "name": "Oferta Manutenção",
        "category": "oferta",
        "mode": "manutencao",
        "description": "Template para ajustes e melhorias em ofertas ativas",
        "stages": [
            {"name": "Análise", "owner": "analyst", "gate": False},
            {"name": "Ajuste", "owner": "developer", "gate": False},
            {"name": "Validação", "owner": "qa", "gate": True},
        ],
        "owner_role": "developer",
        "default_commands": {"build": "echo maintain-oferta", "test": "echo test-oferta-maint"},
        "gate_required": False,
        "sort_order": 4,
    },
    {
        "name": "Sistemas Criação",
        "category": "sistemas",
        "mode": "criacao",
        "description": "Template para desenvolvimento de sistemas e aplicações web completas",
        "stages": [
            {"name": "Arquitetura", "owner": "architect", "gate": True},
            {"name": "Backend", "owner": "backend_dev", "gate": False},
            {"name": "Frontend", "owner": "frontend_dev", "gate": False},
            {"name": "Integração", "owner": "integrator", "gate": False},
            {"name": "QA Completo", "owner": "qa_lead", "gate": True},
            {"name": "Staging", "owner": "devops", "gate": True},
            {"name": "Produção", "owner": "devops", "gate": True},
        ],
        "owner_role": "tech_lead",
        "default_commands": {"build": "echo build-sistema", "test": "echo test-sistema"},
        "gate_required": True,
        "sort_order": 5,
    },
    {
        "name": "Sistemas Manutenção",
        "category": "sistemas",
        "mode": "manutencao",
        "description": "Template para manutenção evolutiva e corretiva de sistemas",
        "stages": [
            {"name": "Triagem", "owner": "support", "gate": False},
            {"name": "Desenvolvimento", "owner": "developer", "gate": False},
            {"name": "Testes Regressivos", "owner": "qa", "gate": True},
            {"name": "Deploy", "owner": "devops", "gate": True},
        ],
        "owner_role": "developer",
        "default_commands": {"build": "echo maintain-sistema", "test": "echo test-sistema-maint"},
        "gate_required": True,
        "sort_order": 6,
    },
]


async def seed_factory():
    async with async_session() as session:
        result = await session.execute(select(EngineeringTemplate).limit(1))
        if result.scalars().first():
            print("Engineering templates already seeded, skipping")
            return

        templates = []
        for t in TEMPLATES:
            template = EngineeringTemplate(
                id=str(uuid.uuid4()),
                name=t["name"],
                category=t["category"],
                mode=t["mode"],
                description=t["description"],
                stages=t["stages"],
                owner_role=t["owner_role"],
                default_commands=t["default_commands"],
                gate_required=t["gate_required"],
                sort_order=t["sort_order"],
            )
            templates.append(template)

        session.add_all(templates)
        await session.commit()
        print(f"Seeded {len(templates)} engineering templates")


if __name__ == "__main__":
    asyncio.run(seed_factory())