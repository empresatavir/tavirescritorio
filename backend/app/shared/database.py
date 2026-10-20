"""Async database engine and session factory for TAVIR."""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "tavir.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def ensure_schema_patches() -> None:
    """Patches leves para SQLite sem exigir alembic em todo boot (ex.: depends_on)."""
    # Garante tabelas novas (factory_runs / factory_stages) sem migration manual.
    import app.models  # noqa: F401 — registra metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        res = await conn.execute(text("PRAGMA table_info(tasks)"))
        cols = {row[1] for row in res.fetchall()}
        if "depends_on" not in cols:
            await conn.execute(text("ALTER TABLE tasks ADD COLUMN depends_on JSON"))


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session