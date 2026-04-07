"""Research validation tests -- CPCV, DSR, PBO."""

import pytest

from services.research.validation.cpcv import run_cpcv
from services.research.validation.dsr import deflated_sharpe_ratio
from services.research.validation.pbo import probability_of_overfitting


class TestCPCV:
    """Combinatorial Purged Cross-Validation tests."""

    def test_cpcv_not_implemented(self):
        """CPCV stub raises NotImplementedError."""
        with pytest.raises(NotImplementedError):
            run_cpcv(X=..., y=..., n_splits=10, embargo_pct=0.01)


class TestDeflatedSharpe:
    """Deflated Sharpe Ratio tests."""

    def test_dsr_not_implemented(self):
        """DSR stub raises NotImplementedError."""
        with pytest.raises(NotImplementedError):
            deflated_sharpe_ratio(returns=..., num_trials=100)


class TestPBO:
    """Probability of Backtest Overfitting tests."""

    def test_pbo_not_implemented(self):
        """PBO stub raises NotImplementedError."""
        with pytest.raises(NotImplementedError):
            probability_of_overfitting(returns_matrix=..., n_partitions=10)
