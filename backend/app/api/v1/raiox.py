"""API do módulo Raio-X TAVIR."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.raiox.catalog import catalog_payload, read_method
from app.modules.raiox.repository import RaioxRepository
from app.modules.raiox.service import RaioxService, RaioxError
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/raiox", tags=["raiox"])


class JourneyStage(BaseModel):
    stage: str
    count: int
    usable: int


class Readiness(BaseModel):
    has_usable_evidence: bool
    priority_ready: bool
    debrief_ready: bool


class EvidenceResponse(BaseModel):
    id: str
    stage: str
    source: str
    claim: str
    classification: str
    front: str | None = None
    note: str | None = None
    created_at: datetime


class ScanFrontResponse(BaseModel):
    id: str
    label: str
    covered: bool


class MethodPageResponse(BaseModel):
    path: str
    title: str


class MethodResponse(BaseModel):
    path: str
    title: str
    definition: str


class CaseSummary(BaseModel):
    id: str
    company_name: str
    contact_name: str | None = None
    objective: str
    product_id: str
    product_name: str
    deep_scan: bool
    physical_store: bool
    origin: str
    segment: str | None = None
    public_link: str | None = None
    package_id: str
    status: str
    bottleneck: str | None = None
    priority_stage: str | None = None
    next_offer: str | None = None
    debrief_decision: str | None = None
    evidence_count: int
    updated_at: datetime


class CaseDetail(CaseSummary):
    decision_needed: str
    frontier: str | None = None
    priority_rationale: str | None = None
    discarded: str | None = None
    confidence: str | None = None
    debrief_reason: str | None = None
    plan_30: str | None = None
    plan_60: str | None = None
    plan_90: str | None = None
    created_at: datetime
    evidence: list[EvidenceResponse]
    journey: list[JourneyStage]
    readiness: Readiness
    scan: list[ScanFrontResponse]
    method_pages: list[MethodPageResponse]


class CreateCaseRequest(BaseModel):
    company_name: str
    objective: str
    decision_needed: str
    contact_name: str | None = None
    frontier: str | None = None
    product_id: str = "diagnostico"
    deep_scan: bool = False
    physical_store: bool = False
    origin: str = "amigo"
    segment: str | None = None
    public_link: str | None = None
    package_id: str = "basico"


class UpdateFrontierRequest(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    objective: str | None = None
    decision_needed: str | None = None
    frontier: str | None = None
    origin: str | None = None
    segment: str | None = None
    public_link: str | None = None


class AddEvidenceRequest(BaseModel):
    stage: str
    source: str
    claim: str
    classification: str
    note: str | None = None
    front: str | None = None


class SetPriorityRequest(BaseModel):
    priority_stage: str
    bottleneck: str
    priority_rationale: str
    confidence: str
    discarded: str | None = None


class SetDebriefRequest(BaseModel):
    decision: str
    reason: str
    next_offer: str | None = None
    plan_30: str | None = None
    plan_60: str | None = None
    plan_90: str | None = None


def _service(session: AsyncSession) -> RaioxService:
    return RaioxService(RaioxRepository(session))


def _raise(exc: RaioxError) -> None:
    raise HTTPException(status_code=exc.status, detail=exc.message) from exc


@router.get("/catalog")
async def get_catalog():
    return catalog_payload()


@router.get("/metodo/{domain}/{slug}", response_model=MethodResponse)
async def get_method(domain: str, slug: str):
    try:
        return read_method(f"{domain}/{slug}")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/cases", response_model=list[CaseSummary])
async def list_cases(session: AsyncSession = Depends(get_session)):
    return await _service(session).list_cases()


@router.post("/cases", response_model=CaseDetail)
async def create_case(body: CreateCaseRequest, session: AsyncSession = Depends(get_session)):
    try:
        payload = await _service(session).create_case(**body.model_dump())
    except RaioxError as exc:
        _raise(exc)
    await session.commit()
    return payload


@router.get("/cases/{case_id}", response_model=CaseDetail)
async def get_case(case_id: str, session: AsyncSession = Depends(get_session)):
    try:
        return await _service(session).get_case(case_id)
    except RaioxError as exc:
        _raise(exc)


@router.patch("/cases/{case_id}", response_model=CaseDetail)
async def update_frontier(
    case_id: str,
    body: UpdateFrontierRequest,
    session: AsyncSession = Depends(get_session),
):
    try:
        payload = await _service(session).update_frontier(case_id, **body.model_dump())
    except RaioxError as exc:
        _raise(exc)
    await session.commit()
    return payload


@router.post("/cases/{case_id}/evidence", response_model=CaseDetail)
async def add_evidence(
    case_id: str,
    body: AddEvidenceRequest,
    session: AsyncSession = Depends(get_session),
):
    try:
        payload = await _service(session).add_evidence(case_id, **body.model_dump())
    except RaioxError as exc:
        _raise(exc)
    await session.commit()
    return payload


@router.delete("/cases/{case_id}/evidence/{evidence_id}", response_model=CaseDetail)
async def remove_evidence(
    case_id: str,
    evidence_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        payload = await _service(session).remove_evidence(case_id, evidence_id)
    except RaioxError as exc:
        _raise(exc)
    await session.commit()
    return payload


@router.post("/cases/{case_id}/priority", response_model=CaseDetail)
async def set_priority(
    case_id: str,
    body: SetPriorityRequest,
    session: AsyncSession = Depends(get_session),
):
    try:
        payload = await _service(session).set_priority(case_id, **body.model_dump())
    except RaioxError as exc:
        _raise(exc)
    await session.commit()
    return payload


@router.post("/cases/{case_id}/debrief", response_model=CaseDetail)
async def set_debrief(
    case_id: str,
    body: SetDebriefRequest,
    session: AsyncSession = Depends(get_session),
):
    try:
        payload = await _service(session).set_debrief(case_id, **body.model_dump())
    except RaioxError as exc:
        _raise(exc)
    await session.commit()
    return payload


@router.post("/cases/{case_id}/close", response_model=CaseDetail)
async def close_case(case_id: str, session: AsyncSession = Depends(get_session)):
    try:
        payload = await _service(session).close_case(case_id)
    except RaioxError as exc:
        _raise(exc)
    await session.commit()
    return payload
