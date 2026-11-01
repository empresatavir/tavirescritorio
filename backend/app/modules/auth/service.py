"""Sessão local do operador. A chave nunca entra em evento, chat ou resposta."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.event import Event
from app.models.office_settings import OfficeSettings
from app.modules.auth.clock import now
from app.modules.office.ledger import record_event

OFFICE_ID = "office"
SESSION_HOURS = 12
PBKDF2_ROUNDS = 120_000
EMPTY_DETAIL = "Informe a chave local para continuar."
REJECT_DETAIL = "A chave local não confere."


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def hash_secret(secret: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, PBKDF2_ROUNDS)
    return f"{salt.hex()}${digest.hex()}"


def secret_matches(secret: str, stored: str | None) -> bool:
    if not stored or "$" not in stored:
        return False
    salt_hex, digest_hex = stored.split("$", 1)
    try:
        salt = bytes.fromhex(salt_hex)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, PBKDF2_ROUNDS)
    return hmac.compare_digest(digest.hex(), digest_hex)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def office_row(session: AsyncSession) -> OfficeSettings:
    row = await session.get(OfficeSettings, OFFICE_ID)
    if row is None:
        row = OfficeSettings(id=OFFICE_ID, perfil_nome="", perfil_email="", overview={})
        session.add(row)
        await session.flush()
    return row


def public_state(row: OfficeSettings, authenticated: bool) -> dict:
    expires = row.session_expires_at
    if isinstance(expires, datetime):
        expires_at = _as_utc(expires).isoformat()
    else:
        expires_at = None
    name = (row.perfil_nome or "").strip() or "Carlos · CEO"
    return {
        "authenticated": authenticated,
        "setup_required": not row.operator_secret_hash,
        "onboarding_complete": row.onboarding_completed_at is not None,
        "expires_at": expires_at if authenticated else None,
        "operator": name,
    }


def session_is_live(row: OfficeSettings, token: str | None) -> bool:
    if not token or not row.session_token_hash or not row.session_expires_at:
        return False
    current = token_hash(token)
    if len(current) != len(row.session_token_hash):
        return False
    if not hmac.compare_digest(current, row.session_token_hash):
        return False
    expires = row.session_expires_at
    if not isinstance(expires, datetime):
        return False
    return _as_utc(expires) > now()


def _event(session: AsyncSession, action: str, details: str) -> Event:
    return record_event(session, action=action, details=details, event_type="sessao")


async def open_session(session: AsyncSession, secret: str) -> tuple[dict, str | None, int]:
    """Devolve o estado público, o token cru (só para o cookie) e o status HTTP."""
    cleaned = secret.strip()
    row = await office_row(session)
    if not cleaned:
        return public_state(row, False), None, 400

    if row.operator_secret_hash:
        if not secret_matches(cleaned, row.operator_secret_hash):
            _event(session, "sessao.recusada", "chave recusada")
            await session.commit()
            state = public_state(row, False)
            state["detail"] = REJECT_DETAIL
            return state, None, 401
    else:
        row.operator_secret_hash = hash_secret(cleaned)

    token = secrets.token_urlsafe(32)
    row.session_token_hash = token_hash(token)
    row.session_expires_at = now() + timedelta(hours=SESSION_HOURS)
    _event(session, "sessao.aberta", "operador autenticado nesta máquina")
    await session.commit()
    await session.refresh(row)
    return public_state(row, True), token, 200


async def read_session(session: AsyncSession, token: str | None) -> dict:
    row = await office_row(session)
    live = session_is_live(row, token)
    if token and row.session_token_hash and not live:
        row.session_token_hash = None
        row.session_expires_at = None
        await session.commit()
        await session.refresh(row)
    return public_state(row, live)


async def close_session(session: AsyncSession) -> dict:
    row = await office_row(session)
    row.session_token_hash = None
    row.session_expires_at = None
    _event(session, "sessao.encerrada", "a chave continua só nesta máquina")
    await session.commit()
    await session.refresh(row)
    return public_state(row, False)


async def complete_onboarding(session: AsyncSession, token: str | None) -> tuple[dict, int]:
    row = await office_row(session)
    if not session_is_live(row, token):
        return public_state(row, False), 401
    if row.onboarding_completed_at is None:
        row.onboarding_completed_at = now()
        _event(session, "onboarding.concluido", "o próximo acesso não reabre o onboarding")
    await session.commit()
    await session.refresh(row)
    return public_state(row, True), 200


async def secret_leaked(session: AsyncSession, secret: str) -> list[str]:
    """Onde o segredo apareceu. A lista vazia é o contrato."""
    found: list[str] = []
    events = (await session.scalars(select(Event))).all()
    for event in events:
        blob = " ".join(
            part
            for part in (event.action, event.details, event.actor, event.event_type)
            if part
        )
        if secret in blob:
            found.append(f"event:{event.id}")
    messages = (await session.scalars(select(ChatMessage))).all()
    for message in messages:
        if secret in (message.text or ""):
            found.append(f"chat:{message.id}")
    row = await session.get(OfficeSettings, OFFICE_ID)
    if row and row.operator_secret_hash and secret in row.operator_secret_hash:
        found.append("office_settings.operator_secret_hash")
    return found
