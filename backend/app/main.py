from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.config import settings
from app.core.database import init_db
from app.core.logging import logger
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    sqlalchemy_error_handler,
    general_exception_handler,
)
from app.api import subaccounts, channels, alerts, alert_rules, websocket, auth, markets
from app.services.monitor_service import monitor_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("Starting dYdX Alert application...")

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    monitor_task = None
    if settings.ENABLE_MONITOR:
        import asyncio

        monitor_task = asyncio.create_task(monitor_service.start())
        logger.info("Monitor service started")
    else:
        logger.info("Monitor service disabled via settings")

    yield

    # Shutdown
    logger.info("Shutting down dYdX Alert application...")
    if settings.ENABLE_MONITOR:
        await monitor_service.stop()
        if monitor_task:
            monitor_task.cancel()
        logger.info("Monitor service stopped")


# Create FastAPI application
app = FastAPI(title=settings.APP_NAME, version=settings.VERSION, lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register error handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(auth.router)
app.include_router(subaccounts.router)
app.include_router(channels.router)
app.include_router(alerts.router)
app.include_router(alert_rules.router)
app.include_router(markets.router)
app.include_router(websocket.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {"name": settings.APP_NAME, "version": settings.VERSION, "status": "running"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "monitor_running": monitor_service.running,
        "monitored_subaccounts": len(monitor_service.monitored_subaccounts),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG
    )
