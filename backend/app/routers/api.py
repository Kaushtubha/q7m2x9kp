"""
API router: /api/forecasts, /api/accuracy, /api/data-quality
"""

from __future__ import annotations

import logging
from datetime import date
from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.schemas import AccuracyMetrics, DataQualityReport, ForecastActualPair
from app.services.data_service import get_accuracy_metrics, get_data_quality, get_forecast_actuals

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# January 2026 is the valid scope for this application
_SCOPE_FROM = date(2026, 1, 1)
_SCOPE_TO = date(2026, 1, 31)


def _validate_dates(date_from: date, date_to: date) -> None:
    if date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be ≤ date_to")
    if date_from < _SCOPE_FROM or date_to > _SCOPE_TO:
        raise HTTPException(
            status_code=422,
            detail=f"Dates must be within January 2026 ({_SCOPE_FROM} to {_SCOPE_TO}).",
        )


@router.get(
    "/forecasts",
    response_model=List[ForecastActualPair],
    summary="Day-ahead forecast vs actual for each delivery hour",
)
def get_forecasts(
    date_from: date = Query(default=date(2026, 1, 1), description="Start delivery date (UTC)"),
    date_to: date = Query(default=date(2026, 1, 7), description="End delivery date (UTC, inclusive)"),
    cutoff_hour: int = Query(
        default=None,
        ge=0,
        le=23,
        description=(
            "Decision cutoff hour (UTC) on D-1. "
            "ASSUMPTION — not an official market rule. "
            "Defaults to DEFAULT_CUTOFF_HOUR env var (11)."
        ),
    ),
) -> List[ForecastActualPair]:
    _validate_dates(date_from, date_to)
    cutoff = cutoff_hour if cutoff_hour is not None else settings.default_cutoff_hour
    try:
        return get_forecast_actuals(date_from, date_to, cutoff)
    except Exception as exc:
        log.error("Error building forecast pairs: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Data retrieval error: {exc}") from exc


@router.get(
    "/accuracy",
    response_model=AccuracyMetrics,
    summary="Accuracy summary metrics (MAE, RMSE, Bias, Coverage)",
)
def get_accuracy(
    date_from: date = Query(default=date(2026, 1, 1)),
    date_to: date = Query(default=date(2026, 1, 7)),
    cutoff_hour: int = Query(default=None, ge=0, le=23),
) -> AccuracyMetrics:
    _validate_dates(date_from, date_to)
    cutoff = cutoff_hour if cutoff_hour is not None else settings.default_cutoff_hour
    try:
        result = get_accuracy_metrics(date_from, date_to, cutoff)
        return AccuracyMetrics(
            mae_mw=result.mae_mw,
            rmse_mw=result.rmse_mw,
            bias_mw=result.bias_mw,
            matched_pairs=result.matched_pairs,
            expected_intervals=result.expected_intervals,
            coverage_pct=result.coverage_pct,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        log.error("Error computing accuracy: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Metric computation error: {exc}") from exc


@router.get(
    "/data-quality",
    response_model=DataQualityReport,
    summary="Data availability and quality report",
)
def get_data_quality_report(
    date_from: date = Query(default=date(2026, 1, 1)),
    date_to: date = Query(default=date(2026, 1, 7)),
    cutoff_hour: int = Query(default=None, ge=0, le=23),
) -> DataQualityReport:
    _validate_dates(date_from, date_to)
    cutoff = cutoff_hour if cutoff_hour is not None else settings.default_cutoff_hour
    try:
        return get_data_quality(date_from, date_to, cutoff)
    except Exception as exc:
        log.error("Error building data quality report: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Data quality error: {exc}") from exc
