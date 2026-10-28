"""
Forecast selection service.

Policy (ASSUMPTION — not an official Gridbricks or market rule):
  For delivery day D, select the most recent WINDFOR publication run whose
  publishTime is STRICTLY LESS THAN cutoff_datetime on D-1 (day before delivery).

  Default cutoff: 11:00 UTC on D-1.

The strict comparison (< not <=) ensures that a run published exactly at the
cutoff is excluded. This prevents any lookahead bias and is consistently
applied throughout the application and its tests.

The cutoff is configurable via the API `cutoff_hour` parameter and the
DEFAULT_CUTOFF_HOUR environment variable.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

log = logging.getLogger(__name__)


def build_cutoff_datetime(delivery_date: date, cutoff_hour_utc: int) -> datetime:
    """
    Return the cutoff datetime for day-ahead forecasts targeting `delivery_date`.

    The cutoff is at `cutoff_hour_utc` UTC on the day BEFORE delivery.
    """
    day_before = delivery_date - timedelta(days=1)
    return datetime(
        day_before.year, day_before.month, day_before.day,
        cutoff_hour_utc, 0, 0, tzinfo=timezone.utc,
    )


def select_day_ahead_forecast_run(
    windfor_records: list[dict],
    delivery_date: date,
    cutoff_hour_utc: int = 11,
) -> Optional[str]:
    """
    From all WINDFOR records published on D-1, return the publishTime of the
    latest run that was published STRICTLY BEFORE the cutoff on D-1.

    Returns the selected publishTime string, or None if no qualifying run exists.
    """
    cutoff_dt = build_cutoff_datetime(delivery_date, cutoff_hour_utc)

    qualifying_runs: set[str] = set()
    for record in windfor_records:
        pub_str = record.get("publishTime", "")
        try:
            pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            log.warning("Invalid publishTime in WINDFOR record: %r", pub_str)
            continue

        # Strict less-than: exclude runs at or after the cutoff
        if pub_dt < cutoff_dt:
            qualifying_runs.add(pub_str)

    if not qualifying_runs:
        log.info(
            "No WINDFOR run qualifies for delivery_date=%s cutoff=%s",
            delivery_date, cutoff_dt.isoformat(),
        )
        return None

    # Latest qualifying run
    selected = max(qualifying_runs)
    log.info(
        "Selected WINDFOR run %s for delivery_date=%s (cutoff %s UTC)",
        selected, delivery_date, cutoff_dt.isoformat(),
    )
    return selected


def extract_hourly_forecasts_for_date(
    windfor_records: list[dict],
    selected_publish_time: str,
    delivery_date: date,
) -> dict[datetime, float]:
    """
    From the selected WINDFOR run, extract hourly forecast MW values
    whose startTime falls on `delivery_date`.

    Returns: dict mapping delivery_hour (datetime, UTC) -> forecast_mw (float)
    """
    delivery_date_str = delivery_date.isoformat()
    forecasts: dict[datetime, float] = {}

    for record in windfor_records:
        if record.get("publishTime") != selected_publish_time:
            continue
        start_str = record.get("startTime", "")
        if not start_str.startswith(delivery_date_str):
            continue
        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            generation = float(record["generation"])
        except (ValueError, KeyError, TypeError):
            log.warning("Invalid WINDFOR record: %r", record)
            continue
        forecasts[start_dt] = generation

    return forecasts
