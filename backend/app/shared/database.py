"""Async database engine and session factory for TAVIR."""
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "tavir.db"
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


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session