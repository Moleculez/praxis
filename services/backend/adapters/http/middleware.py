"""HTTP middleware — error handling, idempotency."""

from fastapi import Request
from fastapi.responses import JSONResponse

from services.backend.domain.errors import (
    ConflictError,
    DomainError,
    NotFoundError,
    ValidationError,
)


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    status_map: dict[type[DomainError], int] = {
        NotFoundError: 404,
        ValidationError: 422,
        ConflictError: 409,
    }
    status = status_map.get(type(exc), 500)
    return JSONResponse(status_code=status, content={"detail": exc.message})
