import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator
from app.core.config import settings

# Create async engine with conservative connection pooling
# Using Supabase Session Mode pooler (port 5432)
# With shared monitor session fix, we can safely increase pool for API requests
# Monitor service: 1 shared session (no longer leaking connections)
# API endpoints: up to 11 concurrent requests supported
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_size=4,  # 4 persistent connections
    max_overflow=10,  # Maximum 14 total connections (safe under Supabase's ~15 limit)
    pool_pre_ping=True,  # Test connections before using them
    pool_recycle=1800,  # Recycle connections after 30 minutes
    pool_timeout=30,  # Wait up to 30 seconds for a connection
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base class for models
Base = declarative_base()

_db_initialized = False
_db_init_lock = asyncio.Lock()


async def ensure_db_initialized():
    """Ensure database schema exists (idempotent)."""
    global _db_initialized
    if _db_initialized:
        return

    async with _db_init_lock:
        if _db_initialized:
            return

        await init_db()
        _db_initialized = True


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions"""
    await ensure_db_initialized()
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Backfill missing columns for legacy databases (lightweight migration)
        backend = engine.url.get_backend_name()

        if backend.startswith("sqlite"):
            # Users table migration
            result = await conn.execute(text("PRAGMA table_info(users)"))
            columns = {row[1] for row in result}
            if "hashed_password" not in columns:
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)")
                )

            # Alert rules table migration for position-based alerts
            result = await conn.execute(text("PRAGMA table_info(alert_rules)"))
            columns = {row[1] for row in result}
            if "scope" not in columns:
                await conn.execute(
                    text("ALTER TABLE alert_rules ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'account'")
                )
            if "position_market" not in columns:
                await conn.execute(
                    text("ALTER TABLE alert_rules ADD COLUMN position_market VARCHAR(50)")
                )

            # Alert history table migration for description field
            result = await conn.execute(text("PRAGMA table_info(alert_history)"))
            columns = {row[1] for row in result}
            if "description" not in columns:
                await conn.execute(
                    text("ALTER TABLE alert_history ADD COLUMN description TEXT")
                )

        elif backend == "postgresql":
            # PostgreSQL migrations
            # Check if scope column exists
            result = await conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='alert_rules' AND column_name='scope'
            """))
            if not result.fetchone():
                await conn.execute(
                    text("ALTER TABLE alert_rules ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'account'")
                )
                await conn.execute(
                    text("CREATE INDEX idx_alert_rules_scope ON alert_rules(scope)")
                )

            # Check if position_market column exists
            result = await conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='alert_rules' AND column_name='position_market'
            """))
            if not result.fetchone():
                await conn.execute(
                    text("ALTER TABLE alert_rules ADD COLUMN position_market VARCHAR(50)")
                )
                await conn.execute(
                    text("CREATE INDEX idx_alert_rules_position_market ON alert_rules(position_market)")
                )

            # Check if description column exists in alert_history
            result = await conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='alert_history' AND column_name='description'
            """))
            if not result.fetchone():
                await conn.execute(
                    text("ALTER TABLE alert_history ADD COLUMN description TEXT")
                )

    global _db_initialized
    _db_initialized = True
