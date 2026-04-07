"""Council output schema tests."""
from services.intelligence.council.schemas import CouncilOutput


def test_council_output_schema_version():
    """COUNCIL_OUTPUT_V1 schema is frozen — verify structure."""
    fields = set(CouncilOutput.model_fields.keys())
    expected = {
        "schema_version", "persona_id", "thesis_assessment",
        "key_claims_used", "key_claims_disputed", "mechanism",
        "falsification_test", "probability_thesis_correct",
        "outcome_distribution", "horizon", "confidence",
    }
    assert fields == expected


def test_council_output_default_version():
    """Schema version defaults to COUNCIL_OUTPUT_V1."""
    assert CouncilOutput.model_fields["schema_version"].default == "COUNCIL_OUTPUT_V1"
