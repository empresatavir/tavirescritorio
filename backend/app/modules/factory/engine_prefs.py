"""Liga, desliga e escolhe o motor padrão da Fábrica."""
from __future__ import annotations

from app.models.integration_pref import IntegrationPref
from app.shared.database import async_session

REAL_ENGINES = ("ghostcli", "cursor")
CATALOG_ENGINES = ("ghostcli", "cursor", "int-08", "int-07")
_GHOST_EFFORTS = frozenset({"low", "medium", "high", "xhigh"})
_CURSOR_EFFORTS = frozenset({"low", "medium", "high", "xhigh"})
ENGINE_CALLS = {
    "ghostcli": {
        "default_model": "claude-opus-5-5",
        "default_effort": "xhigh",
        "models": {
            "claude-opus-5-5": _GHOST_EFFORTS,
            "claude-sonnet-5": _GHOST_EFFORTS,
            "claude-fable-5.1": _GHOST_EFFORTS,
        },
    },
    "cursor": {
        "default_model": "auto-smart",
        "default_effort": "balanced",
        "models": {
            "auto-smart": frozenset({"cost", "balanced", "intelligence"}),
            "composer-2.5": _CURSOR_EFFORTS,
            "gpt-5": _CURSOR_EFFORTS,
            "sonnet-4-thinking": _CURSOR_EFFORTS,
        },
    },
}


def fit_call(provider: str, model: str | None, effort: str | None) -> tuple[str, str, str]:
    """Mantém o modelo só se ele pertence ao motor padrão. Senão usa o modelo desse motor."""
    spec = ENGINE_CALLS.get(provider) or ENGINE_CALLS["ghostcli"]
    engine_id = provider if provider in ENGINE_CALLS else "ghostcli"
    chosen = (model or "").strip()
    use_effort = (effort or "").strip().lower()
    allowed = spec["models"].get(chosen)
    if not allowed:
        return engine_id, spec["default_model"], spec["default_effort"]
    if use_effort not in allowed:
        use_effort = spec["default_effort"]
    return engine_id, chosen, use_effort


def resolve_default(prefs: dict[str, tuple[bool, bool]]) -> str:
    """prefs: id → (ligado, padrão). Ghost sem registro conta como ligado."""
    for engine_id in REAL_ENGINES:
        enabled, is_default = prefs.get(engine_id, (engine_id == "ghostcli", False))
        if is_default and enabled:
            return engine_id
    if prefs.get("ghostcli", (True, False))[0]:
        return "ghostcli"
    if prefs.get("cursor", (False, False))[0]:
        return "cursor"
    return ""


async def _rows() -> dict[str, IntegrationPref]:
    from sqlalchemy import select

    async with async_session() as session:
        result = await session.execute(select(IntegrationPref))
        return {row.id: row for row in result.scalars().all()}


async def list_engines() -> dict:
    rows = await _rows()
    prefs: dict[str, tuple[bool, bool]] = {}
    engines = []
    for engine_id in CATALOG_ENGINES:
        row = rows.get(engine_id)
        if engine_id == "ghostcli":
            enabled = True if row is None else bool(row.enabled)
        elif engine_id == "cursor":
            enabled = bool(row and row.enabled)
        else:
            enabled = True if row is None else bool(row.enabled)
        is_default = bool(row and row.is_default)
        prefs[engine_id] = (enabled, is_default)
        engines.append({"id": engine_id, "enabled": enabled, "is_default": is_default})
    chosen = resolve_default(prefs)
    for item in engines:
        item["is_default"] = item["id"] == chosen
    return {"default_id": chosen, "engines": engines}


async def set_engine_enabled(engine_id: str, enabled: bool) -> dict:
    if engine_id not in CATALOG_ENGINES:
        raise ValueError("Motor desconhecido")
    async with async_session() as session:
        row = await session.get(IntegrationPref, engine_id)
        if row is None:
            row = IntegrationPref(id=engine_id, enabled=enabled, is_default=False)
            session.add(row)
        else:
            row.enabled = enabled
            if not enabled:
                row.is_default = False
        await session.commit()
    return await list_engines()


async def set_default_engine(engine_id: str) -> dict:
    if engine_id not in REAL_ENGINES:
        raise ValueError("A Fábrica executa Ghost ou Cursor.")
    current = await list_engines()
    enabled = next(item["enabled"] for item in current["engines"] if item["id"] == engine_id)
    if not enabled:
        raise ValueError("Ligue o motor antes de defini-lo como padrão.")
    async with async_session() as session:
        from sqlalchemy import select

        result = await session.execute(select(IntegrationPref))
        rows = list(result.scalars().all())
        found = None
        for row in rows:
            row.is_default = row.id == engine_id
            if row.id == engine_id:
                found = row
        if found is None:
            session.add(IntegrationPref(id=engine_id, enabled=True, is_default=True))
        await session.commit()
    await align_future_work(engine_id)
    return await list_engines()


async def default_engine_id() -> str:
    payload = await list_engines()
    return str(payload["default_id"] or "ghostcli")


async def office_call(model: str | None, effort: str | None) -> tuple[str, str, str, bool]:
    """Motor padrão do escritório, com modelo compatível e se ele está ligado."""
    payload = await list_engines()
    provider = str(payload["default_id"] or "ghostcli")
    enabled = next((bool(item["enabled"]) for item in payload["engines"] if item["id"] == provider), False)
    fitted = fit_call(provider, model, effort)
    return (*fitted, enabled)


async def align_future_work(engine_id: str) -> None:
    """Grava o motor padrão nos projetos e nas esteiras que ainda vão executar."""
    from sqlalchemy import select
    from sqlalchemy.orm.attributes import flag_modified

    from app.models.factory_run import FactoryRun
    from app.models.project import Project

    async with async_session() as session:
        projects = (await session.execute(select(Project))).scalars().all()
        for project in projects:
            stored = dict(project.ai_settings or {})
            provider, model, effort = fit_call(engine_id, stored.get("model"), stored.get("effort"))
            if (
                stored.get("provider") == provider
                and stored.get("model") == model
                and stored.get("effort") == effort
            ):
                continue
            project.ai_settings = {"model": model, "effort": effort, "provider": provider}
            flag_modified(project, "ai_settings")
        runs = (await session.execute(select(FactoryRun))).scalars().all()
        for run in runs:
            if run.status == "done":
                continue
            meta = dict(run.meta or {})
            provider, model, effort = fit_call(engine_id, meta.get("model"), meta.get("effort"))
            if meta.get("provider") == provider and meta.get("model") == model and meta.get("effort") == effort:
                continue
            meta["provider"] = provider
            meta["model"] = model
            meta["effort"] = effort
            run.meta = meta
            flag_modified(run, "meta")
        await session.commit()


async def engine_enabled(engine_id: str) -> bool:
    payload = await list_engines()
    for item in payload["engines"]:
        if item["id"] == engine_id:
            return bool(item["enabled"])
    return False
