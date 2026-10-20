"""Idempotent seed — 6 esteiras canônicas (delega a factory.esteiras)."""
import asyncio
from sqlalchemy import select
from app.shared.database import async_session
from app.models.template import EngineeringTemplate
from app.modules.factory.esteiras import ESTEIRAS


async def seed_factory():
    async with async_session() as session:
        for t_id, esteira in ESTEIRAS.items():
            existing = await session.get(EngineeringTemplate, t_id)
            if existing:
                existing.name = esteira["name"]
                existing.description = esteira["description"]
                existing.mesas = esteira["mesas"]
                existing.stages = esteira["stages"]
                existing.owner_role = esteira["owner_role"]
                existing.sort_order = esteira["sort_order"]
                continue
            session.add(
                EngineeringTemplate(
                    id=t_id,
                    name=esteira["name"],
                    category=esteira["category"],
                    mode=esteira["mode"],
                    description=esteira["description"],
                    mesas=esteira["mesas"],
                    stages=esteira["stages"],
                    owner_role=esteira["owner_role"],
                    gate_required=True,
                    sort_order=esteira["sort_order"],
                )
            )
        await session.commit()
        result = await session.execute(select(EngineeringTemplate))
        print(f"Seeded/updated {len(list(result.scalars().all()))} engineering templates")


if __name__ == "__main__":
    asyncio.run(seed_factory())
