"""Praxis backend entry point."""

from services.backend.adapters.http.app import create_app

app = create_app()
