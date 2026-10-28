"""
FastAPI endpoint tests using httpx TestClient.
Mocks the Elexon data client to avoid live API calls in CI.
"""

from datetime import date, datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import ForecastActualPair

client = TestClient(app)

# Sample paired data returned by mock
SAMPLE_PAIRS = [
    ForecastActualPair(
        delivery_hour=datetime(2026, 1, 2, 0, 0, 0, tzinfo=timezone.utc),
        forecast_mw=15200.0,
        actual_mw=15366.5,
        error_mw=-166.5,
        publish_time=datetime(2026, 1, 1, 9, 30, 0, tzinfo=timezone.utc),
        lead_time_hours=14.5,
        actual_partial=False,
    )
]


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "cutoff" in body["note"].lower()


def test_forecasts_endpoint_valid_range():
    with patch("app.services.data_service.get_forecast_actuals", return_value=SAMPLE_PAIRS):
        response = client.get("/api/forecasts?date_from=2026-01-02&date_to=2026-01-02")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data[0]["delivery_hour"] is not None
    assert "forecast_mw" in data[0]
    assert "actual_mw" in data[0]
    assert "error_mw" in data[0]


def test_forecasts_endpoint_out_of_scope_rejected():
    """Dates outside January 2026 must return 422."""
    response = client.get("/api/forecasts?date_from=2026-02-01&date_to=2026-02-07")
    assert response.status_code == 422


def test_forecasts_endpoint_reversed_dates_rejected():
    response = client.get("/api/forecasts?date_from=2026-01-10&date_to=2026-01-02")
    assert response.status_code == 422


def test_accuracy_endpoint_valid():
    from app.services.metrics import MetricResult
    mock_result = MetricResult(
        mae_mw=166.5, rmse_mw=166.5, bias_mw=-166.5,
        matched_pairs=1, expected_intervals=24, coverage_pct=4.2
    )
    with patch("app.services.data_service.get_accuracy_metrics", return_value=mock_result):
        response = client.get("/api/accuracy?date_from=2026-01-02&date_to=2026-01-02")
    assert response.status_code == 200
    body = response.json()
    assert "mae_mw" in body
    assert "rmse_mw" in body
    assert "bias_mw" in body
    assert "coverage_pct" in body


def test_data_quality_endpoint_valid():
    from app.schemas import DataQualityReport
    mock_report = DataQualityReport(
        source="live_elexon",
        last_fetched_utc=datetime(2026, 10, 28, tzinfo=timezone.utc),
        date_from=date(2026, 1, 2),
        date_to=date(2026, 1, 2),
        cutoff_hour_utc=11,
        total_delivery_hours=24,
        forecast_available=3,
        actual_available=3,
        matched_pairs=3,
        partial_actual_count=0,
        missing_forecast_count=21,
        missing_actual_count=21,
    )
    with patch("app.services.data_service.get_data_quality", return_value=mock_report):
        response = client.get("/api/data-quality?date_from=2026-01-02&date_to=2026-01-02")
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "live_elexon"
    assert "matched_pairs" in body


def test_cutoff_hour_parameter_accepted():
    with patch("app.services.data_service.get_forecast_actuals", return_value=SAMPLE_PAIRS):
        response = client.get("/api/forecasts?date_from=2026-01-02&date_to=2026-01-02&cutoff_hour=15")
    assert response.status_code == 200


def test_data_quality_provenance_isolation():
    """Verify that data quality reports determine source per-request without shared state pollution."""
    from app.services.data_service import get_data_quality

    # Request 1: Simulated fixture fallback
    with patch("app.services.data_service._process_single_date", return_value=(SAMPLE_PAIRS, "fixture_fallback")):
        report1 = get_data_quality(date(2026, 1, 2), date(2026, 1, 2))
    assert report1.source == "fixture_fallback"

    # Request 2: Normal live request must NOT be poisoned by the previous request's fallback
    with patch("app.services.data_service._process_single_date", return_value=(SAMPLE_PAIRS, "live_elexon")):
        report2 = get_data_quality(date(2026, 1, 3), date(2026, 1, 3))
    assert report2.source == "live_elexon"

