"""
Tests for accuracy metric calculations.
Deterministic inputs with hand-verified expected values.
"""

import math
import pytest

from app.services.metrics import compute_accuracy_metrics


class TestComputeAccuracyMetrics:
    def test_standard_case(self):
        """
        Pairs: (15000, 14000), (12000, 13000), (16000, 16000)
        Errors:      1000,        -1000,            0
        MAE  = (1000 + 1000 + 0) / 3     = 666.67
        RMSE = sqrt((1M + 1M + 0) / 3)   = sqrt(666666.67) = 816.50
        Bias = (1000 - 1000 + 0) / 3     = 0.0
        Coverage = 3/3 = 100%
        """
        pairs = [(15000, 14000), (12000, 13000), (16000, 16000)]
        result = compute_accuracy_metrics(pairs, expected_intervals=3)
        assert abs(result.mae_mw - 666.67) < 0.5
        assert abs(result.rmse_mw - 816.50) < 0.5
        assert abs(result.bias_mw - 0.0) < 0.01
        assert result.matched_pairs == 3
        assert result.coverage_pct == 100.0

    def test_positive_bias(self):
        """All errors positive → positive mean bias (systematic overforecast)."""
        pairs = [(1000, 500), (2000, 1000)]
        result = compute_accuracy_metrics(pairs, expected_intervals=2)
        assert result.bias_mw > 0

    def test_negative_bias(self):
        """All errors negative → negative mean bias (systematic underforecast)."""
        pairs = [(500, 1000), (800, 1200)]
        result = compute_accuracy_metrics(pairs, expected_intervals=4)
        assert result.bias_mw < 0
        assert result.coverage_pct == 50.0  # 2 matched of 4 expected

    def test_perfect_forecast(self):
        pairs = [(10000, 10000), (12000, 12000)]
        result = compute_accuracy_metrics(pairs, expected_intervals=2)
        assert result.mae_mw == 0.0
        assert result.rmse_mw == 0.0
        assert result.bias_mw == 0.0

    def test_empty_pairs_raises_value_error(self):
        with pytest.raises(ValueError):
            compute_accuracy_metrics([], expected_intervals=24)

    def test_coverage_below_100(self):
        pairs = [(15000, 14000)]
        result = compute_accuracy_metrics(pairs, expected_intervals=24)
        assert abs(result.coverage_pct - (1 / 24 * 100)) < 0.1

    def test_rmse_greater_than_or_equal_mae(self):
        """RMSE ≥ MAE always (by Jensen's inequality)."""
        pairs = [(100, 80), (200, 250), (150, 100), (300, 350)]
        result = compute_accuracy_metrics(pairs, expected_intervals=4)
        assert result.rmse_mw >= result.mae_mw

    def test_error_convention_forecast_minus_actual(self):
        """Error = forecast - actual. forecast > actual → positive error."""
        pairs = [(20000, 18000)]  # overforecast by 2000
        result = compute_accuracy_metrics(pairs, expected_intervals=1)
        assert result.bias_mw == 2000.0  # positive = overforecast
