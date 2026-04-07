"""Append-only audit logging per CLAUDE.md rule 8.

NEVER truncate or overwrite audit files. Append only.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

AUDIT_DIR = Path("audit")


def append_decision(request: str, lead: str, reason: str) -> None:
    """Append a delegation decision to the audit log."""
    entry = {
        "ts": datetime.now(UTC).isoformat(),
        "request": request,
        "lead": lead,
        "reason": reason,
    }
    _append_jsonl(AUDIT_DIR / "decisions.jsonl", entry)


def append_incident(agent: str, error: str, context: str = "") -> None:
    """Append a failure incident to the audit log."""
    entry = {
        "ts": datetime.now(UTC).isoformat(),
        "agent": agent,
        "error": error,
        "context": context,
    }
    _append_jsonl(AUDIT_DIR / "incidents.jsonl", entry)


def _append_jsonl(path: Path, entry: dict[str, str]) -> None:
    """Append a single JSON line to a file. Creates parent dirs if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
