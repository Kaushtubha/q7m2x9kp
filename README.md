# WindLens — Day-Ahead Wind Forecast Intelligence

> A focused analytics application for UK electricity procurement analysts to understand and evaluate wind generation forecasts.

**Built for the Gridbricks Full-Stack SWE hiring challenge.**

---

## Problem Statement

A UK electricity utility purchases power from the day-ahead wholesale market. Before placing day-ahead bids, procurement analysts need to know:
1. What wind generation was forecast for the following day, and when that forecast was published.
2. How accurate those day-ahead forecasts were against actual metered wind generation.

WindLens answers both questions using real data from the Elexon BMRS (Balancing Mechanism Reporting Service).

---

## Architecture

```
windlens/
├── backend/          Python FastAPI — Elexon data client, forecast selection, metrics
├── frontend/         React + TypeScript + Vite — analytical dashboard
├── docker-compose.yml
├── .env.example
└── README.md
```

See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for per-service detail.

---

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

---

## Manual Setup

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

---

## Deployed Application

- Frontend: _to be updated after deployment_
- Backend API: _to be updated after deployment_

---

## Data Sources

| Dataset | Description | Documentation |
|---|---|---|
| FUELHH | Half-hourly metered wind generation (MW) by fuel type | https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream |
| WINDFOR | Hourly wind generation forecasts (MW) with multiple publication runs per day | https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream |

All data retrieved live from the Elexon BMRS public API. No fabricated data. Scope: January 2026.

---

## Forecast Selection Policy

**Assumption (not an official Gridbricks or market rule):** For delivery day D, WindLens selects the most recent WINDFOR forecast run published strictly before 11:00 UTC on D-1 (the day before delivery).

Rationale: the challenge requires "day-ahead" forecasts but does not specify a cutoff time. 11:00 UTC is a conservative pre-noon assumption. The cutoff is configurable in the UI and via the `cutoff_hour` API parameter.

The strict comparison `publishTime < cutoff_datetime` prevents lookahead bias — forecasts published after the cutoff are excluded even if they cover the same delivery intervals.

---

## Metrics

All metrics computed in MW (megawatts). Error convention: `error = forecast - actual`.

| Metric | Formula |
|---|---|
| MAE | mean(abs(error)) |
| RMSE | sqrt(mean(error²)) |
| Mean Bias | mean(error) — positive = overforecast |
| Coverage | matched_pairs / expected_intervals × 100% |

MAPE is excluded to avoid division-by-zero risk.

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## AI Tool Disclosure

This project was built with assistance from Google Antigravity (a Gemini-based AI coding agent). The AI was used to:
- Generate boilerplate code and configuration files
- Assist with FastAPI endpoint structure and Pydantic schemas
- Suggest React component layout and Recharts integration
- Draft README text

All domain logic decisions (forecast selection policy, temporal alignment, metric definitions, API query semantics) were designed by the developer and verified against real Elexon BMRS API data before implementation.

---

## Known Limitations

- WINDFOR provides hourly forecasts; FUELHH provides half-hourly actuals. Actuals are averaged to hourly MW for alignment.
- The 11:00 UTC D-1 cutoff is an assumption. Real procurement gate times vary by market and participant.
- No demand data, price data, or procurement optimization — out of scope for this challenge.
- Historical data retrieval adds latency (~5–15s for a full month). Results are cached for 60 seconds per request.

---

## GitHub Repository

https://github.com/Kaushtubha/q7m2x9kp

---

## Demonstration Video

_Unlisted YouTube link to be added after recording._
