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

_GHOST_EFFORTS = [
    {"id": "low", "label": "Baixo"},
    {"id": "medium", "label": "Médio"},
    {"id": "high", "label": "Alto"},
    {"id": "xhigh", "label": "Máximo"},
]
_CURSOR_EFFORTS = [
    {"id": "low", "label": "Baixo"},
    {"id": "medium", "label": "Médio"},
    {"id": "high", "label": "Alto"},
    {"id": "xhigh", "label": "Máximo"},
]
_CURSOR_AUTO_EFFORTS = [
    {"id": "cost", "label": "Cost"},
    {"id": "balanced", "label": "Balance"},
    {"id": "intelligence", "label": "Intelligence"},
]
ENGINES = [
    {
        "id": "ghostcli",
        "label": "Ghost",
        "models": [
            {"id": "claude-opus-5-5", "label": "Opus", "efforts": _GHOST_EFFORTS},
            {"id": "claude-sonnet-5", "label": "Sonnet", "efforts": _GHOST_EFFORTS},
            {"id": "claude-fable-5.1", "label": "Fable", "efforts": _GHOST_EFFORTS},
        ],
    },
    {
        "id": "cursor",
        "label": "Cursor",
        "models": [
            {"id": "auto-smart", "label": "Auto", "efforts": _CURSOR_AUTO_EFFORTS},
            {"id": "composer-2.5", "label": "Composer", "efforts": _CURSOR_EFFORTS},
            {"id": "gpt-5", "label": "GPT-5", "efforts": _CURSOR_EFFORTS},
            {"id": "sonnet-4-thinking", "label": "Sonnet Thinking", "efforts": _CURSOR_EFFORTS},
        ],
    },
]


def _model_spec(model_id: str) -> tuple[dict, dict] | None:
    for engine in ENGINES:
        for model in engine["models"]:
            if model["id"] == model_id:
                return engine, model
    return None


class CursorToggle(BaseModel):
    enabled: bool


class AiSettingsBody(BaseModel):
    model: str
    effort: str = "xhigh"
    provider: str | None = None


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
    model = str(stored.get("model") or meta.get("model") or default_model())
    effort = str(stored.get("effort") or meta.get("effort") or default_effort())
    spec = _model_spec(model)
    provider = str(stored.get("provider") or meta.get("provider") or (spec[0]["id"] if spec else "ghostcli"))
    if spec and spec[0]["id"] != provider:
        provider = spec[0]["id"]
    cursor = await status()
    return {
        "model": model,
        "effort": effort,
        "provider": provider,
        "cursor_enabled": cursor["enabled"],
        "engines": ENGINES,
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
    engine, model_spec = spec
    allowed = {item["id"] for item in model_spec["efforts"]}
    if body.effort not in allowed:
        raise HTTPException(status_code=400, detail="Esforço indisponível para este modelo")
    provider = engine["id"]
    if provider == "cursor" and not (await status())["enabled"]:
        raise HTTPException(status_code=409, detail="Ligue o conector Cursor em Integrações.")
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
