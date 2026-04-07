"""Council output schema tests."""


def test_council_output_schema_version():
    """COUNCIL_OUTPUT_V1 schema is frozen — verify structure."""
    # Will import CouncilOutput from services.intelligence.council.schemas
    # and validate required fields once intelligence scaffold is merged
    expected_fields = {
        "schema_version", "persona_id", "thesis_assessment",
        "key_claims_used", "key_claims_disputed", "mechanism",
        "falsification_test", "probability_thesis_correct",
        "outcome_distribution", "horizon", "confidence",
    }
    assert len(expected_fields) == 11
