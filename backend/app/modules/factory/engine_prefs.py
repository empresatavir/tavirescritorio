"""Liga, desliga e escolhe o motor padrão da Fábrica."""
from __future__ import annotations

from app.models.integration_pref import IntegrationPref
from app.shared.database import async_session

REAL_ENGINES = ("ghostcli", "cursor")
MOTOR_ENGINES = ("cursor", "claude", "codex", "antigravity")
CATALOG_ENGINES = ("ghostcli", "cursor", "claude", "codex", "antigravity", "int-08", "int-07")
_GHOST_EFFORTS = frozenset({"low", "medium", "high", "xhigh"})
_CURSOR_EFFORTS = frozenset({"low", "medium", "high", "xhigh"})
_PLAIN_EFFORTS = frozenset({"low", "medium", "high"})
_EFFORT_ORDER = ("low", "medium", "high", "xhigh", "cost", "balanced", "intelligence")
ENGINE_LABELS = {
    "ghostcli": "Claude",
    "cursor": "Cursor",
    "claude": "Claude",
    "codex": "Codex",
    "antigravity": "Antigravity",
}
MODEL_LABELS = {
    "claude-opus-5-5": "Opus",
    "claude-sonnet-5": "Sonnet",
    "claude-fable-5.1": "Fable",
    "claude-sonnet-4-5": "Sonnet",
    "claude-opus-4-1": "Opus",
    "auto-smart": "Auto",
    "composer-2.5": "Composer",
    "gpt-5": "GPT-5",
    "gpt-5-codex": "Codex",
    "sonnet-4-thinking": "Sonnet Thinking",
    "antigravity": "Antigravity",
}
EFFORT_LABELS = {
    "low": "Baixo",
    "medium": "Médio",
    "high": "Alto",
    "xhigh": "Máximo",
    "cost": "Cost",
    "balanced": "Balance",
    "intelligence": "Intelligence",
}
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
    "claude": {
        "default_model": "claude-sonnet-4-5",
        "default_effort": "medium",
        "models": {
            "claude-sonnet-4-5": _PLAIN_EFFORTS,
            "claude-opus-4-1": _PLAIN_EFFORTS,
        },
    },
    "codex": {
        "default_model": "gpt-5-codex",
        "default_effort": "medium",
        "models": {
            "gpt-5-codex": _PLAIN_EFFORTS,
        },
    },
    "antigravity": {
        "default_model": "antigravity",
        "default_effort": "medium",
        "models": {
            "antigravity": _PLAIN_EFFORTS,
        },
    },
}


def ordered_efforts(allowed: frozenset[str]) -> list[str]:
    return [item for item in _EFFORT_ORDER if item in allowed]


def call_caption(provider: str, model: str, effort: str) -> str:
    """Rótulo da chamada: motor, modelo e, quando o modelo aceita, o esforço."""
    engine = ENGINE_LABELS.get(provider, provider)
    model_label = MODEL_LABELS.get(model, model)
    if model == "auto-smart":
        return f"{engine} · {model_label}"
    return f"{engine} · {model_label} · {EFFORT_LABELS.get(effort, effort)}"


def engine_catalog(enabled_ids: set[str], provider: str) -> list[dict]:
    """Modelos e esforços dos motores ligados, no formato da tela."""
    catalog = []
    for engine_id, spec in ENGINE_CALLS.items():
        if engine_id not in enabled_ids:
            continue
        if engine_id == "ghostcli" and "claude" in enabled_ids:
            continue
        catalog.append(
            {
                "id": engine_id,
                "label": ENGINE_LABELS.get(engine_id, engine_id),
                "enabled": True,
                "is_default": engine_id == provider,
                "models": [
                    {
                        "id": model_id,
                        "label": MODEL_LABELS.get(model_id, model_id),
                        "efforts": [
                            {"id": effort, "label": EFFORT_LABELS.get(effort, effort)}
                            for effort in ordered_efforts(allowed)
                        ],
                    }
                    for model_id, allowed in spec["models"].items()
                ],
            }
        )
    return catalog


def model_owner(model_id: str) -> tuple[str, frozenset[str]] | None:
    for engine_id, spec in ENGINE_CALLS.items():
        allowed = spec["models"].get(model_id)
        if allowed:
            return engine_id, allowed
    return None


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
    for engine_id in (*MOTOR_ENGINES, *REAL_ENGINES):
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
        elif engine_id in MOTOR_ENGINES:
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


def connected(engine_id: str, info: dict | None = None) -> bool:
    """Login da plataforma ou chave. A instalação sozinha ainda não liga o motor."""
    from app.modules.factory.motor_install import installation
    from app.modules.factory.motor_secrets import antigravity_base, antigravity_key, claude_key, codex_key

    row = info if info is not None else installation(engine_id)
    if engine_id == "cursor":
        return bool(row.get("logged_in"))
    if engine_id == "claude":
        return bool(claude_key() or row.get("logged_in"))
    if engine_id == "codex":
        return bool(codex_key() or row.get("logged_in"))
    if engine_id == "antigravity":
        return bool(antigravity_key() and antigravity_base())
    return False


async def motor_plugged(engine_id: str) -> bool:
    import asyncio

    return await asyncio.to_thread(connected, engine_id)


async def list_motors() -> list[dict]:
    """Cursor, Claude, Codex e Antigravity para a tela Motor IA."""
    import asyncio

    from app.modules.cursor_link.client import api_key as cursor_key
    from app.modules.factory.motor_install import installation
    from app.modules.factory.motor_secrets import antigravity_key, claude_key, codex_key

    flags = await list_engines()
    by_id = {item["id"]: item for item in flags["engines"]}
    default_id = flags["default_id"]
    infos = await asyncio.gather(*(asyncio.to_thread(installation, engine_id) for engine_id in MOTOR_ENGINES))
    labels = {
        "cursor": ("Cursor", "O agente local. O login desta máquina pluga o motor."),
        "claude": ("Claude", "Chave da Anthropic, ou o aplicativo já instalado."),
        "codex": ("Codex", "Chave da OpenAI, ou o aplicativo já instalado."),
        "antigravity": ("Antigravity", "Chave e endereço da API. O aplicativo abre o login."),
    }
    secrets = {
        "cursor": bool(cursor_key()),
        "claude": bool(claude_key()),
        "codex": bool(codex_key()),
        "antigravity": bool(antigravity_key()),
    }
    motors = []
    for info in infos:
        engine_id = info["id"]
        label, hint = labels[engine_id]
        row = by_id.get(engine_id) or {}
        motors.append(
            {
                "id": engine_id,
                "label": label,
                "hint": hint,
                "plugged": connected(engine_id, info),
                "enabled": bool(row.get("enabled")),
                "is_default": default_id == engine_id,
                "local": bool(info.get("local")),
                "logged_in": bool(info.get("logged_in")),
                "sdk": bool(info.get("sdk")),
                "has_key": secrets[engine_id],
                "login_url": info.get("login_url"),
            }
        )
    return motors


async def set_engine_enabled(engine_id: str, enabled: bool) -> dict:
    if engine_id not in CATALOG_ENGINES:
        raise ValueError("Motor desconhecido")
    if enabled and engine_id in MOTOR_ENGINES and engine_id != "cursor" and not await motor_plugged(engine_id):
        raise ValueError("Plugue esse motor em Integrações antes de ligar.")
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
    if engine_id not in (*MOTOR_ENGINES, *REAL_ENGINES):
        raise ValueError("Motor desconhecido")
    current = await list_engines()
    enabled = next((item["enabled"] for item in current["engines"] if item["id"] == engine_id), False)
    if not enabled:
        raise ValueError("Ligue o motor antes de defini-lo como padrão.")
    if engine_id in MOTOR_ENGINES and not await motor_plugged(engine_id):
        raise ValueError("Plugue esse motor em Integrações antes de defini-lo como padrão.")
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
