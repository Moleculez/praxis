"""Shared response schemas."""

from pydantic import BaseModel


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    offset: int
    limit: int


class StatusUpdate(BaseModel):
    status: str


class ErrorResponse(BaseModel):
    detail: str
