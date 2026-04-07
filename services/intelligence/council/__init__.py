"""PhD council — multi-provider LLM panel for thesis evaluation."""

from services.intelligence.council.schemas import CouncilOutput
from services.intelligence.council.synthesis import synthesize_council_outputs

__all__ = [
    "CouncilOutput",
    "synthesize_council_outputs",
]
