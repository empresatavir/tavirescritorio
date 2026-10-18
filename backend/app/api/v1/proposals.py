"""Proposals API router — commercial pipeline and electronic agreements."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import uuid

from app.shared.database import get_session
from app.modules.commercial.repository import ProposalRepository
from app.models.proposal import Proposal

router = APIRouter(prefix="/api/v1/proposals", tags=["proposals"])


# --- Schemas ---

class ProposalItemSchema(BaseModel):
    desc: str
    value: float


class ProposalResponse(BaseModel):
    id: str
    num: str
    client: str
    stage: str
    status: str
    tone: str
    version: int
    value: float | None = None
    validity: str | None = None
    deadline: str | None = None
    task_id: str | None = None
    project_id: str | None = None
    summary: str | None = None
    scope: str | None = None
    items: Any | None = None
    collected: Any | None = None
    changes: Any | None = None
    timeline: Any | None = None
    send_info: Any | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateProposalRequest(BaseModel):
    client: str
    value: float | None = None
    deadline: str = "4 semanas"
    validity: str = "30 dias"
    summary: str | None = None
    scope: str | None = None
    items: list[ProposalItemSchema] | None = None
    collected: list[list[str]] | None = None


class UpdateProposalRequest(BaseModel):
    client: str | None = None
    stage: str | None = None
    status: str | None = None
    tone: str | None = None
    version: int | None = None
    value: float | None = None
    validity: str | None = None
    deadline: str | None = None
    summary: str | None = None
    scope: str | None = None
    items: list[ProposalItemSchema] | None = None


class RequestChangeRequest(BaseModel):
    target: str = "Valores"
    agent: str = "Comercial"
    text: str


class SendProposalRequest(BaseModel):
    sent_to: str
    custom_link: str | None = None


class AcceptProposalRequest(BaseModel):
    signer_name: str = "Cliente Autorizado"


# --- Endpoints ---

@router.get("", response_model=list[ProposalResponse])
@router.get("/", response_model=list[ProposalResponse], include_in_schema=False)
async def list_proposals(
    stage: str | None = Query(None),
    q: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    return await repo.list_all(stage=stage, search=q)


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: str,
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    proposal = await repo.get_by_id(proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    return proposal


@router.post("", response_model=ProposalResponse, status_code=201)
@router.post("/", response_model=ProposalResponse, status_code=201, include_in_schema=False)
async def create_proposal(
    req: CreateProposalRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    next_num = await repo.get_next_num()
    prop_id = f"prop-{uuid.uuid4().hex[:8]}"

    items_data = [item.model_dump() for item in req.items] if req.items else (
        [{"desc": "Pacote de implementação", "value": req.value}] if req.value else []
    )

    collected_data = req.collected or [["Origem", "Criada no painel TAVIR"]]
    timeline_data = [["Hoje", "Você", "Proposta registrada no painel"]]

    proposal = Proposal(
        id=prop_id,
        num=next_num,
        client=req.client.strip(),
        stage="progress",
        status="Coletando informações com o cliente",
        tone="work",
        version=1,
        value=req.value,
        validity=req.validity,
        deadline=req.deadline,
        summary=req.summary or f"Oportunidade aberta para {req.client}.",
        scope=req.scope or "Escopo a ser definido durante o diagnóstico inicial.",
        items=items_data,
        collected=collected_data,
        changes=[],
        timeline=timeline_data,
        send_info=None,
    )

    created = await repo.create(proposal)
    await session.commit()
    await session.refresh(created)
    return created


@router.patch("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: str,
    req: UpdateProposalRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    update_data = req.model_dump(exclude_unset=True)
    if "items" in update_data and update_data["items"] is not None:
        update_data["items"] = [
            i.model_dump() if hasattr(i, "model_dump") else i for i in update_data["items"]
        ]

    updated = await repo.update(proposal_id, **update_data)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.post("/{proposal_id}/changes", response_model=ProposalResponse)
@router.post("/{proposal_id}/change", response_model=ProposalResponse, include_in_schema=False)
async def request_proposal_change(
    proposal_id: str,
    req: RequestChangeRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    updated = await repo.add_change(
        proposal_id,
        target=req.target,
        agent=req.agent,
        text=req.text.strip(),
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.post("/{proposal_id}/send", response_model=ProposalResponse)
async def send_proposal(
    proposal_id: str,
    req: SendProposalRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    updated = await repo.record_send(
        proposal_id,
        sent_to=req.sent_to.strip(),
        custom_link=req.custom_link,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.post("/{proposal_id}/accept", response_model=ProposalResponse)
async def accept_proposal(
    proposal_id: str,
    req: AcceptProposalRequest,
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    updated = await repo.accept_and_sign(
        proposal_id,
        signer_name=req.signer_name.strip(),
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    await session.commit()
    await session.refresh(updated)
    return updated


@router.delete("/{proposal_id}", status_code=204)
async def delete_proposal(
    proposal_id: str,
    session: AsyncSession = Depends(get_session),
):
    repo = ProposalRepository(session)
    success = await repo.delete(proposal_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Proposal {proposal_id} not found")
    await session.commit()
    return None
