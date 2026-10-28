"""
Tests for HH-to-hourly alignment logic.
Uses deterministic inputs — no live API calls.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from app.services.alignment import aggregate_fuelhh_to_hourly

FIXTURES = Path(__file__).parent / "fixtures"


def load_fuelhh_fixture() -> list[dict]:
    return json.loads((FIXTURES / "fuelhh_sample.json").read_text())


class TestAggregateToHourly:
    def test_sp1_sp2_averaged_correctly(self):
        """
        SP1: startTime 00:00 → 15228 MW
        SP2: startTime 00:30 → 15505 MW
        Expected hourly at 00:00: (15228 + 15505) / 2 = 15366.5 MW
        """
        records = load_fuelhh_fixture()
        result = aggregate_fuelhh_to_hourly(records)
        hour_0 = datetime(2026, 1, 2, 0, 0, 0, tzinfo=timezone.utc)
        assert hour_0 in result
        assert abs(result[hour_0].actual_mw - 15366.5) < 0.1
        assert result[hour_0].partial is False

    def test_sp3_sp4_averaged_correctly(self):
        """
        SP3: startTime 01:00 → 15599 MW
        SP4: startTime 01:30 → 15763 MW
        Expected hourly at 01:00: (15599 + 15763) / 2 = 15681.0 MW
        """
        records = load_fuelhh_fixture()
        result = aggregate_fuelhh_to_hourly(records)
        hour_1 = datetime(2026, 1, 2, 1, 0, 0, tzinfo=timezone.utc)
        assert abs(result[hour_1].actual_mw - 15681.0) < 0.1

    def test_partial_flag_when_only_one_sp(self):
        """If only one of two HH records is present, partial=True."""
        records = [
            {
                "startTime": "2026-01-02T00:00:00Z",
                "generation": 13756,
                "settlementDate": "2026-01-02",
                "settlementPeriod": 1,
                "fuelType": "WIND",
            }
        ]
        result = aggregate_fuelhh_to_hourly(records)
        hour_0 = datetime(2026, 1, 2, 0, 0, 0, tzinfo=timezone.utc)
        assert result[hour_0].actual_mw == 13756.0
        assert result[hour_0].partial is True

    def test_empty_input_returns_empty(self):
        result = aggregate_fuelhh_to_hourly([])
        assert result == {}

    def test_missing_generation_field_skipped(self):
        records = [
            {"startTime": "2026-01-02T00:00:00Z", "fuelType": "WIND"},
        ]
        result = aggregate_fuelhh_to_hourly(records)
        assert result == {}

    def test_two_hours_produce_two_entries(self):
        records = load_fuelhh_fixture()  # has 3 hours worth (SP1–SP6)
        result = aggregate_fuelhh_to_hourly(records)
        assert len(result) == 3  # hours 00:00, 01:00, 02:00
