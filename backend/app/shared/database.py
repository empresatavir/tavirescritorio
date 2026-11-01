"""Async database engine and session factory for TAVIR."""
import os
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from pathlib import Path

_DEFAULT_DB = Path(__file__).resolve().parent.parent.parent / "tavir.db"
DB_PATH = Path(os.environ["TAVIR_DB_PATH"]) if os.environ.get("TAVIR_DB_PATH") else _DEFAULT_DB
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"timeout": 30},
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@event.listens_for(engine.sync_engine, "connect")
def _sqlite_on_connect(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


class Base(DeclarativeBase):
    pass


async def ensure_schema_patches() -> None:
    """Patches leves para SQLite sem exigir alembic em todo boot (ex.: depends_on)."""
    # Garante tabelas novas (factory_runs / factory_stages / studio_decisions) sem migration manual.
    import app.models  # noqa: F401 — registra metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        async def _add_missing(table: str, column: str, ddl: str) -> None:
            res = await conn.execute(text(f"PRAGMA table_info({table})"))
            cols = {row[1] for row in res.fetchall()}
            if column not in cols:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))

        await _add_missing("tasks", "depends_on", "depends_on JSON")
        await _add_missing("profiles", "handle", "handle VARCHAR(100)")
        await _add_missing("profiles", "company", "company VARCHAR(200)")
        await _add_missing("profiles", "design_system", "design_system JSON")
        await _add_missing("profiles", "cycle_goal", "cycle_goal INTEGER DEFAULT 12")
        await _add_missing("profiles", "cycle_done", "cycle_done INTEGER DEFAULT 0")
        await _add_missing("pieces", "subtitle", "subtitle VARCHAR(300)")
        await _add_missing("pieces", "cta", "cta TEXT")
        await _add_missing("pieces", "slides", "slides JSON")
        await _add_missing("pieces", "progress", "progress INTEGER")
        await _add_missing("pieces", "squad", "squad VARCHAR(100)")
        await _add_missing("projects", "ai_settings", "ai_settings JSON")
        await _add_missing("integration_prefs", "is_default", "is_default BOOLEAN NOT NULL DEFAULT 0")
        await _add_missing("chat_messages", "images", "images TEXT")
        await _add_missing(
            "raiox_cases",
            "product_id",
            "product_id VARCHAR(40) NOT NULL DEFAULT 'diagnostico'",
        )
        await _add_missing(
            "raiox_cases",
            "deep_scan",
            "deep_scan BOOLEAN NOT NULL DEFAULT 0",
        )
        await _add_missing(
            "raiox_cases",
            "physical_store",
            "physical_store BOOLEAN NOT NULL DEFAULT 0",
        )
        await _add_missing("raiox_evidence", "front", "front VARCHAR(40)")
        await _add_missing(
            "raiox_cases",
            "origin",
            "origin VARCHAR(20) NOT NULL DEFAULT 'amigo'",
        )
        await _add_missing("raiox_cases", "segment", "segment VARCHAR(80)")
        await _add_missing("raiox_cases", "public_link", "public_link VARCHAR(500)")
        await _add_missing(
            "raiox_cases",
            "package_id",
            "package_id VARCHAR(20) NOT NULL DEFAULT 'basico'",
        )
        await _add_missing("projects", "control", "control JSON")
        await _add_missing("proposals", "raiox_case_id", "raiox_case_id VARCHAR(36)")
        await _add_missing("chat_messages", "actions", "actions JSON")
        await _add_missing("agents", "craft_text", "craft_text TEXT")
        await _add_missing("agents", "soul_locked", "soul_locked BOOLEAN NOT NULL DEFAULT 1")
        await _add_missing("office_settings", "operator_secret_hash", "operator_secret_hash TEXT")
        await _add_missing("office_settings", "session_token_hash", "session_token_hash TEXT")
        await _add_missing("office_settings", "session_expires_at", "session_expires_at DATETIME")
        await _add_missing("office_settings", "onboarding_completed_at", "onboarding_completed_at DATETIME")
        await _add_missing("office_settings", "daily_ceiling_usd", "daily_ceiling_usd FLOAT")
        await _add_missing("office_settings", "monthly_ceiling_usd", "monthly_ceiling_usd FLOAT")
        await _add_missing("office_settings", "perfil_idioma", "perfil_idioma VARCHAR(8) NOT NULL DEFAULT 'pt'")
        await _add_missing("office_settings", "tours_seen", "tours_seen JSON")
        await _add_missing("jobs", "cost_usd", "cost_usd FLOAT NOT NULL DEFAULT 0")
        await _add_missing("jobs", "tokens_total", "tokens_total INTEGER NOT NULL DEFAULT 0")
        await _add_missing("tasks", "gate_held", "gate_held BOOLEAN NOT NULL DEFAULT 0")
        await _add_missing("approvals", "group", "\"group\" VARCHAR(20)")
        await _add_missing("approvals", "kind", "kind VARCHAR(20)")
        await _add_missing("approvals", "question", "question TEXT")
        await _add_missing("approvals", "yes_steps", "yes_steps TEXT")
        await _add_missing("approvals", "no_steps", "no_steps TEXT")
        await _add_missing("approvals", "sla_hours", "sla_hours INTEGER")
        await _add_missing("approvals", "opened_at", "opened_at DATETIME")
        await _add_missing("agents", "reports_to", "reports_to VARCHAR(200)")


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session