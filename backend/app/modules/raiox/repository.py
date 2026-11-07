from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.raiox_case import RaioxCase
from app.models.raiox_evidence import RaioxEvidence


class RaioxRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_cases(self) -> list[RaioxCase]:
        result = await self.session.execute(
            select(RaioxCase).order_by(RaioxCase.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_case(self, case_id: str) -> RaioxCase | None:
        return await self.session.get(RaioxCase, case_id)

    async def add_case(self, case: RaioxCase) -> RaioxCase:
        self.session.add(case)
        await self.session.flush()
        await self.session.refresh(case)
        return case

    async def list_evidence(self, case_id: str) -> list[RaioxEvidence]:
        result = await self.session.execute(
            select(RaioxEvidence)
            .where(RaioxEvidence.case_id == case_id)
            .order_by(RaioxEvidence.created_at.asc())
        )
        return list(result.scalars().all())

    async def add_evidence(self, item: RaioxEvidence) -> RaioxEvidence:
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def get_evidence(self, evidence_id: str) -> RaioxEvidence | None:
        return await self.session.get(RaioxEvidence, evidence_id)

    async def delete_evidence(self, item: RaioxEvidence) -> None:
        await self.session.delete(item)
        await self.session.flush()
