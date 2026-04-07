"""arXiv API client for quantitative finance research papers.

Data source: https://export.arxiv.org/api
Rate limit: 0.33 req/sec (3-second delay between requests). Respects robots.txt.
"""

from __future__ import annotations

from typing import Any


class ArxivClient:
    """Fetches research papers from the arXiv API."""

    def __init__(self) -> None:
        pass

    def fetch(self, query: str, max_results: int = 50, category: str = "q-fin") -> list[dict[str, Any]]:
        """Fetch papers from arXiv matching a query.

        Args:
            query: Search query string.
            max_results: Maximum number of papers to return.
            category: arXiv category filter (default: q-fin).

        Returns:
            List of paper metadata dicts.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
