"""O funil lê casos e propostas no SQLite e devolve os quatro números."""
from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.proposal import Proposal
from app.models.raiox_case import RaioxCase
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_funil_quatro_numeros_saem_dos_casos_e_propostas(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'funil.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    opened = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
    signed_at = datetime(2026, 10, 11, 12, 0, tzinfo=timezone.utc)
    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(
                RaioxCase(
                    id="caso-a",
                    company_name="Padaria do Largo",
                    objective="Vender",
                    decision_needed="Seguir",
                    debrief_decision="proposta_emitida",
                    created_at=opened,
                    updated_at=opened,
                )
            )
            session.add(
                RaioxCase(
                    id="caso-b",
                    company_name="Oficina Norte",
                    objective="Agenda",
                    decision_needed="Medir",
                    created_at=datetime(2026, 10, 19, 12, 0, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 10, 19, 12, 0, tzinfo=timezone.utc),
                )
            )
            session.add(
                Proposal(
                    id="p-viva",
                    num="PRO-1",
                    client="Padaria do Largo",
                    stage="progress",
                    status="Rascunho",
                    value=10000,
                    raiox_case_id="caso-a",
                    created_at=opened,
                    updated_at=opened,
                )
            )
            session.add(
                Proposal(
                    id="p-env",
                    num="PRO-2",
                    client="Oficina Norte",
                    stage="pending",
                    status="Enviada",
                    tone="wait",
                    value=20000,
                    raiox_case_id="caso-b",
                    created_at=opened,
                    updated_at=datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc),
                )
            )
            session.add(
                Proposal(
                    id="p-ok",
                    num="PRO-3",
                    client="Padaria do Largo",
                    stage="done",
                    status="Aceita e contra-assinada",
                    tone="ok",
                    value=40000,
                    raiox_case_id="caso-a",
                    created_at=opened,
                    updated_at=signed_at,
                )
            )
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/v1/commercial/funnel")
            assert res.status_code == 200
            body = res.json()
            assert body["open_label"] == "R$ 30,0 mil"
            assert body["open_count"] == 2
            assert body["conversion_label"] == "50%"
            assert body["cycle_label"] == "10 d"
            assert body["ticket_label"] == "R$ 30,0 mil"
            stages = {row["key"]: row["count"] for row in body["stages"]}
            assert stages["Casos abertos"] == 2
            assert stages["Assinada"] == 1
            assert {row["id"] for row in body["deals"]} == {"p-viva", "p-env"}
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
