"""
Tests for forecast selection logic.

Uses only deterministic fixture data — no live API calls.
"""

import json
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from app.services.selection import (
    build_cutoff_datetime,
    select_day_ahead_forecast_run,
    extract_hourly_forecasts_for_date,
)

FIXTURES = Path(__file__).parent / "fixtures"


def load_windfor_fixture() -> list[dict]:
    return json.loads((FIXTURES / "windfor_sample.json").read_text())


class TestBuildCutoffDatetime:
    def test_default_cutoff_11_utc(self):
        cutoff = build_cutoff_datetime(date(2026, 1, 2), cutoff_hour_utc=11)
        assert cutoff == datetime(2026, 1, 1, 11, 0, 0, tzinfo=timezone.utc)

    def test_cutoff_day_is_day_before_delivery(self):
        cutoff = build_cutoff_datetime(date(2026, 1, 31), cutoff_hour_utc=9)
        assert cutoff.date() == date(2026, 1, 30)
        assert cutoff.hour == 9


class TestSelectDayAheadForecastRun:
    """
    Fixture WINDFOR runs for delivery 2026-01-02, published on 2026-01-01:
      09:30 UTC, 11:30 UTC, 15:30 UTC
    """

    def test_cutoff_11_selects_0930_run(self):
        """Cutoff 11:00 UTC → only 09:30 qualifies (strict less-than)."""
        records = load_windfor_fixture()
        selected = select_day_ahead_forecast_run(records, date(2026, 1, 2), cutoff_hour_utc=11)
        assert selected == "2026-01-01T09:30:00Z"

    def test_cutoff_1130_excluded_exactly_at_cutoff(self):
        """Cutoff 11:30 UTC → 11:30 run is EXCLUDED (strict <, not <=)."""
        records = load_windfor_fixture()
        selected = select_day_ahead_forecast_run(records, date(2026, 1, 2), cutoff_hour_utc=11)
        # 11:30 run is at cutoff hour 11 minute 30 — but cutoff_hour=11 means 11:00,
        # so 11:30 > 11:00 → excluded. 09:30 < 11:00 → selected.
        assert selected == "2026-01-01T09:30:00Z"

    def test_cutoff_12_selects_1130_run(self):
        """Cutoff 12:00 UTC → 09:30 and 11:30 qualify; 11:30 is latest."""
        records = load_windfor_fixture()
        selected = select_day_ahead_forecast_run(records, date(2026, 1, 2), cutoff_hour_utc=12)
        assert selected == "2026-01-01T11:30:00Z"

    def test_cutoff_16_selects_1530_run(self):
        """Cutoff 16:00 UTC → 09:30, 11:30, 15:30 all qualify; 15:30 is latest."""
        records = load_windfor_fixture()
        selected = select_day_ahead_forecast_run(records, date(2026, 1, 2), cutoff_hour_utc=16)
        assert selected == "2026-01-01T15:30:00Z"

    def test_no_run_before_cutoff_returns_none(self):
        """Cutoff before all runs → no forecast available → returns None."""
        records = load_windfor_fixture()
        selected = select_day_ahead_forecast_run(records, date(2026, 1, 2), cutoff_hour_utc=9)
        assert selected is None

    def test_empty_records_returns_none(self):
        assert select_day_ahead_forecast_run([], date(2026, 1, 2), cutoff_hour_utc=11) is None

    def test_post_cutoff_runs_excluded(self):
        """15:30 run must never appear with cutoff=11."""
        records = load_windfor_fixture()
        selected = select_day_ahead_forecast_run(records, date(2026, 1, 2), cutoff_hour_utc=11)
        assert selected != "2026-01-01T15:30:00Z"
        assert selected != "2026-01-01T11:30:00Z"


class TestExtractHourlyForecasts:
    def test_extracts_correct_delivery_hours(self):
        records = load_windfor_fixture()
        forecasts = extract_hourly_forecasts_for_date(
            records, "2026-01-01T09:30:00Z", date(2026, 1, 2)
        )
        assert datetime(2026, 1, 2, 0, 0, 0, tzinfo=timezone.utc) in forecasts
        assert forecasts[datetime(2026, 1, 2, 0, 0, 0, tzinfo=timezone.utc)] == 15200.0

    def test_does_not_include_wrong_delivery_date(self):
        records = load_windfor_fixture()
        # Fixture only has Jan 2 delivery hours; querying Jan 3 should return empty
        forecasts = extract_hourly_forecasts_for_date(
            records, "2026-01-01T09:30:00Z", date(2026, 1, 3)
        )
        assert len(forecasts) == 0

    def test_does_not_include_wrong_run(self):
        records = load_windfor_fixture()
        forecasts = extract_hourly_forecasts_for_date(
            records, "2026-01-01T11:30:00Z", date(2026, 1, 2)
        )
        # 11:30 run has generation=15100 for 00:00, not 15200
        hour_0 = datetime(2026, 1, 2, 0, 0, 0, tzinfo=timezone.utc)
        assert forecasts[hour_0] == 15100.0
