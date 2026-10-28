"""
Pydantic schemas for all API request parameters and response models.
Units are always stated explicitly. All timestamps are UTC ISO-8601.
"""

from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared domain types
# ---------------------------------------------------------------------------

class ForecastActualPair(BaseModel):
    """A single matched forecast / actual pair for one delivery hour."""
    delivery_hour: datetime = Field(description="Delivery interval start (UTC)")
    forecast_mw: Optional[float] = Field(
        None,
        description="Selected day-ahead forecast (MW, average power for the hour). "
                    "Null if no qualifying forecast run was published before the cutoff.",
    )
    actual_mw: Optional[float] = Field(
        None,
        description="Hourly average actual wind generation (MW), derived by averaging "
                    "the two FUELHH half-hourly MW readings for this hour.",
    )
    error_mw: Optional[float] = Field(
        None,
        description="Forecast error (MW). Convention: error = forecast - actual. "
                    "Positive = overforecast.",
    )
    publish_time: Optional[datetime] = Field(
        None,
        description="UTC timestamp when the selected forecast run was published.",
    )
    lead_time_hours: Optional[float] = Field(
        None,
        description="Hours between forecast publication and delivery interval start.",
    )
    actual_partial: bool = Field(
        False,
        description="True if only one of the two expected half-hourly actual records "
                    "was available. The single available MW reading is used.",
    )


class AccuracyMetrics(BaseModel):
    """Summary accuracy metrics computed over all matched pairs."""
    mae_mw: float = Field(description="Mean Absolute Error (MW)")
    rmse_mw: float = Field(description="Root Mean Squared Error (MW)")
    bias_mw: float = Field(description="Mean Bias (MW). Positive = systematic overforecast.")
    matched_pairs: int = Field(description="Number of intervals with both forecast and actual.")
    expected_intervals: int = Field(description="Total delivery intervals in the requested range.")
    coverage_pct: float = Field(description="Percentage of expected intervals with matched pairs.")


class DataQualityReport(BaseModel):
    """Transparency report on data availability and source."""
    source: str = Field(description="'live_elexon' or 'fixture'")
    last_fetched_utc: Optional[datetime] = Field(
        None, description="When the data was last retrieved from the API."
    )
    date_from: date
    date_to: date
    cutoff_hour_utc: int = Field(
        description="The D-1 decision cutoff hour (UTC) used for this query. "
                    "Assumption — not an official market rule."
    )
    total_delivery_hours: int
    forecast_available: int
    actual_available: int
    matched_pairs: int
    partial_actual_count: int = Field(
        description="Intervals where only one of two expected HH actual readings was found."
    )
    missing_forecast_count: int
    missing_actual_count: int
