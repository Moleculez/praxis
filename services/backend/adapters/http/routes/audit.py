"""Audit log read-only routes."""

import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()


def _read_jsonl(path: Path, offset: int, limit: int) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text().strip()
    if not text:
        return []
    lines = [line for line in text.split("\n") if line]
    entries: list[dict] = [json.loads(line) for line in lines]
    return entries[offset : offset + limit]


@router.get("/decisions")
async def list_decisions(limit: int = 100, offset: int = 0) -> list[dict]:
    return _read_jsonl(Path("audit/decisions.jsonl"), offset, limit)


@router.get("/incidents")
async def list_incidents(limit: int = 100, offset: int = 0) -> list[dict]:
    return _read_jsonl(Path("audit/incidents.jsonl"), offset, limit)
