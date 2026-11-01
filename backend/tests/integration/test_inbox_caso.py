"""Mensagem de cliente novo abre um caso de Raio-X e guarda o id."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.inbox_message import InboxMessage
from app.models.raiox_case import RaioxCase
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_cliente_novo_abre_um_caso(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'inbox-caso.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(InboxMessage(
                id="msg-novo",
                sender="Padaria Nova",
                body="Quero aparecer no Google.",
                status="received",
                kind="new",
            ))
            session.add(InboxMessage(
                id="msg-antiga",
                sender="Cliente antigo",
                body="Só um retorno.",
                status="received",
                kind="existing",
            ))
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            blocked = await client.post("/api/v1/inbox/messages/msg-antiga/case")
            assert blocked.status_code == 409

            opened = await client.post("/api/v1/inbox/messages/msg-novo/case")
            assert opened.status_code == 200
            case_id = opened.json()["case_id"]
            assert opened.json()["company_name"] == "Padaria Nova"
            assert case_id

            again = await client.post("/api/v1/inbox/messages/msg-novo/case")
            assert again.json()["case_id"] == case_id

            listed = await client.get("/api/v1/raiox/cases")
            match = [row for row in listed.json() if row["id"] == case_id]
            assert len(match) == 1
            assert match[0]["company_name"] == "Padaria Nova"
            assert match[0]["objective"] == "Quero aparecer no Google."

        async with maker() as session:
            cases = await session.scalar(select(func.count()).select_from(RaioxCase))
            message = await session.get(InboxMessage, "msg-novo")
            stored = await session.get(RaioxCase, case_id)
            assert cases == 1
            assert message is not None and message.raiox_case_id == case_id
            assert stored is not None and stored.company_name == "Padaria Nova"
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
