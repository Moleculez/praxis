"""Feature registry loader and validator."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


def load_registry(path: Path | None = None) -> dict[str, Any]:
    """Load and validate features/registry.yaml.

    Args:
        path: Override path to registry.yaml. Defaults to repo root features/registry.yaml.

    Returns:
        Parsed registry dictionary.
    """
    if path is None:
        path = Path(__file__).resolve().parents[3] / "features" / "registry.yaml"

    with open(path) as f:
        data: dict[str, Any] = yaml.safe_load(f)

    if "features" not in data:
        msg = "Registry YAML must contain a top-level 'features' key."
        raise ValueError(msg)

    return data
