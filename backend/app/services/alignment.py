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

    Handles duplicate settlement-period records deterministically by slot
    (0 for 00-30m, 1 for 30-60m).

    Returns: dict mapping hour_start (UTC datetime) -> HourlyActual
    """
    # Group records by hour_start -> {slot: generation} where slot is 0 or 1
    hourly_slots: dict[datetime, dict[int, float]] = {}

    for record in fuelhh_records:
        start_str = record.get("startTime", "")
        generation = record.get("generation")
        if generation is None:
            log.warning("FUELHH record missing generation field: %r", record)
            continue
        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            gen_val = float(generation)
        except (ValueError, AttributeError, TypeError):
            log.warning("Invalid FUELHH record: %r", record)
            continue

        # Floor to the target delivery hour (e.g., 00:30 -> 00:00)
        hour_start = start_dt.replace(minute=0, second=0, microsecond=0)
        slot = 0 if start_dt.minute < 30 else 1

        # Deduplicate: if duplicate record for the same half-hour slot arrives, keep latest valid reading
        hourly_slots.setdefault(hour_start, {})[slot] = gen_val

    result: dict[datetime, HourlyActual] = {}
    for hour_start, slots in hourly_slots.items():
        if len(slots) == 2:
            actual_mw = (slots[0] + slots[1]) / 2.0
            partial = False
        elif len(slots) == 1:
            actual_mw = next(iter(slots.values()))
            partial = True
            log.debug("Partial actual for hour %s: single half-hour slot reading %.1f MW", hour_start, actual_mw)
        else:
            continue

        result[hour_start] = HourlyActual(hour_start=hour_start, actual_mw=actual_mw, partial=partial)

    return result
