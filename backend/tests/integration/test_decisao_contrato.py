"""A contra-assinatura abre uma decisão de contrato e repetir o clique não duplica."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.proposal import Proposal
from app.shared.database import Base, get_session


@pytest.mark.asyncio
async def test_contra_assinatura_abre_decisao_de_contrato(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'contrato.db').as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    try:
        async with maker() as session:
            session.add(
                Proposal(
                    id="prop-atlas",
                    num="PRO-1",
                    client="Atlas Holdings",
                    stage="pending",
                    status="Aceita pelo cliente · aguardando contra-assinatura",
                    value=48500,
                    summary="Landing comercial com três por cento de conversão.",
                )
            )
            session.add(
                Proposal(
                    id="prop-rascunho",
                    num="PRO-2",
                    client="Oficina Norte",
                    stage="progress",
                    status="Rascunho",
                )
            )
            await session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            blocked = await client.post("/api/v1/proposals/prop-rascunho/decision")
            assert blocked.status_code == 409

            first = await client.post("/api/v1/proposals/prop-atlas/decision")
            assert first.status_code == 200
            body = first.json()
            assert body["kind"] == "contract"
            assert body["question"] == "prop-atlas"
            assert "Contrato de Atlas Holdings" in body["description"]
            assert "R$ 48,5 mil" in body["description"]

            second = await client.post("/api/v1/proposals/prop-atlas/decision")
            assert second.status_code == 200
            assert second.json()["id"] == body["id"]

            listed = await client.get("/api/v1/approvals/")
            contracts = [row for row in listed.json() if row["kind"] == "contract"]
            assert len(contracts) == 1
            assert contracts[0]["id"] == body["id"]
    finally:
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
