"""Chamada curta dos motores plugados. Sem leitura de pasta."""
from __future__ import annotations

import asyncio

import httpx

from app.modules.factory.motor_secrets import antigravity_base, antigravity_key, claude_key, codex_key
from app.modules.ghostcli.client import GhostCliError


def _text_from_openai(data: dict) -> str:
    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    content = message.get("content") or ""
    if isinstance(content, list):
        return "".join(part.get("text") or "" for part in content if isinstance(part, dict)).strip()
    return str(content).strip()


def _prompt(system: str | None, messages: list[dict]) -> str:
    lines = ["Responda em português, só com a resposta pedida."]
    if system:
        lines.append(system)
    for item in messages:
        lines.append(f"{item.get('role') or 'user'}: {item.get('content') or ''}")
    return "\n".join(lines)


async def _local_answer(engine_id: str, system: str | None, messages: list[dict], model: str) -> str:
    from app.modules.factory.motor_install import local_answer

    try:
        return await asyncio.to_thread(local_answer, engine_id, _prompt(system, messages), model)
    except Exception as exc:  # noqa: BLE001
        raise GhostCliError(str(exc)) from exc


async def complete_claude(*, system: str | None, messages: list[dict], model: str, max_tokens: int) -> str:
    key = claude_key()
    if not key:
        from app.modules.factory.motor_install import installation

        if installation("claude").get("logged_in"):
            return await _local_answer("claude", system, messages, model)
        raise GhostCliError("Plugue a chave do Claude em Integrações ou entre com o login do aplicativo.")
    payload_messages = []
    for item in messages:
        role = item.get("role") or "user"
        if role == "system":
            continue
        payload_messages.append({"role": "assistant" if role == "assistant" else "user", "content": item.get("content") or ""})
    if not payload_messages:
        payload_messages = [{"role": "user", "content": "Responda em português."}]
    payload = {"model": model, "max_tokens": max_tokens, "messages": payload_messages}
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
        if response.status_code >= 400:
            raise GhostCliError(f"O Claude recusou a entrega (HTTP {response.status_code}).")
        blocks = response.json().get("content") or []
    text = "".join(block.get("text") or "" for block in blocks if isinstance(block, dict)).strip()
    if not text:
        raise GhostCliError("O Claude devolveu uma resposta vazia.")
    return text


async def _openai_compatible(*, url: str, key: str, system: str | None, messages: list[dict], model: str, max_tokens: int, failure: str) -> str:
    payload_messages: list[dict] = []
    if system:
        payload_messages.append({"role": "system", "content": system})
    for item in messages:
        role = item.get("role") or "user"
        if role not in {"system", "user", "assistant"}:
            role = "user"
        payload_messages.append({"role": role, "content": item.get("content") or ""})
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        response = await client.post(
            url,
            json={"model": model, "messages": payload_messages, "max_tokens": max_tokens},
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        if response.status_code >= 400:
            raise GhostCliError(f"{failure} (HTTP {response.status_code}).")
        text = _text_from_openai(response.json())
    if not text:
        raise GhostCliError(f"{failure}. A resposta veio vazia.")
    return text


async def complete_codex(*, system: str | None, messages: list[dict], model: str, max_tokens: int) -> str:
    key = codex_key()
    if not key:
        from app.modules.factory.motor_install import installation

        if installation("codex").get("logged_in"):
            return await _local_answer("codex", system, messages, model)
        raise GhostCliError("Plugue a chave do Codex em Integrações ou entre com o login do aplicativo.")
    return await _openai_compatible(
        url="https://api.openai.com/v1/chat/completions",
        key=key,
        system=system,
        messages=messages,
        model=model,
        max_tokens=max_tokens,
        failure="O Codex recusou a entrega",
    )


async def complete_antigravity(*, system: str | None, messages: list[dict], model: str, max_tokens: int) -> str:
    key = antigravity_key()
    base = antigravity_base()
    if not key or not base:
        raise GhostCliError("Plugue a chave e o endereço do Antigravity em Integrações.")
    return await _openai_compatible(
        url=f"{base}/chat/completions",
        key=key,
        system=system,
        messages=messages,
        model=model,
        max_tokens=max_tokens,
        failure="O Antigravity recusou a entrega",
    )
