"""O livro-razão lista o dia e não guarda segredo de cofre em details."""
import json
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.event import Event
from app.modules.office.ledger import _stamp, record_event
from app.shared.database import Base, get_session

SECRET = "cofre-meridian-nao-pode-aparecer"


@pytest.mark.asyncio
async def test_ledger_do_dia_omite_segredo(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'ledger.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            record_event(
                session,
                action="decisao.deploy",
                details=json.dumps({"note": "publicou a revisão", "secret": SECRET, "SUPABASE_URL": SECRET}),
            )
            await session.commit()
            stored = (await session.scalars(select(Event))).all()
            assert len(stored) == 1
            assert stored[0].details is not None
            assert SECRET not in stored[0].details
            assert "publicou a revisão" in stored[0].details
            day = _stamp(stored[0].created_at).date().isoformat()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            listed = await client.get("/api/v1/ledger", params={"day": day})
            assert listed.status_code == 200
            body = listed.json()
            assert body["day"] == day
            assert len(body["events"]) == 1
            assert body["events"][0]["action"] == "decisao.deploy"
            assert SECRET not in listed.text

            exported = await client.get("/api/v1/ledger/export", params={"day": day})
            assert exported.status_code == 200
            assert "attachment" in exported.headers["content-disposition"]
            assert f"ledger-{day}.txt" in exported.headers["content-disposition"]
            assert "decisao.deploy" in exported.text
            assert "publicou a revisão" in exported.text
            assert SECRET not in exported.text
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
