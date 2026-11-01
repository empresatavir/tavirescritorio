"""Integrations API — health checks for external services like GhostCLI."""
import asyncio
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.project import Project
from app.modules.cursor_link.client import set_enabled, start_login, status
from app.modules.factory.run_service import get_active_run
from app.modules.ghostcli import default_effort, default_model, health_check, is_configured
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])


def _model_spec(model_id: str):
    from app.modules.factory.engine_prefs import model_owner

    return model_owner(model_id)


class CursorToggle(BaseModel):
    enabled: bool


class AiSettingsBody(BaseModel):
    model: str
    effort: str = "xhigh"
    provider: str | None = None


class PlugBody(BaseModel):
    api_key: str = ""
    base_url: str | None = None


@router.get("/motors")
async def get_motors() -> dict:
    from app.modules.factory.engine_prefs import list_motors

    return {"motors": await list_motors()}


@router.post("/motors/{engine_id}/plug")
async def post_motor_plug(
    engine_id: str,
    body: PlugBody,
    session: AsyncSession = Depends(get_session),
) -> dict:
    import json

    from app.modules.factory.engine_prefs import MOTOR_ENGINES, list_motors
    from app.modules.factory.motor_secrets import save_plug
    from app.modules.office.ledger import record_event

    if engine_id not in MOTOR_ENGINES or engine_id == "cursor":
        raise HTTPException(status_code=404, detail="Esse motor se pluga pelo login, não por chave.")
    key = (body.api_key or "").strip()
    if len(key) < 8:
        raise HTTPException(status_code=400, detail="A chave está curta demais.")
    if engine_id == "antigravity" and not (body.base_url or "").strip():
        raise HTTPException(status_code=400, detail="O Antigravity precisa do endereço da API.")
    save_plug(engine_id, key, body.base_url)
    record_event(
        session,
        action="motor.plug",
        details=json.dumps({"engine": engine_id, "api_key": key}, ensure_ascii=False),
    )
    await session.commit()
    return {"motors": await list_motors()}


@router.post("/motors/{engine_id}/login")
async def post_motor_login(engine_id: str) -> dict:
    import asyncio

    from app.modules.factory.engine_prefs import MOTOR_ENGINES, list_motors
    from app.modules.factory.motor_install import start_login

    if engine_id not in MOTOR_ENGINES:
        raise HTTPException(status_code=404, detail="Motor desconhecido")
    try:
        login = await asyncio.to_thread(start_login, engine_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"login": login, "motors": await list_motors()}


@router.get("/engines")
async def get_engines() -> dict:
    from app.modules.factory.engine_prefs import list_engines

    return await list_engines()


class EngineToggle(BaseModel):
    enabled: bool


@router.put("/engines/{engine_id}")
async def put_engine(engine_id: str, body: EngineToggle) -> dict:
    from app.modules.factory.engine_prefs import set_engine_enabled

    try:
        payload = await set_engine_enabled(engine_id, body.enabled)
    except ValueError as exc:
        status = 404 if "desconhecido" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    if engine_id == "cursor":
        await set_enabled(body.enabled)
    return payload


@router.put("/engines/{engine_id}/default")
async def put_engine_default(engine_id: str) -> dict:
    from app.modules.factory.engine_prefs import set_default_engine

    try:
        return await set_default_engine(engine_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/office-ai")
async def get_office_ai() -> dict:
    """Motor padrão do escritório, com os modelos e esforços que a tela pode escolher."""
    from app.modules.factory.engine_prefs import engine_catalog, list_engines, office_call

    flags = await list_engines()
    provider, model, effort, enabled = await office_call(None, None)
    enabled_ids = {item["id"] for item in flags["engines"] if item["enabled"]}
    engines = engine_catalog(enabled_ids, provider)
    label = next((item["label"] for item in engines if item["id"] == provider), provider)
    return {
        "provider": provider,
        "provider_label": label,
        "model": model,
        "effort": effort,
        "engine_enabled": enabled,
        "engines": engines,
    }


@router.get("/cursor")
async def get_cursor_integration() -> dict:
    return await status()


@router.put("/cursor")
async def put_cursor_integration(body: CursorToggle) -> dict:
    await set_enabled(body.enabled)
    return await status()


@router.post("/cursor/login")
async def post_cursor_login() -> dict:
    try:
        return await asyncio.to_thread(start_login)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/projects/{project_id}/ai-settings")
async def get_project_ai_settings(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    stored = dict(project.ai_settings or {})
    run = await get_active_run(session, project.id)
    meta = (run.meta if run else None) or {}
    from app.modules.factory.engine_prefs import office_call

    provider, model, effort, enabled = await office_call(
        stored.get("model") or meta.get("model"),
        stored.get("effort") or meta.get("effort"),
    )
    try:
        cursor = await asyncio.wait_for(status(), timeout=3)
    except (TimeoutError, OSError, RuntimeError):
        cursor = {"enabled": False}
    from app.modules.factory.engine_prefs import engine_catalog, list_engines

    flags = await list_engines()
    enabled_ids = {item["id"] for item in flags["engines"] if item["enabled"]}
    engines = engine_catalog(enabled_ids, provider)
    return {
        "model": model,
        "effort": effort,
        "provider": provider,
        "engine_enabled": enabled,
        "cursor_enabled": cursor["enabled"],
        "engines": engines,
    }


@router.put("/projects/{project_id}/ai-settings")
async def put_project_ai_settings(
    project_id: str,
    body: AiSettingsBody,
    session: AsyncSession = Depends(get_session),
) -> dict:
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    spec = _model_spec(body.model)
    if spec is None:
        raise HTTPException(status_code=400, detail="Modelo desconhecido para este motor")
    engine_id, allowed = spec
    if body.effort not in allowed:
        raise HTTPException(status_code=400, detail="Esforço indisponível para este modelo")
    from app.modules.factory.engine_prefs import office_call

    provider, _model, _effort, enabled = await office_call(None, None)
    if engine_id != provider:
        raise HTTPException(status_code=409, detail="O escritório usa o motor padrão definido em Integrações.")
    if not enabled:
        raise HTTPException(status_code=409, detail="Ligue o motor padrão em Integrações.")
    project.ai_settings = {"model": body.model, "effort": body.effort, "provider": provider}
    flag_modified(project, "ai_settings")
    run = await get_active_run(session, project.id)
    if run is not None:
        meta = dict(run.meta or {})
        meta["model"] = body.model
        meta["effort"] = body.effort
        meta["provider"] = provider
        run.meta = meta
        flag_modified(run, "meta")
    await session.commit()
    return {"model": body.model, "effort": body.effort, "provider": provider}


@router.get("/ghostcli/status")
async def get_ghostcli_status() -> dict[str, Any]:
    """Check GhostCLI integration status via /models probe."""
    result: dict[str, Any] = {
        "integration": "ghostcli",
        "status": "unavailable",
        "latency_ms": None,
        "last_check": None,
        "error": None,
        "default_model": default_model(),
    }

    if not is_configured():
        from app.modules.ghostcli.notice import report_ai_link_error

        report_ai_link_error("GhostCLI sem chave. Defina GHOSTCLI_API_KEY.")
        result["status"] = "unavailable"
        result["error"] = "Chave de API não configurada"
        result["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return result

    start = time.monotonic()
    probe = await health_check(timeout=10.0)
    elapsed_ms = round((time.monotonic() - start) * 1000, 1)
    result["latency_ms"] = elapsed_ms
    result["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if probe.get("ok"):
        result["status"] = "configured"
        result["models_count"] = probe.get("models_count")
    else:
        from app.modules.ghostcli.notice import report_ai_link_error

        message = probe.get("error") or "Falha no probe do GhostCLI"
        report_ai_link_error(str(message))
        result["status"] = "error"
        result["error"] = message

    return result
