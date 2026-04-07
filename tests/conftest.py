"""Shared test fixtures for Praxis."""
import os

import pytest


@pytest.fixture
def anyio_backend():
    """Use asyncio for async tests."""
    return "asyncio"


@pytest.fixture
def test_db_url():
    """Database URL for tests."""
    return os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://praxis:praxis@localhost:5432/praxis_test",
    )
