"""
Accuracy metric calculations for forecast vs actual wind generation.

Error convention: error = forecast_MW - actual_MW
  Positive error  → forecast exceeded actual (overforecast)
  Negative error  → forecast undershot actual (underforecast)

All metrics are in MW (megawatts). MAPE is intentionally excluded to avoid
division-by-zero risk when actual generation is near zero.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


@dataclass
class MetricResult:
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    matched_pairs: int
    expected_intervals: int
    coverage_pct: float


def compute_accuracy_metrics(
    pairs: Sequence[tuple[float, float]],
    expected_intervals: int,
) -> MetricResult:
    """
    Compute MAE, RMSE, bias, and coverage over matched (forecast, actual) pairs.

    Args:
        pairs: sequence of (forecast_mw, actual_mw) tuples — only valid matched pairs.
               Pairs with None values must be filtered out before calling this function.
        expected_intervals: total delivery intervals in the requested date range.

    Returns:
        MetricResult with all computed statistics.

    Raises:
        ValueError if pairs is empty.
    """
    n = len(pairs)
    if n == 0:
        raise ValueError("No matched pairs — cannot compute accuracy metrics.")

    errors = [f - a for f, a in pairs]
    abs_errors = [abs(e) for e in errors]
    squared_errors = [e * e for e in errors]

    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(squared_errors) / n)
    bias = sum(errors) / n
    coverage = (n / expected_intervals * 100.0) if expected_intervals > 0 else 0.0

    return MetricResult(
        mae_mw=round(mae, 2),
        rmse_mw=round(rmse, 2),
        bias_mw=round(bias, 2),
        matched_pairs=n,
        expected_intervals=expected_intervals,
        coverage_pct=round(coverage, 1),
    )
