"""
Data orchestration service — coordinates Elexon client, forecast selection,
hourly alignment, and metric calculation for a date range.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from app.clients.elexon import fetch_fuelhh_wind_for_date, fetch_windfor_published_on
from app.services.alignment import aggregate_fuelhh_to_hourly
from app.services.selection import (
    select_day_ahead_forecast_run,
    extract_hourly_forecasts_for_date,
)
from app.services.metrics import compute_accuracy_metrics, MetricResult
from app.schemas import ForecastActualPair, DataQualityReport

log = logging.getLogger(__name__)


def _date_range(date_from: date, date_to: date) -> list[date]:
    """Return list of dates from date_from to date_to inclusive."""
    result = []
    current = date_from
    while current <= date_to:
        result.append(current)
        current += timedelta(days=1)
    return result


def _process_single_date(delivery_date: date, cutoff_hour_utc: int) -> list[ForecastActualPair]:
    """Process a single delivery date and return its 24 hourly pairs."""
    day_before = delivery_date - timedelta(days=1)

    # 1. Fetch WINDFOR published on D-1
    try:
        windfor_records = fetch_windfor_published_on(day_before)
    except Exception as exc:
        log.error("Failed to fetch WINDFOR for D-1=%s: %s", day_before, exc)
        windfor_records = []

    # 2. Select the qualifying day-ahead run
    selected_run = select_day_ahead_forecast_run(
        windfor_records, delivery_date, cutoff_hour_utc
    )

    # 3. Extract hourly forecasts from the selected run
    hourly_forecasts: dict[datetime, float] = {}
    if selected_run:
        hourly_forecasts = extract_hourly_forecasts_for_date(
            windfor_records, selected_run, delivery_date
        )

    # 4. Fetch FUELHH wind actuals for the delivery date
    try:
        fuelhh_records = fetch_fuelhh_wind_for_date(delivery_date)
    except Exception as exc:
        log.error("Failed to fetch FUELHH for %s: %s", delivery_date, exc)
        fuelhh_records = []

    # 5. Aggregate HH actuals to hourly
    hourly_actuals = aggregate_fuelhh_to_hourly(fuelhh_records)

    day_pairs: list[ForecastActualPair] = []

    # 6. Build matched pairs for all 24 delivery hours
    for hour in range(24):
        delivery_hour = datetime(
            delivery_date.year, delivery_date.month, delivery_date.day,
            hour, 0, 0, tzinfo=timezone.utc,
        )
        forecast_mw: Optional[float] = hourly_forecasts.get(delivery_hour)
        actual_data = hourly_actuals.get(delivery_hour)
        actual_mw: Optional[float] = actual_data.actual_mw if actual_data else None
        partial = actual_data.partial if actual_data else False

        error_mw: Optional[float] = None
        lead_time_hours: Optional[float] = None
        publish_time: Optional[datetime] = None

        if forecast_mw is not None and actual_mw is not None:
            error_mw = round(forecast_mw - actual_mw, 2)

        if selected_run:
            try:
                publish_time = datetime.fromisoformat(
                    selected_run.replace("Z", "+00:00")
                )
                lead_time_hours = round(
                    (delivery_hour - publish_time).total_seconds() / 3600, 1
                )
            except ValueError:
                pass

        day_pairs.append(ForecastActualPair(
            delivery_hour=delivery_hour,
            forecast_mw=forecast_mw,
            actual_mw=actual_mw,
            error_mw=error_mw,
            publish_time=publish_time,
            lead_time_hours=lead_time_hours,
            actual_partial=partial,
        ))

    return day_pairs


def get_forecast_actuals(
    date_from: date,
    date_to: date,
    cutoff_hour_utc: int = 11,
) -> list[ForecastActualPair]:
    """
    For each delivery date in the range, retrieve:
      1. WINDFOR forecasts published on D-1 and select the day-ahead run.
      2. FUELHH WIND actuals aggregated to hourly average MW.
      3. Match the two and build ForecastActualPair records.

    Uses a thread pool to process days concurrently while preserving chronological order.
    Returns one record per delivery hour across all dates in range.
    """
    dates = _date_range(date_from, date_to)
    if not dates:
        return []

    import concurrent.futures

    max_workers = min(len(dates), 8)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        day_results = list(
            executor.map(lambda d: _process_single_date(d, cutoff_hour_utc), dates)
        )

    pairs: list[ForecastActualPair] = []
    for r in day_results:
        pairs.extend(r)

    return pairs


def get_accuracy_metrics(
    date_from: date,
    date_to: date,
    cutoff_hour_utc: int = 11,
) -> MetricResult:
    """Compute accuracy metrics for the given date range."""
    pairs = get_forecast_actuals(date_from, date_to, cutoff_hour_utc)
    dates = _date_range(date_from, date_to)
    expected = len(dates) * 24

    matched = [
        (p.forecast_mw, p.actual_mw)
        for p in pairs
        if p.forecast_mw is not None and p.actual_mw is not None
    ]
    return compute_accuracy_metrics(matched, expected)


def get_data_quality(
    date_from: date,
    date_to: date,
    cutoff_hour_utc: int = 11,
) -> DataQualityReport:
    """Build a data quality report for the given date range."""
    pairs = get_forecast_actuals(date_from, date_to, cutoff_hour_utc)
    expected = len(_date_range(date_from, date_to)) * 24

    matched = sum(1 for p in pairs if p.forecast_mw is not None and p.actual_mw is not None)
    missing_forecast = sum(1 for p in pairs if p.forecast_mw is None)
    missing_actual = sum(1 for p in pairs if p.actual_mw is None)
    partial_actual = sum(1 for p in pairs if p.actual_partial)
    forecast_available = sum(1 for p in pairs if p.forecast_mw is not None)
    actual_available = sum(1 for p in pairs if p.actual_mw is not None)

    return DataQualityReport(
        source="live_elexon",
        last_fetched_utc=datetime.now(tz=timezone.utc),
        date_from=date_from,
        date_to=date_to,
        cutoff_hour_utc=cutoff_hour_utc,
        total_delivery_hours=expected,
        forecast_available=forecast_available,
        actual_available=actual_available,
        matched_pairs=matched,
        partial_actual_count=partial_actual,
        missing_forecast_count=missing_forecast,
        missing_actual_count=missing_actual,
    )
