"""Responder e encaminhar mudam o status gravado em inbox_messages."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.inbox_message import InboxMessage
from app.shared.database import Base, get_session


def _message(message_id: str, sender: str) -> InboxMessage:
    return InboxMessage(
        id=message_id,
        sender=sender,
        body="Quero falar sobre o site.",
        status="received",
        kind="existing",
    )


@pytest.mark.asyncio
async def test_resposta_e_encaminhamento_gravam_status(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'inbox.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(_message("msg-resposta", "Dono da padaria"))
            session.add(_message("msg-frente", "Marina"))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            empty = await client.post("/api/v1/inbox/messages/msg-resposta/reply", json={"text": "   "})
            assert empty.status_code == 400
            assert empty.json()["detail"] == "Informe a resposta."

            missing = await client.post("/api/v1/inbox/messages/nao-existe/forward", json={"to": "Yuri"})
            assert missing.status_code == 404

            replied = await client.post(
                "/api/v1/inbox/messages/msg-resposta/reply",
                json={"text": "Podemos falar amanhã."},
            )
            assert replied.status_code == 200
            assert replied.json()["status"] == "replied"
            assert replied.json()["reply_text"] == "Podemos falar amanhã."

            forwarded = await client.post(
                "/api/v1/inbox/messages/msg-frente/forward",
                json={"to": "  Yuri  "},
            )
            assert forwarded.status_code == 200
            assert forwarded.json()["status"] == "forwarded"
            assert forwarded.json()["forward_to"] == "Yuri"

            listed = await client.get("/api/v1/inbox/messages")
            by_id = {row["id"]: row for row in listed.json()["messages"]}
            assert by_id["msg-resposta"]["status"] == "replied"
            assert by_id["msg-frente"]["status"] == "forwarded"

        async with maker() as session:
            count = await session.scalar(select(func.count()).select_from(InboxMessage))
            reply = await session.get(InboxMessage, "msg-resposta")
            forward = await session.get(InboxMessage, "msg-frente")
            assert count == 2
            assert reply is not None and reply.status == "replied"
            assert reply.reply_text == "Podemos falar amanhã."
            assert forward is not None and forward.status == "forwarded"
            assert forward.forward_to == "Yuri"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
