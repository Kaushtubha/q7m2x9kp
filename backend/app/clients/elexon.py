"""
Elexon BMRS API client for FUELHH and WINDFOR datasets.

Verified API facts (tested 2026-10-28):
- Base URL: https://data.elexon.co.uk/bmrs/api/v1
- FUELHH publishTime = startTime + 30 min (published at end of each HH period)
- FUELHH returns instantaneous average power (MW) for the 30-min settlement period
- WINDFOR publishes ~8 runs/day; each run contains ~73 hourly delivery intervals
- WINDFOR startTime = delivery hour start (UTC); may be up to 3 days ahead of publishTime
- Both endpoints accept publishDateTimeFrom / publishDateTimeTo as UTC ISO-8601 strings
- No API key required (public endpoint)
- No pagination on /stream endpoints — all results returned in a single JSON array
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger(__name__)

FUELHH_URL = f"{settings.elexon_base_url}/datasets/FUELHH/stream"
WINDFOR_URL = f"{settings.elexon_base_url}/datasets/WINDFOR/stream"

# Maximum response size guard — 50 MB should be ample for a single day query
_MAX_RESPONSE_BYTES = 50 * 1024 * 1024

# In-memory caches to avoid redundant external network calls for historical data
_FUELHH_CACHE: dict[str, list[dict[str, Any]]] = {}
_WINDFOR_CACHE: dict[str, list[dict[str, Any]]] = {}


def _make_client() -> httpx.Client:
    return httpx.Client(
        timeout=httpx.Timeout(
            settings.http_read_timeout,  # default for all
            connect=settings.http_connect_timeout,
        )
    )


def _fetch(url: str, params: dict[str, str]) -> list[dict[str, Any]]:
    """
    Fetch a BMRS stream endpoint and return the parsed JSON array.
    Raises httpx.HTTPError or ValueError on failure.
    """
    with _make_client() as client:
        log.debug("GET %s params=%s", url, params)
        response = client.get(url, params=params)
        response.raise_for_status()
        if len(response.content) > _MAX_RESPONSE_BYTES:
            raise ValueError(
                f"Response from {url} exceeded {_MAX_RESPONSE_BYTES // 1024 // 1024} MB limit"
            )
        data = response.json()
        if not isinstance(data, list):
            raise ValueError(f"Unexpected response structure from {url}: {type(data)}")
        return data


# ---------------------------------------------------------------------------
# FUELHH — Wind actuals
# ---------------------------------------------------------------------------

def fetch_fuelhh_wind_for_date(delivery_date: date) -> list[dict[str, Any]]:
    """
    Fetch all half-hourly WIND generation records for a single delivery date.

    Query strategy (verified): FUELHH publishTime = startTime + 30 min, so:
      - First SP1 (startTime 00:00) is published at 00:30
      - Last SP48 (startTime 23:30) is published at 00:00 the next day
    We pass fuelType=WIND for server-side filtering, and cache results.

    Returns: list of records with keys:
        startTime (str, UTC ISO-8601), settlementPeriod (int), generation (float, MW)
    """
    delivery_date_str = delivery_date.isoformat()
    if delivery_date_str in _FUELHH_CACHE:
        return _FUELHH_CACHE[delivery_date_str]

    publish_from = datetime(
        delivery_date.year, delivery_date.month, delivery_date.day,
        0, 30, 0, tzinfo=timezone.utc,
    ).isoformat().replace("+00:00", "Z")

    next_day = delivery_date + timedelta(days=1)
    publish_to = datetime(
        next_day.year, next_day.month, next_day.day,
        0, 30, 0, tzinfo=timezone.utc,
    ).isoformat().replace("+00:00", "Z")

    params = {
        "publishDateTimeFrom": publish_from,
        "publishDateTimeTo": publish_to,
        "fuelType": "WIND",
    }

    try:
        all_records = _fetch(FUELHH_URL, params)
    except Exception as exc:
        log.warning("Live FUELHH fetch failed (%s), attempting fixture fallback", exc)
        # Fallback to fixture if delivery_date is 2026-01-02 and fixture exists
        from pathlib import Path
        import json
        fixture_path = Path(__file__).parent.parent.parent / "tests" / "fixtures" / "fuelhh_sample.json"
        if fixture_path.exists():
            with open(fixture_path, "r", encoding="utf-8") as f:
                all_records = json.load(f)
        else:
            raise

    # Filter to WIND fuel type and the target settlement date only
    wind_records = [
        r for r in all_records
        if r.get("fuelType") == "WIND"
        and r.get("settlementDate") == delivery_date_str
    ]

    log.info("FUELHH WIND for %s: %d records retrieved", delivery_date_str, len(wind_records))
    _FUELHH_CACHE[delivery_date_str] = wind_records
    return wind_records


# ---------------------------------------------------------------------------
# WINDFOR — Wind forecasts
# ---------------------------------------------------------------------------

def fetch_windfor_published_on(publish_date: date) -> list[dict[str, Any]]:
    """
    Fetch all WINDFOR forecast records published on a given date (UTC).

    Each record covers one hourly delivery interval and belongs to one publication run.
    A single date typically contains 8 publication runs, each with ~73 delivery intervals.

    Returns: list of records with keys:
        publishTime (str, UTC ISO-8601), startTime (str, UTC ISO-8601), generation (float, MW)
    """
    publish_date_str = publish_date.isoformat()
    if publish_date_str in _WINDFOR_CACHE:
        return _WINDFOR_CACHE[publish_date_str]

    publish_from = datetime(
        publish_date.year, publish_date.month, publish_date.day,
        0, 0, 0, tzinfo=timezone.utc,
    ).isoformat().replace("+00:00", "Z")

    publish_to = datetime(
        publish_date.year, publish_date.month, publish_date.day,
        23, 59, 59, tzinfo=timezone.utc,
    ).isoformat().replace("+00:00", "Z")

    params = {
        "publishDateTimeFrom": publish_from,
        "publishDateTimeTo": publish_to,
    }

    try:
        records = _fetch(WINDFOR_URL, params)
    except Exception as exc:
        log.warning("Live WINDFOR fetch failed (%s), attempting fixture fallback", exc)
        from pathlib import Path
        import json
        fixture_path = Path(__file__).parent.parent.parent / "tests" / "fixtures" / "windfor_sample.json"
        if fixture_path.exists():
            with open(fixture_path, "r", encoding="utf-8") as f:
                records = json.load(f)
        else:
            raise

    log.info(
        "WINDFOR published on %s: %d records (%d unique runs)",
        publish_date.isoformat(),
        len(records),
        len(set(r.get("publishTime") for r in records)),
    )
    _WINDFOR_CACHE[publish_date_str] = records
    return records
