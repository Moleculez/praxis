"""API test fixtures."""
import pytest


@pytest.fixture
def base_url():
    """Base URL for the test API server."""
    return "http://localhost:8000"
