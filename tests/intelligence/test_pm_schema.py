"""PM idea schema tests."""
from services.intelligence.pm.schemas import PMIdea


def test_pm_idea_schema_version():
    """PM_IDEA_V1 schema is frozen — verify structure."""
    fields = set(PMIdea.model_fields.keys())
    expected = {
        "schema_version", "ticker", "direction", "thesis", "horizon",
        "entry_zone", "stop_loss", "target", "expected_value_pct",
        "win_prob", "kelly_fraction", "conviction", "pre_mortem",
        "kill_criteria",
    }
    assert fields == expected


def test_pm_idea_default_version():
    """Schema version defaults to PM_IDEA_V1."""
    assert PMIdea.model_fields["schema_version"].default == "PM_IDEA_V1"
