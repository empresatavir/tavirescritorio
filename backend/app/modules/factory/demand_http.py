"""Rotas de demanda no router da Fábrica."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.shared.database import get_session
from app.modules.factory.demands import (
    DemandError,
    advance,
    create_demand,
    get_demand,
    list_demands,
    open_demand,
    portrait,
    register_failure,
    reject,
)
from app.modules.factory.memory_store import MemoryError, propose


class DemandCreate(BaseModel):
    title: str
    type: str = "criacao"
    summary: str = ""
    opt_out: bool | None = None


class DemandReject(BaseModel):
    motive: str


class DemandFailure(BaseModel):
    text: str


class DemandAction(BaseModel):
    tipo: str
    texto: str = ""
    titulo: str = ""
    demand_code: str = ""


class DemandMemory(BaseModel):
    titulo: str = ""
    texto: str = ""


def _dump(row) -> dict:
    data = row.dossier if isinstance(row.dossier, dict) else {}
    return {
        "id": row.id,
        "project_id": row.project_id,
        "code": row.code,
        "title": row.title,
        "type": row.type,
        "track": row.track,
        "status": row.status,
        "summary": row.summary,
        "opt_out": row.opt_out,
        "sla_due_at": row.sla_due_at.isoformat() if row.sla_due_at else None,
        "run_id": row.run_id,
        "dossier": data,
        "created_at": row.created_at.isoformat() if hasattr(row.created_at, "isoformat") else row.created_at,
        "updated_at": row.updated_at.isoformat() if hasattr(row.updated_at, "isoformat") else row.updated_at,
    }


def mount(router) -> None:
    @router.get("/projects/{project_id}/demands")
    async def get_demands(project_id: str, session: AsyncSession = Depends(get_session)):
        project = await _project(session, project_id)
        rows = await list_demands(session, project.id)
        return {"project_id": project.id, "demands": [_dump(row) for row in rows]}

    @router.post("/projects/{project_id}/demands", status_code=201)
    async def post_demand(project_id: str, body: DemandCreate, session: AsyncSession = Depends(get_session)):
        project = await _project(session, project_id)
        try:
            row = await create_demand(
                session,
                project,
                title=body.title,
                demand_type=body.type,
                summary=body.summary,
                opt_out=body.opt_out,
            )
        except DemandError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        await session.commit()
        return _dump(row)

    @router.post("/demands/{demand_id}/advance")
    async def post_advance(demand_id: str, session: AsyncSession = Depends(get_session)):
        row = await _owned(session, demand_id)
        project = await _project(session, row.project_id)
        try:
            row = await advance(session, project, row)
        except DemandError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        await session.commit()
        return _dump(row)

    @router.post("/demands/{demand_id}/reject")
    async def post_reject(demand_id: str, body: DemandReject, session: AsyncSession = Depends(get_session)):
        row = await _owned(session, demand_id)
        project = await _project(session, row.project_id)
        try:
            row = await reject(session, project, row, body.motive)
        except DemandError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        await session.commit()
        return _dump(row)

    @router.post("/demands/{demand_id}/failure")
    async def post_failure(demand_id: str, body: DemandFailure, session: AsyncSession = Depends(get_session)):
        row = await _owned(session, demand_id)
        try:
            register_failure(row, body.text)
        except DemandError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        await session.commit()
        return _dump(row)

    @router.post("/demands/{demand_id}/memory")
    async def post_memory(demand_id: str, body: DemandMemory, session: AsyncSession = Depends(get_session)):
        row = await _owned(session, demand_id)
        project = await _project(session, row.project_id)
        try:
            path = propose(project.local_path, body.titulo, body.texto)
        except MemoryError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        await session.commit()
        return {"name": path.name, "demand_code": row.code}

    @router.post("/projects/{project_id}/demand-action")
    async def post_action(project_id: str, body: DemandAction, session: AsyncSession = Depends(get_session)):
        project = await _project(session, project_id)
        rows = await list_demands(session, project.id)
        row = next((item for item in rows if item.code == body.demand_code), None) if body.demand_code else None
        if row is None:
            row = await open_demand(session, project.id)
        if row is None:
            raise HTTPException(status_code=404, detail="Não há demanda aberta neste projeto.")
        try:
            if body.tipo == "pedir-aceite":
                row = await advance(session, project, row)
                result = _dump(row)
            elif body.tipo == "registrar-falha":
                register_failure(row, body.texto)
                result = _dump(row)
            elif body.tipo == "propor-memoria":
                path = propose(project.local_path, body.titulo or "Nota", body.texto)
                result = {"name": path.name, "demand_code": row.code}
            elif body.tipo == "abrir-demanda":
                result = _dump(row)
            else:
                raise DemandError("Ação desconhecida.")
        except (DemandError, MemoryError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        await session.commit()
        return result

    @router.get("/demands/{demand_id}/portrait")
    async def get_portrait(demand_id: str, session: AsyncSession = Depends(get_session)):
        row = await _owned(session, demand_id)
        project = await _project(session, row.project_id)
        return {"text": portrait(project, row)}


async def _project(session: AsyncSession, project_id: str) -> Project:
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project


async def _owned(session: AsyncSession, demand_id: str):
    row = await get_demand(session, demand_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    return row
