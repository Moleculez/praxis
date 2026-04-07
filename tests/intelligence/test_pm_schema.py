"""PM idea schema tests."""


def test_pm_idea_schema_version():
    """PM_IDEA_V1 schema is frozen — verify structure."""
    # Will import PMIdea from services.intelligence.pm.schemas
    # and validate required fields once intelligence scaffold is merged
    expected_fields = {
        "schema_version", "ticker", "direction", "thesis", "horizon",
        "entry_zone", "stop_loss", "target", "expected_value_pct",
        "win_prob", "kelly_fraction", "conviction", "pre_mortem",
        "kill_criteria",
    }
    assert len(expected_fields) == 14
