"""Audit middleware — logs mutations to audit/decisions.jsonl."""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from services.backend.domain.audit import append_decision


class AuditMiddleware(BaseHTTPMiddleware):
    """Log all mutation requests (POST, PUT, PATCH, DELETE) to audit trail."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            append_decision(
                request=f"{request.method} {request.url.path}",
                lead="api",
                reason=f"status={response.status_code}",
            )
        return response
