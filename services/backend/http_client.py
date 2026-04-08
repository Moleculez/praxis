"""Centralized httpx client factory with proxy support.

All outbound HTTP calls should use these helpers to ensure consistent
proxy configuration, timeouts, and User-Agent headers.

Usage:
    from services.backend.http_client import make_async_client, make_sync_client

    async with make_async_client() as client:
        resp = await client.get("https://example.com")

    client = make_sync_client()
    resp = client.get("https://example.com")
"""

from __future__ import annotations

import httpx


def _get_proxy() -> str | None:
    """Read proxy URL from settings (lazy import to avoid circular deps)."""
    try:
        from services.backend.config import get_settings
        proxy = get_settings().http_proxy
        return proxy if proxy else None
    except Exception:  # noqa: BLE001
        return None


def _get_no_proxy_hosts() -> set[str]:
    """Read no-proxy hosts from settings."""
    try:
        from services.backend.config import get_settings
        raw = get_settings().no_proxy
        return {h.strip() for h in raw.split(",") if h.strip()}
    except Exception:  # noqa: BLE001
        return {"localhost", "127.0.0.1"}


def _should_proxy(url: str) -> bool:
    """Return True if the URL should go through the proxy."""
    no_proxy = _get_no_proxy_hosts()
    for host in no_proxy:
        if host in url:
            return False
    return True


def make_async_client(
    *,
    timeout: float = 30.0,
    base_url: str = "",
    headers: dict[str, str] | None = None,
    **kwargs: object,
) -> httpx.AsyncClient:
    """Create an async httpx client with proxy from settings.

    For localhost URLs, proxy is bypassed automatically.
    """
    proxy = _get_proxy()
    if proxy and base_url and not _should_proxy(base_url):
        proxy = None

    transport = httpx.AsyncHTTPTransport(proxy=proxy)
    return httpx.AsyncClient(
        timeout=timeout,
        base_url=base_url,
        headers=headers or {},
        transport=transport,
        **kwargs,  # type: ignore[arg-type]
    )


def make_sync_client(
    *,
    timeout: float = 15.0,
    base_url: str = "",
    headers: dict[str, str] | None = None,
    **kwargs: object,
) -> httpx.Client:
    """Create a sync httpx client with proxy from settings.

    For localhost URLs, proxy is bypassed automatically.
    """
    proxy = _get_proxy()
    if proxy and base_url and not _should_proxy(base_url):
        proxy = None

    transport = httpx.HTTPTransport(proxy=proxy)
    return httpx.Client(
        timeout=timeout,
        base_url=base_url,
        headers=headers or {},
        transport=transport,
        **kwargs,  # type: ignore[arg-type]
    )
