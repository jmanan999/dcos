from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DATABASE_ECHO,
    future=True,
)


@event.listens_for(engine.sync_engine, "connect")
def _register_asyncpg_codecs(dbapi_conn, _):
    """Register pgvector type codec so asyncpg can round-trip vector columns."""
    try:
        import asyncio

        async def _setup(conn):
            from pgvector.asyncpg import register_vector
            await register_vector(conn)

        asyncio.get_event_loop().run_until_complete(_setup(dbapi_conn))
    except Exception:
        pass  # codec registration is best-effort; fails gracefully outside asyncpg

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
