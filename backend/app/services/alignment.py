"""
Half-hourly to hourly alignment service.

Elexon API semantics (verified against live data 2026-10-28):
  - FUELHH records contain average power (MW) for a 30-minute settlement period.
  - WINDFOR records contain average power (MW) for a 60-minute delivery interval.
  - Both are in MW (not MWh or cumulative energy).

Alignment rule:
  For each target delivery hour (startTime at :00), average the two FUELHH
  MW readings whose startTime falls within that hour:
    - SP_odd  (e.g., SP1: startTime 00:00)
    - SP_even (e.g., SP2: startTime 00:30)
  Result: hourly_actual_mw = (SP_odd_mw + SP_even_mw) / 2

  This is dimensionally correct: averaging two average-MW values over adjacent
  equal-length intervals yields the average MW for the combined interval.

Missing data handling:
  - If both half-hour records exist: use their average, partial=False.
  - If only one exists: use that single reading, partial=True (flagged).
  - If neither exists: exclude the hour entirely (no fabrication).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, NamedTuple, Optional

log = logging.getLogger(__name__)


class HourlyActual(NamedTuple):
    hour_start: datetime  # UTC, minutes/seconds = 0
    actual_mw: float
    partial: bool  # True if only one of two expected HH records was found


def aggregate_fuelhh_to_hourly(fuelhh_records: list[dict[str, Any]]) -> dict[datetime, HourlyActual]:
    """
    Group FUELHH WIND records by their target delivery hour and average them.

    Input records must already be filtered to fuelType == 'WIND' and the
    target settlementDate.

    Returns: dict mapping hour_start (UTC datetime) -> HourlyActual
    """
    # Group records by the hour their startTime falls in (floor to :00)
    hourly_buckets: dict[datetime, list[float]] = {}

    for record in fuelhh_records:
        start_str = record.get("startTime", "")
        generation = record.get("generation")
        if generation is None:
            log.warning("FUELHH record missing generation field: %r", record)
            continue
        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            generation = float(generation)
        except (ValueError, AttributeError, TypeError):
            log.warning("Invalid FUELHH record: %r", record)
            continue

        # Floor to the nearest hour (e.g., 00:30 → 00:00)
        hour_start = start_dt.replace(minute=0, second=0, microsecond=0)
        hourly_buckets.setdefault(hour_start, []).append(generation)

    result: dict[datetime, HourlyActual] = {}
    for hour_start, readings in hourly_buckets.items():
        if len(readings) == 1:
            # Only one of the two expected HH records is present — flag as partial
            actual_mw = readings[0]
            partial = True
            log.debug("Partial actual for hour %s: single reading %.1f MW", hour_start, actual_mw)
        elif len(readings) == 2:
            actual_mw = sum(readings) / 2.0
            partial = False
        else:
            # More than 2 records for one hour — unexpected; use mean and flag
            actual_mw = sum(readings) / len(readings)
            partial = True
            log.warning(
                "Unexpected %d FUELHH records for hour %s — using mean",
                len(readings), hour_start,
            )
        result[hour_start] = HourlyActual(hour_start=hour_start, actual_mw=actual_mw, partial=partial)

    return result
