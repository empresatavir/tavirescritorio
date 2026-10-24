"""GhostCLI HTTP gateway — OpenAI-compatible /v1/chat/completions.

Fonte única para Chat, Fábrica (execute/chat) e Studio (oráculo/produção).
A chave vem de GHOSTCLI_API_KEY; modelo padrão de GHOSTCLI_MODEL.
"""
from __future__ import annotations

import asyncio
import os
from typing import Any

import httpx

DEFAULT_BASE = "https://ghostcli.cloud/v1"
# Padrão Fábrica (agentes iniciais): Opus + esforço máximo até Paula redefinir no plano.
DEFAULT_MODEL = "claude-opus-5-5"
DEFAULT_EFFORT = "xhigh"
_GHOST_MODELS = {"claude-opus-5-5", "claude-sonnet-5", "claude-fable-5.1"}
_GHOST_EFFORTS = {"low", "medium", "high", "xhigh"}
_EFFORT_ALIASES = {
    "máximo": "xhigh",
    "maximo": "xhigh",
    "max": "xhigh",
    "alto": "high",
    "médio": "medium",
    "medio": "medium",
    "baixo": "low",
}


def base_url() -> str:
    return (os.environ.get("GHOSTCLI_BASE_URL") or DEFAULT_BASE).rstrip("/")


def api_key() -> str:
    return (os.environ.get("GHOSTCLI_API_KEY") or "").strip()


def default_model() -> str:
    return (os.environ.get("GHOSTCLI_MODEL") or DEFAULT_MODEL).strip() or DEFAULT_MODEL


def default_effort() -> str:
    """Níveis GhostCLI: low | medium | high | xhigh. Fábrica usa xhigh por padrão."""
    raw = (os.environ.get("GHOSTCLI_EFFORT") or DEFAULT_EFFORT).strip().lower()
    return _EFFORT_ALIASES.get(raw, raw) or DEFAULT_EFFORT


def ghost_model_id(model: str | None) -> str:
    """Modelo do Ghost. Um id do Cursor não vai para o gateway."""
    chosen = (model or "").strip()
    return chosen if chosen in _GHOST_MODELS else default_model()


def ghost_effort_id(effort: str | None) -> str:
    """Esforço do Ghost. Cost, Balance e Intelligence ficam de fora."""
    level = _EFFORT_ALIASES.get((effort or "").strip().lower(), (effort or "").strip().lower())
    if level in _GHOST_EFFORTS:
        return level
    return "medium"


def is_configured() -> bool:
    return bool(api_key())


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key()}",
        "Content-Type": "application/json",
    }


class GhostCliError(RuntimeError):
    """Falha ao chamar o gateway GhostCLI."""

    def __init__(self, message: str, *, report: bool = True):
        from app.modules.ghostcli.notice import plain_engine_error, report_ai_link_error

        clean = plain_engine_error(message) or "O motor de IA não respondeu."
        super().__init__(clean)
        if report:
            report_ai_link_error(clean)


_RETRY_STATUS = {429, 500, 502, 503, 504, 520, 521, 522, 523, 524}


def _http_failure(status: int) -> str:
    if status == 524:
        return "O Ghost estourou o tempo (HTTP 524). A entrega não saiu."
    if status == 429:
        return "O Ghost pediu espera (HTTP 429). A entrega não saiu."
    if status >= 500:
        return f"O Ghost não respondeu (HTTP {status}). A entrega não saiu."
    return f"O Ghost recusou a entrega (HTTP {status})."


def _timeout(read_seconds: float) -> httpx.Timeout:
    """Conexão curta. Leitura longa. Opus com esforço máximo passa de 120 segundos."""
    return httpx.Timeout(connect=20.0, read=max(float(read_seconds), 240.0), write=60.0, pool=20.0)


async def _post_chat(
    payload: dict[str, Any],
    *,
    timeout: float,
) -> str:
    """Tenta três vezes. Timeout e queda de rede não encerram a entrega na primeira falha."""
    last_message = "Falha desconhecida no GhostCLI"
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=_timeout(timeout)) as client:
                response = await client.post(
                    f"{base_url()}/chat/completions",
                    json=payload,
                    headers=_headers(),
                )
                if response.status_code in _RETRY_STATUS and attempt < 2:
                    last_message = _http_failure(response.status_code)
                    await asyncio.sleep(2.0 * (attempt + 1))
                    continue
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            last_message = _http_failure(status)
            if status in _RETRY_STATUS and attempt < 2:
                await asyncio.sleep(2.0 * (attempt + 1))
                continue
            break
        except httpx.TimeoutException:
            last_message = (
                "Timeout na conexão com GhostCLI após a tentativa "
                f"{attempt + 1} de 3. A leitura espera até 240 segundos."
            )
            if attempt < 2:
                await asyncio.sleep(2.0 * (attempt + 1))
                continue
        except httpx.ConnectError:
            last_message = f"Não foi possível conectar a {base_url()} na tentativa {attempt + 1} de 3."
            if attempt < 2:
                await asyncio.sleep(2.0 * (attempt + 1))
                continue
    raise GhostCliError(last_message, report=False)


async def chat_completion(
    *,
    messages: list[dict[str, str]],
    system: str | None = None,
    model: str | None = None,
    effort: str | None = None,
    provider: str | None = None,
    max_tokens: int = 2048,
    timeout: float = 240.0,
) -> str:
    """Entrega o texto do motor. Se o GhostCLI falhar e o Cursor estiver ligado, o Cursor responde."""
    payload_messages: list[dict[str, str]] = []
    if system:
        payload_messages.append({"role": "system", "content": system})
    payload_messages.extend(messages)

    use_effort = (effort or default_effort()).strip().lower()
    ghost_model = ghost_model_id(model)
    ghost_effort = ghost_effort_id(use_effort)
    payload: dict[str, Any] = {
        "model": ghost_model,
        "messages": payload_messages,
        "max_tokens": max_tokens,
        "reasoning_effort": ghost_effort,
        "effort": ghost_effort,
    }

    from app.modules.cursor_link.client import complete_text, is_enabled

    chosen = (provider or "ghostcli").strip().lower()
    errors: list[str] = []

    async def via_ghost() -> str:
        if not is_configured():
            raise GhostCliError("GHOSTCLI_API_KEY não configurada", report=False)
        return await _post_chat(payload, timeout=timeout)

    async def via_cursor() -> str:
        if not await is_enabled():
            raise RuntimeError("O conector Cursor está desligado.")
        return await complete_text(system=system, messages=messages, model=model, effort=use_effort)

    steps = ("cursor", "ghost") if chosen == "cursor" else ("ghost", "cursor")
    for step in steps:
        if step == "cursor" and chosen != "cursor" and not await is_enabled():
            continue
        try:
            if step == "ghost":
                return await via_ghost()
            return await via_cursor()
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))

    if len(errors) == 1:
        raise GhostCliError(errors[0])
    raise GhostCliError("Nenhum motor respondeu. " + " ".join(errors))


async def list_models(timeout: float = 15.0) -> list[dict[str, Any]]:
    """Lista modelos do gateway (formato GhostCLI ou OpenAI)."""
    if not is_configured():
        return []
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(f"{base_url()}/models", headers=_headers())
        response.raise_for_status()
        data = response.json()
    items = data.get("models") or data.get("data") or []
    out: list[dict[str, Any]] = []
    for m in items:
        mid = m.get("slug") or m.get("model") or m.get("id") or ""
        if not mid:
            continue
        out.append(
            {
                "id": mid,
                "name": m.get("display_name") or m.get("name") or mid,
                "provider": m.get("provider") or "ghostcli",
            }
        )
    return out


async def health_check(timeout: float = 10.0) -> dict[str, Any]:
    """Probe leve via /models (o /health do cloud pode não existir)."""
    if not is_configured():
        return {"ok": False, "error": "GHOSTCLI_API_KEY não configurada"}
    try:
        models = await list_models(timeout=timeout)
        return {"ok": True, "models_count": len(models), "default_model": default_model()}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}
