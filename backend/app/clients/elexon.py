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

import json
import logging
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger(__name__)

FUELHH_URL = f"{settings.elexon_base_url}/datasets/FUELHH/stream"
WINDFOR_URL = f"{settings.elexon_base_url}/datasets/WINDFOR/stream"

# Maximum response size guard — 50 MB should be ample for a single day query
_MAX_RESPONSE_BYTES = 50 * 1024 * 1024

# In-memory caches storing (records, source_label) per date to avoid redundant external network roundtrips
_FUELHH_CACHE: dict[str, tuple[list[dict[str, Any]], str]] = {}
_WINDFOR_CACHE: dict[str, tuple[list[dict[str, Any]], str]] = {}

_FIXTURES_DIR = Path(__file__).parent.parent.parent / "tests" / "fixtures"


def _make_client() -> httpx.Client:
    return httpx.Client(
        timeout=httpx.Timeout(
            settings.http_read_timeout,
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

def fetch_fuelhh_wind_for_date(delivery_date: date) -> tuple[list[dict[str, Any]], str]:
    """
    Fetch all half-hourly WIND generation records for a single delivery date.

    Returns:
        tuple of (records, source_label) where source_label is one of:
        - 'live_elexon': fetched live from data.elexon.co.uk
        - 'fixture': loaded explicitly from local test fixtures
        - 'fixture_fallback': live API call failed; fell back to local fixture
    """
    delivery_date_str = delivery_date.isoformat()
    if delivery_date_str in _FUELHH_CACHE:
        return _FUELHH_CACHE[delivery_date_str]

    # Explicit fixture mode
    if settings.use_fixtures:
        fixture_path = _FIXTURES_DIR / "fuelhh_sample.json"
        if fixture_path.exists():
            records = json.loads(fixture_path.read_text(encoding="utf-8"))
            wind_records = [
                r for r in records
                if r.get("fuelType") == "WIND" and r.get("settlementDate") == delivery_date_str
            ]
            result = (wind_records, "fixture")
            _FUELHH_CACHE[delivery_date_str] = result
            return result

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
        source = "live_elexon"
    except Exception as exc:
        log.warning("Live FUELHH fetch failed (%s), attempting fixture fallback", exc)
        fixture_path = _FIXTURES_DIR / "fuelhh_sample.json"
        if fixture_path.exists():
            all_records = json.loads(fixture_path.read_text(encoding="utf-8"))
            source = "fixture_fallback"
        else:
            raise

    wind_records = [
        r for r in all_records
        if r.get("fuelType") == "WIND"
        and r.get("settlementDate") == delivery_date_str
    ]

    log.info("FUELHH WIND for %s: %d records retrieved (%s)", delivery_date_str, len(wind_records), source)
    result = (wind_records, source)
    _FUELHH_CACHE[delivery_date_str] = result
    return result


# ---------------------------------------------------------------------------
# WINDFOR — Wind forecasts
# ---------------------------------------------------------------------------

def fetch_windfor_published_on(publish_date: date) -> tuple[list[dict[str, Any]], str]:
    """
    Fetch all WINDFOR forecast records published on a given date (UTC).

    Returns:
        tuple of (records, source_label) where source_label is one of:
        - 'live_elexon': fetched live from data.elexon.co.uk
        - 'fixture': loaded explicitly from local test fixtures
        - 'fixture_fallback': live API call failed; fell back to local fixture
    """
    publish_date_str = publish_date.isoformat()
    if publish_date_str in _WINDFOR_CACHE:
        return _WINDFOR_CACHE[publish_date_str]

    if settings.use_fixtures:
        fixture_path = _FIXTURES_DIR / "windfor_sample.json"
        if fixture_path.exists():
            records = json.loads(fixture_path.read_text(encoding="utf-8"))
            result = (records, "fixture")
            _WINDFOR_CACHE[publish_date_str] = result
            return result

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
        source = "live_elexon"
    except Exception as exc:
        log.warning("Live WINDFOR fetch failed (%s), attempting fixture fallback", exc)
        fixture_path = _FIXTURES_DIR / "windfor_sample.json"
        if fixture_path.exists():
            records = json.loads(fixture_path.read_text(encoding="utf-8"))
            source = "fixture_fallback"
        else:
            raise

    log.info(
        "WINDFOR published on %s: %d records (%s)",
        publish_date.isoformat(),
        len(records),
        source,
    )
    result = (records, source)
    _WINDFOR_CACHE[publish_date_str] = result
    return result
