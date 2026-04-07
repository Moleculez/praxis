"""Reddit client for financial discussion monitoring.

Data source: Reddit API via PRAW (paid API access required).
Rate limit: 1.0 req/sec default. Respects robots.txt and Reddit API ToS.
"""

from __future__ import annotations

from typing import Any


class RedditClient:
    """Fetches Reddit posts and comments from financial subreddits."""

    def __init__(self, client_id: str, client_secret: str, user_agent: str) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.user_agent = user_agent

    def fetch(self, subreddit: str, query: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        """Fetch posts from a subreddit, optionally filtered by query.

        Args:
            subreddit: Subreddit name (without r/ prefix).
            query: Optional search query.
            limit: Maximum number of posts to return.

        Returns:
            List of post metadata dicts.

        Raises:
            NotImplementedError: Stub — not yet implemented.
        """
        raise NotImplementedError
