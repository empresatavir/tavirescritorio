"""Proposal repository — async CRUD, alterations and electronic agreement management."""
from datetime import datetime
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.models.proposal import Proposal


class ProposalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(
        self,
        stage: str | None = None,
        search: str | None = None,
    ) -> list[Proposal]:
        query = select(Proposal)
        if stage:
            query = query.where(Proposal.stage == stage)
        if search:
            q_like = f"%{search}%"
            query = query.where(
                or_(
                    Proposal.num.ilike(q_like),
                    Proposal.client.ilike(q_like),
                    Proposal.status.ilike(q_like),
                )
            )

        query = query.order_by(Proposal.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, proposal_id: str) -> Proposal | None:
        return await self.session.get(Proposal, proposal_id)

    async def get_by_num(self, num: str) -> Proposal | None:
        query = select(Proposal).where(Proposal.num == num)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_next_num(self) -> str:
        query = select(Proposal.num).where(Proposal.num.like("PRO-%")).order_by(Proposal.num.desc())
        result = await self.session.execute(query)
        latest = result.scalars().first()
        if not latest:
            return "PRO-001"
        try:
            num_part = int(latest.replace("PRO-", ""))
            return f"PRO-{(num_part + 1):03d}"
        except Exception:
            count = (await self.session.execute(select(func.count(Proposal.id)))).scalar() or 0
            return f"PRO-{(count + 1):03d}"

    async def create(self, proposal: Proposal) -> Proposal:
        if not proposal.id:
            proposal.id = f"prop-{uuid.uuid4().hex[:8]}"
        if not proposal.num:
            proposal.num = await self.get_next_num()
        self.session.add(proposal)
        await self.session.flush()
        return proposal

    async def update(self, proposal_id: str, **kwargs: Any) -> Proposal | None:
        proposal = await self.get_by_id(proposal_id)
        if not proposal:
            return None
        for key, val in kwargs.items():
            if hasattr(proposal, key) and val is not None:
                setattr(proposal, key, val)
        await self.session.flush()
        return proposal

    async def add_change(
        self,
        proposal_id: str,
        target: str,
        agent: str,
        text: str,
    ) -> Proposal | None:
        proposal = await self.get_by_id(proposal_id)
        if not proposal:
            return None

        now = datetime.now()
        time_str = now.strftime("%d/%m %H:%M")

        new_change = {
            "at": time_str,
            "target": target,
            "agent": agent,
            "text": text,
            "status": "Com o agente",
        }

        changes = list(proposal.changes or [])
        changes.insert(0, new_change)
        proposal.changes = changes

        timeline = list(proposal.timeline or [])
        timeline.insert(0, [time_str, "Você", f"Alteração de {target.lower()} solicitada"])
        proposal.timeline = timeline

        # Atualiza status e estágio para indicar trabalho em andamento
        proposal.stage = "progress"
        proposal.status = f"Ajustando {target.lower()} com {agent}"
        proposal.tone = "work"

        await self.session.flush()
        return proposal

    async def record_send(
        self,
        proposal_id: str,
        sent_to: str,
        custom_link: str | None = None,
    ) -> Proposal | None:
        proposal = await self.get_by_id(proposal_id)
        if not proposal:
            return None

        now = datetime.now()
        time_str = now.strftime("%d/%m %H:%M")
        token = custom_link or f"{proposal.num}-v{proposal.version}-{uuid.uuid4().hex[:6]}"

        send_info = {
            "link": token,
            "sentTo": sent_to,
            "sentAt": time_str,
            "opened": "0 vezes",
            "accept": ["pending"],
        }
        proposal.send_info = send_info

        timeline = list(proposal.timeline or [])
        timeline.insert(0, [time_str, "Comercial", f"Proposta enviada para {sent_to}"])
        proposal.timeline = timeline

        proposal.stage = "pending"
        proposal.status = "Enviada · aguardando resposta do cliente"
        proposal.tone = "wait"

        await self.session.flush()
        return proposal

    async def accept_and_sign(
        self,
        proposal_id: str,
        signer_name: str,
    ) -> Proposal | None:
        proposal = await self.get_by_id(proposal_id)
        if not proposal:
            return None

        now = datetime.now()
        time_str = now.strftime("%d/%m %H:%M")

        # Atualiza send_info
        send_info = dict(proposal.send_info or {})
        send_info["accept"] = ["signed", signer_name, time_str]
        proposal.send_info = send_info

        # Timeline
        timeline = list(proposal.timeline or [])
        timeline.insert(0, [time_str, signer_name, "Aceite eletrônico registrado"])
        timeline.insert(0, [time_str, "CEO", "Contra-assinatura confirmada no painel"])
        proposal.timeline = timeline

        proposal.stage = "done"
        proposal.status = "Aceita e contra-assinada"
        proposal.tone = "ok"

        await self.session.flush()
        return proposal

    async def delete(self, proposal_id: str) -> bool:
        proposal = await self.get_by_id(proposal_id)
        if not proposal:
            return False
        await self.session.delete(proposal)
        await self.session.flush()
        return True
