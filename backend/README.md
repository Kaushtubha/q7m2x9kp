# WindLens Backend

Production-grade Python 3.11+ FastAPI service powering the WindLens energy analytics platform.

## Architecture

- **`app/clients/elexon.py`**: Robust client for Elexon BMRS API (`WINDFOR` and `FUELHH` streams). Features server-side `fuelType=WIND` filtering, in-memory caching per date to eliminate redundant network roundtrips, and deterministic fixture fallback.
- **`app/services/selection.py`**: Forecast run selection logic implementing the day-ahead cutoff policy (`publishTime < cutoff_datetime`) to strictly eliminate look-ahead bias.
- **`app/services/alignment.py`**: Half-hourly to hourly temporal alignment logic (`(SP1 + SP2) / 2`). Tracks partial data flags when only a single settlement period is available.
- **`app/services/metrics.py`**: Mathematical computation of MAE, RMSE, Mean Bias, and interval coverage percentage.
- **`app/services/data_service.py`**: Orchestration service coordinating concurrent data fetching across multi-day date ranges using `ThreadPoolExecutor`.
- **`app/routers/api.py`**: FastAPI routing with strict query validation constraining queries to January 2026.

## Endpoints

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/health` | Service health status and cutoff policy note | None |
| `GET` | `/api/forecasts` | Hourly matched forecast and actual generation pairs | `date_from`, `date_to`, `cutoff_hour` (default 11) |
| `GET` | `/api/accuracy` | Aggregated accuracy metrics (MAE, RMSE, Bias, Coverage) | `date_from`, `date_to`, `cutoff_hour` (default 11) |
| `GET` | `/api/data-quality` | Data pipeline audit (matched pairs, missing, partials) | `date_from`, `date_to`, `cutoff_hour` (default 11) |

## Development Setup

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API documentation available at `http://localhost:8000/docs`.

## Running Tests

All 33 tests run deterministically without external network calls:

```bash
pytest tests/ -v
```
