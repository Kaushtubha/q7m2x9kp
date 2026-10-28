# WindLens — Day-Ahead Wind Generation Forecast Intelligence

> An institutional-grade analytics application for UK electricity procurement analysts to evaluate day-ahead wind generation forecasts against metered settlement outturn.

**Built for the Gridbricks Full-Stack Software Engineer hiring assignment.**

- **Repository**: [https://github.com/Kaushtubha/q7m2x9kp](https://github.com/Kaushtubha/q7m2x9kp)
- **Scope**: January 2026 Great Britain Electricity Market

---

## 1. Problem Statement & Procurement Context

In the UK wholesale electricity market, procurement desks purchase power in day-ahead auctions prior to gate closure. To hedge volume risk and avoid punitive Balancing Mechanism imbalance penalties, energy procurement analysts need to know:
1. **Forecast Horizon & Provenance**: What aggregate wind generation was forecast for the delivery day, and which publication run was available prior to the decision cutoff.
2. **Forecast Accuracy & System Bias**: How closely that day-ahead forecast matched metered settlement outturn, and whether the forecast exhibited systematic overforecasting (short position risk) or underforecasting (long position risk).

WindLens addresses both questions by retrieving, aligning, and evaluating live data from the **Elexon BMRS** (Balancing Mechanism Reporting Service) API without synthetic or fabricated values.

---

## 2. System Architecture

```
windlens/
├── backend/
│   ├── app/
│   │   ├── clients/
│   │   │   └── elexon.py         # Streaming client for FUELHH actuals & WINDFOR forecasts
│   │   ├── routers/
│   │   │   └── api.py            # /api/forecasts, /api/accuracy, /api/data-quality
│   │   ├── services/
│   │   │   ├── alignment.py      # Half-hourly to hourly settlement aggregation
│   │   │   ├── data_service.py   # Request-scoped date retrieval & provenance isolation
│   │   │   ├── metrics.py        # MAE, RMSE, Mean Directional Bias, Coverage %
│   │   │   └── selection.py      # Strict cutoff & zero look-ahead forecast extraction
│   │   ├── config.py             # Pydantic v2 settings & CORS configuration
│   │   └── main.py               # FastAPI application entrypoint & /health check
│   ├── tests/                    # 35 deterministic pytest unit & regression tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts         # Typed API client with trailing slash sanitation
│   │   ├── components/
│   │   │   ├── ErrorChart.tsx    # Hourly deviation (Forecast − Actual) bar chart
│   │   │   ├── ForecastChart.tsx # Forecast vs metered outturn dual-series line chart
│   │   │   ├── IntervalTable.tsx # Multi-column sortable & filterable reconciliation table
│   │   │   └── KpiStrip.tsx      # Executive metric bar with semantic risk badges
│   │   ├── lib/
│   │   │   └── formatters.ts     # Timezone-aware UTC dates, MW, and CSV export
│   │   ├── App.tsx               # Main analytical dashboard & methodology audit modal
│   │   ├── index.css             # Light-first editorial design system tokens
│   │   └── types/index.ts        # Shared TypeScript contracts matching Pydantic schemas
│   ├── Dockerfile
│   ├── nginx.conf                # Production reverse proxy configuration
│   ├── vercel.json               # SPA routing rewrite for Vercel deployment
│   └── package.json
├── docker-compose.yml            # Local multi-container deployment
├── render.yaml                   # Render Blueprint for automated backend deployment
├── .env.example
└── README.md
```

---

## 3. Data Sources & Engineering Rigor

| Dataset | Reporting Resolution | API Endpoint | Domain Role |
|---|---|---|---|
| **FUELHH** | Half-hourly (Settlement Periods 1–48) | `/datasets/FUELHH/stream` | Metered actual wind outturn (`fuelType=WIND`) |
| **WINDFOR** | Hourly delivery intervals | `/datasets/WINDFOR/stream` | Day-ahead aggregate GB wind generation forecast runs |

### Zero Look-Ahead Bias Enforcement
For delivery day $D$, WindLens identifies all forecast runs published strictly prior to the configured cutoff:
$$\text{publishTime} < \text{cutoff\_datetime}$$
- **Default Cutoff**: `11:00 UTC on D-1` (the day before delivery).
- **Compliance Note**: The 11:00 UTC D-1 cutoff is an analytical project assumption approximating pre-noon wholesale gate closure, not an official statutory Gridbricks rule.
- Any forecast publication released at or after 11:00 UTC is strictly discarded for that delivery day, ensuring zero look-ahead data contamination.

### Settlement Period Averaging $(\text{SP}_1 + \text{SP}_2)/2$
FUELHH reports metered actuals per 30-minute settlement period, while WINDFOR forecasts are published in clock-hour increments:
- **00:00 UTC Delivery Hour**: Averaged from SP1 (00:00–00:30) and SP2 (00:30–01:00):
  $$\text{Hourly Actual (MW)} = \frac{\text{SP}_1 + \text{SP}_2}{2}$$
- **Partial Actuals Flag**: If an hour contains only one recorded settlement reading, that single reading is used and explicitly flagged as `actual_partial: true` (`1 SP`), avoiding fabricated numbers.
- **Deterministic Deduplication**: Duplicate settlement records from the streaming API are deduplicated deterministically by slot index.

---

## 4. Accuracy Metrics & Error Conventions

All calculations use megawatts (MW) and adhere to the documented sign convention:
$$\text{Error}_i = \text{Forecast}_i - \text{Actual}_i$$

| Metric | Mathematical Formula | Interpretation & Procurement Significance |
|---|---|---|
| **MAE** | $\frac{1}{N}\sum_{i=1}^N \|e_i\|$ | Average absolute error magnitude across all matched delivery intervals. |
| **RMSE** | $\sqrt{\frac{1}{N}\sum_{i=1}^N e_i^2}$ | Quadratic penalty; penalises large forecasting misses, reflecting system stress and reserve procurement risk. |
| **Mean Directional Bias** | $\frac{1}{N}\sum_{i=1}^N e_i$ | **Positive (+)** indicates systematic overforecasting (utility is net long on bid, short in physical balance).<br>**Negative (−)** indicates underforecasting (utility is net short on bid, long in physical balance). |
| **Interval Coverage** | $\frac{\text{Matched Pairs}}{\text{Expected Intervals}} \times 100\%$ | Proportion of delivery hours with both valid forecast and actual data. Unavailable metrics remain `—` rather than defaulting to zero. |

### Mathematical Audit Note: January 1–3, 2026 Identity
For the January 1–3, 2026 window, WindLens reports:
$$\text{MAE} = 3,185.54\text{ MW} \quad \text{and} \quad \text{Mean Bias} = +3,185.54\text{ MW}$$
An exhaustive audit across all 72 delivery intervals confirmed that for every single hour, Day-Ahead Forecast strictly exceeded Metered Actual ($e_i > 0$ for all $i \in [1, 72]$, minimum error $+295.5$ MW, maximum $+5,651.5$ MW). Because no negative errors occurred:
$$\sum_{i=1}^{72} |e_i| \equiv \sum_{i=1}^{72} e_i \implies \text{MAE} \equiv \text{Mean Bias}$$
This is an authentic mathematical identity of the underlying market outturn, not a software bug or metric fabrication.

---

## 5. Local Setup & Execution

### Option A: Docker Compose (Recommended)
```bash
cp .env.example .env
docker compose up --build
```
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### Option B: Manual Local Setup

#### Backend (Python 3.11+)
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Frontend (Node.js 20+)
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```

---

## 6. Environment Variables

| Variable | Service | Default Value | Description |
|---|---|---|---|
| `ELEXON_BASE_URL` | Backend | `https://data.elexon.co.uk/bmrs/api/v1` | Public Elexon BMRS API root |
| `DEFAULT_CUTOFF_HOUR` | Backend | `11` | Decision cutoff hour on D-1 (UTC) |
| `ALLOWED_ORIGINS` | Backend | `http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,*` | Comma-separated allowed CORS origins |
| `USE_FIXTURES` | Backend | `false` | When `true`, uses offline test fixtures |
| `VITE_API_URL` | Frontend | `""` (proxied in dev) | Base URL of the deployed FastAPI backend |

---

## 7. Production Deployment Guide

### A. Deployed Backend (Live on Render)

- **Live URL**: `https://windlens-backend-5xda.onrender.com`
- **Health Check**: [`https://windlens-backend-5xda.onrender.com/health`](https://windlens-backend-5xda.onrender.com/health)
- **Verified January 1–3, 2026 Live Query**:
  ```bash
  curl -i "https://windlens-backend-5xda.onrender.com/api/accuracy?date_from=2026-01-01&date_to=2026-01-03&cutoff_hour=11"
  # Returns: {"mae_mw":3185.54,"rmse_mw":3420.67,"bias_mw":3185.54,"matched_pairs":72,"expected_intervals":72,"coverage_pct":100.0}
  ```


### B. Deployed Frontend (Live on Vercel)

- **Live URL**: [`https://windlens-analytics.vercel.app/`](https://windlens-analytics.vercel.app/)
- **Backend API Connected**: `https://windlens-backend-5xda.onrender.com`
- **CORS & Routing**: Managed via [`frontend/vercel.json`](frontend/vercel.json) SPA rewrites and FastAPI wildcard CORS middleware.




---

## 8. Automated Test Suite & Build Verification

- **Backend Pytest**:
  ```bash
  cd backend
  pytest tests/ -v
  ```
  *Result*: **35 passed in 4.22s** (covers settlement averaging, slot deduplication, cutoff selection, lookahead prevention, MAE/RMSE/Bias metrics, and request-scoped provenance isolation).

- **Frontend Production Build**:
  ```bash
  cd frontend
  npm run build
  ```
  *Result*: Clean compilation (`tsc -b && vite build`) with **0 errors**.

---

## 9. AI Tool Usage Disclosure

This application was developed with pairing assistance from **Google Antigravity** (DeepMind Advanced Agentic Coding system):
- **Assisted Areas**: Rapid scaffolding of boilerplate schemas, Recharts visualization components, Tailwind CSS styling tokens, and deployment configuration files.
- **Human Engineered & Audited**: All energy domain decisions, temporal alignment logic, Elexon BMRS API parameter semantics, mathematical verification of January 1–3 error distributions, and look-ahead bias elimination were designed and verified against live BMRS data.
