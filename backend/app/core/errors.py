"""Custom exceptions and error handlers"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import structlog

logger = structlog.get_logger()


class AppException(Exception):
    """Base application exception"""

    def __init__(
        self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    ):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ResourceNotFound(AppException):
    """Resource not found exception"""

    def __init__(self, resource: str, resource_id: str):
        message = f"{resource} with id '{resource_id}' not found"
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class ResourceConflict(AppException):
    """Resource conflict exception"""

    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)


class ValidationError(AppException):
    """Validation error exception"""

    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


async def app_exception_handler(request: Request, exc: AppException):
    """Handler for custom application exceptions"""
    logger.error(
        "Application error",
        error=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "error_type": exc.__class__.__name__},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler for request validation errors"""
    errors = exc.errors()
    logger.warning(
        "Validation error",
        errors=errors,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": errors,
        },
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Handler for database integrity errors"""
    logger.error(
        "Database integrity error",
        error=str(exc.orig),
        path=request.url.path,
    )

    # Check for common integrity violations
    error_msg = str(exc.orig).lower()
    if "unique" in error_msg or "duplicate" in error_msg:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Resource already exists"},
        )
    elif "foreign key" in error_msg:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Invalid reference to related resource"},
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Database error occurred"},
        )


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    """Handler for general SQLAlchemy errors"""
    logger.error(
        "Database error",
        error=str(exc),
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred"},
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handler for unexpected exceptions"""
    logger.exception(
        "Unexpected error",
        error=str(exc),
        error_type=exc.__class__.__name__,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred"},
    )
