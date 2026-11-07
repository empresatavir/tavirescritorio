"""Sessão local: a chave fica no hash, a sessão dura 12 h e o onboarding grava no SQLite."""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.main import app
from app.models.office_settings import OfficeSettings
from app.modules.auth.clock import set_fixed
from app.modules.auth.service import OFFICE_ID, secret_leaked
from app.shared.database import Base, get_session

SECRET = "tavir-chave-isolada-9f3a"
START = datetime(2026, 10, 29, 18, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_sessao_chave_hash_expiracao_e_onboarding(tmp_path, monkeypatch):
    monkeypatch.setenv("TAVIR_AUTH_TEST_CLOCK", "1")
    db_path = tmp_path / "sessao.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path.as_posix()}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    set_fixed(START)
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            missing = await client.post("/api/v1/auth/login", json={"secret": "   "})
            assert missing.status_code == 400
            assert missing.json()["detail"] == "Informe a chave local para continuar."

            first = await client.post("/api/v1/auth/login", json={"secret": SECRET})
            assert first.status_code == 200
            body = first.json()
            assert body["authenticated"] is True
            assert body["setup_required"] is False
            assert body["onboarding_complete"] is False
            assert SECRET not in first.text
            assert body["expires_at"].startswith("2026-10-30T06:00:00")

            wrong = await client.post("/api/v1/auth/login", json={"secret": "outra-chave"})
            assert wrong.status_code == 401
            assert wrong.json()["detail"] == "A chave local não confere."
            assert "outra-chave" not in wrong.text
            assert SECRET not in wrong.text

            alive = await client.get("/api/v1/auth/session")
            assert alive.status_code == 200
            assert alive.json()["authenticated"] is True

            done = await client.post("/api/v1/auth/onboarding/complete")
            assert done.status_code == 200
            assert done.json()["onboarding_complete"] is True

            set_fixed(START + timedelta(hours=12) - timedelta(seconds=1))
            still = await client.get("/api/v1/auth/session")
            assert still.json()["authenticated"] is True

            set_fixed(START + timedelta(hours=12) + timedelta(seconds=1))
            dead = await client.get("/api/v1/auth/session")
            assert dead.json()["authenticated"] is False
            assert dead.json()["onboarding_complete"] is True

            again = await client.post("/api/v1/auth/login", json={"secret": SECRET})
            assert again.status_code == 200
            assert again.json()["onboarding_complete"] is True

            closed = await client.post("/api/v1/auth/logout")
            assert closed.status_code == 200
            assert closed.json()["authenticated"] is False
            after = await client.get("/api/v1/auth/session")
            assert after.json()["authenticated"] is False

        async with maker() as session:
            row = await session.get(OfficeSettings, OFFICE_ID)
            assert row is not None
            assert row.operator_secret_hash
            assert row.operator_secret_hash != SECRET
            assert row.session_token_hash is None
            assert row.onboarding_completed_at is not None
            leaked = await secret_leaked(session, SECRET)
            assert leaked == []
            leaked_wrong = await secret_leaked(session, "outra-chave")
            assert leaked_wrong == []
    finally:
        set_fixed(None)
        app.dependency_overrides.pop(get_session, None)
        await engine.dispose()
