"""EngineeringTemplate repository — async CRUD for factory templates."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.template import EngineeringTemplate


class TemplateRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[EngineeringTemplate]:
        result = await self.session.execute(
            select(EngineeringTemplate).order_by(EngineeringTemplate.sort_order)
        )
        return list(result.scalars().all())

    async def get_by_id(self, template_id: str) -> EngineeringTemplate | None:
        return await self.session.get(EngineeringTemplate, template_id)

    async def create(self, template: EngineeringTemplate) -> EngineeringTemplate:
        self.session.add(template)
        await self.session.flush()
        return template