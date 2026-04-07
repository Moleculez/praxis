"""Domain layer — pure Python models, errors, and port interfaces."""

from services.backend.domain.audit import append_decision, append_incident

__all__ = ["append_decision", "append_incident"]
