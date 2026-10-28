# WindLens — Day-Ahead Wind Generation Forecast Intelligence

> An institutional-grade analytics dashboard for UK electricity procurement analysts to evaluate day-ahead wind generation forecasts against metered settlement outturn.

**Built for the Gridbricks Full-Stack Software Engineer hiring assignment.**

[![CI / Pytest](https://img.shields.io/badge/pytest-35%20passed-047857?style=flat-square&logo=python)](backend/tests/)
[![Vite / TypeScript](https://img.shields.io/badge/typescript-strict%20build%20clean-0f766e?style=flat-square&logo=typescript)](frontend/)
[![Deployment / Vercel](https://img.shields.io/badge/frontend-Vercel%20Edge-000000?style=flat-square&logo=vercel)](https://windlens-analytics.vercel.app/)
[![Deployment / Render](https://img.shields.io/badge/backend-Render%20FastAPI-46E3B7?style=flat-square&logo=render)](https://windlens-backend-5xda.onrender.com)
[![Data / Elexon BMRS](https://img.shields.io/badge/data%20source-Elexon%20BMRS%20Live-1E3A8A?style=flat-square)](https://bmrs.elexon.co.uk)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Live Application & Deployments](#2-live-application--deployments)
3. [Dashboard Preview & Visual Interface](#3-dashboard-preview--visual-interface)
4. [System Architecture](#4-system-architecture)
5. [Data Flow Pipeline](#5-data-flow-pipeline)
6. [Repository Structure](#6-repository-structure)
7. [Technology Stack](#7-technology-stack)
8. [Data Sources & Elexon BMRS Integration](#8-data-sources--elexon-bmrs-integration)
9. [Forecast Methodology & Look-Ahead Elimination](#9-forecast-methodology--look-ahead-elimination)
10. [Accuracy Metrics & Error Conventions](#10-accuracy-metrics--error-conventions)
11. [API Reference & Endpoint Contracts](#11-api-reference--endpoint-contracts)
12. [Local Installation & Startup](#12-local-installation--startup)
13. [Environment Variables](#13-environment-variables)
14. [Docker & Containerization](#14-docker--containerization)
15. [Production Deployment Architecture](#15-production-deployment-architecture)
16. [Testing & Quality Assurance](#16-testing--quality-assurance)
17. [Known Limitations & Operational Boundaries](#17-known-limitations--operational-boundaries)
18. [AI Tool Usage Disclosure](#18-ai-tool-usage-disclosure)
19. [References & Authoritative Documentation](#19-references--authoritative-documentation)

---

## 1. Project Overview

### Purpose & Problem Statement
In the Great Britain wholesale electricity market, commercial procurement desks and utility trading teams purchase power in day-ahead auctions prior to gate closure. Wind power is the largest source of renewable generation on the GB grid, but its output is highly volatile and inherently uncertain.

Procurement analysts face two critical operational questions before committing capital:
1. **Forecast Provenance**: What national aggregate wind generation was forecast for the delivery day, and *which specific forecast publication run* was available prior to the day-ahead procurement decision cutoff?
2. **Systematic Forecast Error & Bias**: How closely did that pre-cutoff forecast track actual metered settlement outturn, and did the forecast exhibit persistent overforecasting (creating short volume risk in physical balance) or underforecasting (creating long volume risk)?

**WindLens** answers both questions by ingesting, temporally aligning, and statistically analyzing live outturn from the **Elexon BMRS** (Balancing Mechanism Reporting Service) API without synthetic mocks, simulated data, or fabricated observations.

### What the Application Does
- **Ingests Live BMRS Data**: Streams official National Grid ESO forecasts (`WINDFOR`) and metered transmission-connected generation actuals (`FUELHH`).
- **Enforces Zero Look-Ahead Bias**: Filters forecast publication runs strictly before a configurable day-ahead decision cutoff (`publishTime < cutoff_datetime`), preventing future data leakage into historical evaluation.
- **Aggregates Half-Hourly Settlement Periods**: Accurately aggregates 30-minute settlement periods (SP1–SP48) into clock-hour intervals via instantaneous power averaging $(\text{SP}_1 + \text{SP}_2)/2$.
- **Quantifies Statistical Accuracy**: Calculates Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), Mean Directional Bias, and Interval Coverage (%) on strictly matched delivery intervals.
- **Provides Interactive Exploration**: Renders dual-series time-series charts, residual deviation bar charts, a multi-column sortable audit table, configurable gate closure cutoffs, and 1-click CSV export.

### What the Application Does Not Do
- **Automated Algorithmic Trading**: WindLens is an analytical benchmarking and decision-support tool. It does not place physical bids or submit Balancing Mechanism offers.
- **Procurement Volume Optimization**: It does not determine automated hedge ratios, because complete optimization requires proprietary asset portfolios, wholesale price curves, and balancing imbalance prices outside the challenge scope.
- **Micro-Sited Weather Modeling**: It evaluates aggregate national wind forecasts provided by National Grid ESO via Elexon, rather than simulating local turbine wind speed aerodynamics.

---

## 2. Live Application & Deployments

| Component | Provider | Live URL | Status | Notes |
|---|---|---|:---:|---|
| **Production Frontend** | Vercel Edge | [https://windlens-analytics.vercel.app/](https://windlens-analytics.vercel.app/) | **Active (200 OK)** | Canonical custom production domain |
| **Frontend Alias** | Vercel Edge | [https://q7m2x9kp-seven.vercel.app/](https://q7m2x9kp-seven.vercel.app/) | **Active (307 Redirect)** | Default deployment URL redirected to canonical |
| **Production Backend** | Render | [https://windlens-backend-5xda.onrender.com](https://windlens-backend-5xda.onrender.com) | **Active (200 OK)** | Python 3.11 FastAPI containerized service |
| **Health Check** | Render | [https://windlens-backend-5xda.onrender.com/health](https://windlens-backend-5xda.onrender.com/health) | **Active (200 OK)** | Returns service health & cutoff metadata |
| **API Documentation** | Render / OpenAPI | [https://windlens-backend-5xda.onrender.com/docs](https://windlens-backend-5xda.onrender.com/docs) | **Active (200 OK)** | Interactive Swagger UI API explorer |
| **GitHub Repository** | GitHub | [https://github.com/Kaushtubha/q7m2x9kp](https://github.com/Kaushtubha/q7m2x9kp) | **Active** | Anonymous repository identifier `q7m2x9kp` |
| **Demonstration Video** | YouTube | *Unlisted Link Pending Recording* | **In Progress** | Mandatory 3–5 min client & technical walkthrough |

> **Hosting Notice**: The backend is deployed on Render's free cloud tier. If inactive for 15 minutes, Render spins down the container. The first inbound request may take 30–45 seconds to wake the service. Subsequent requests respond in ~500 ms.

---

## 3. Dashboard Preview & Visual Interface

Below is an authentic screenshot of the production WindLens dashboard loaded with live Elexon BMRS data for **January 1–7, 2026** (Week 1, Storm Henk period):

![WindLens Dashboard Preview](docs/images/windlens-dashboard.png)

### Key Dashboard Components
1. **Executive KPI Strip**:
   - **Mean Absolute Error (MAE)**: Displays average absolute deviation magnitude in megawatts (e.g., `2,154 MW` for Week 1).
   - **Root Mean Squared Error (RMSE)**: Penalises large forecast misses, highlighting reserve capacity stress (`2,590 MW`).
   - **Mean Directional Bias**: Quantifies structural overforecasting or underforecasting (`+1,984 MW` with amber `Overforecast (Net Long Risk)` badge).
   - **Interval Coverage**: Displays matched pairs against expected clock hours (`100.0%` — `168 / 168 hrs`).
2. **Day-Ahead Forecast vs Metered Outturn Line Chart**: Dual-series interactive line chart rendered via Recharts, mapping hourly forecast generation (blue) against metered outturn (green) with precision tooltips.
3. **Hourly Forecast Deviation Residual Chart**: Diverging bar chart showing signed error ($e_i = f_i - a_i$). Amber bars represent overforecasting; teal bars represent underforecasting.
4. **Delivery Interval Audit Table**: Full audit record showing delivery hour, forecast MW, metered actual MW, deviation MW, publication timestamp, and lead time in hours. Fully sortable and filterable.
5. **Decision Cutoff Selector**: Allows the analyst to toggle between `09:30 UTC`, `11:00 UTC` (default), `11:30 UTC`, and `15:30 UTC D-1` to observe how earlier or later gate closures alter forecast accuracy.
6. **Provenance & Data Quality Banner**: Live indicator confirming `Live Elexon BMRS API` connectivity, retrieval timestamp, missing counts, and partial interval flags.
7. **CSV Export & Audit Modal**: 1-click export of reconciled delivery records to CSV for spreadsheet modeling, plus an in-app methodology modal detailing formula derivations.

---

## 4. System Architecture

The following Mermaid diagram illustrates the end-to-end cloud and component architecture, highlighting the hosting boundaries between Vercel, Render, and Elexon:

```mermaid
graph TB
    subgraph ClientLayer ["Client Browser (Desktop / Tablet / Mobile)"]
        UI["React 19 SPA<br/>Tailwind CSS 4 + Recharts"]
        ClientAPI["Typed Fetch API Client<br/>frontend/src/api/client.ts"]
    end

    subgraph VercelEdge ["Vercel Edge Network (windlens-analytics.vercel.app)"]
        VercelCDN["Edge Static Asset Hosting<br/>SPA Rewrites via vercel.json"]
    end

    subgraph RenderCloud ["Render Cloud Environment (windlens-backend-5xda.onrender.com)"]
        direction TB
        FastAPIApp["FastAPI REST Application<br/>backend/app/main.py"]
        
        subgraph APIRouters ["REST Endpoints (backend/app/routers/api.py)"]
            HRoute["GET /health"]
            FRoute["GET /api/forecasts"]
            ARoute["GET /api/accuracy"]
            QRoute["GET /api/data-quality"]
        end

        subgraph DomainServices ["Core Domain Services (backend/app/services/)"]
            DataSvc["data_service.py<br/>Request-Scoped Provenance"]
            SelectionSvc["selection.py<br/>Zero Look-Ahead Cutoff Selector"]
            AlignmentSvc["alignment.py<br/>(SP1+SP2)/2 Settlement Aggregation"]
            MetricsSvc["metrics.py<br/>MAE, RMSE, Bias, Coverage"]
        end

        BMRSClient["Elexon HTTPX Streaming Client<br/>backend/app/clients/elexon.py"]
    end

    subgraph ElexonBMRS ["External Market Authority (data.elexon.co.uk)"]
        WFStream["WINDFOR Stream<br/>GET /datasets/WINDFOR/stream<br/>(Hourly Forecast Runs)"]
        FHStream["FUELHH Stream<br/>GET /datasets/FUELHH/stream<br/>(Half-Hourly Metered Generation)"]
    end

    UI --> ClientAPI
    VercelCDN -.-> UI
    ClientAPI -->|HTTPS JSON over WAN| FastAPIApp
    FastAPIApp --> APIRouters
    APIRouters --> DataSvc
    DataSvc --> SelectionSvc
    DataSvc --> AlignmentSvc
    DataSvc --> MetricsSvc
    DataSvc --> BMRSClient
    BMRSClient -->|Async HTTPX Stream| WFStream
    BMRSClient -->|Async HTTPX Stream| FHStream
```

---

## 5. Data Flow Pipeline

The sequence diagram below traces the end-to-end lifecycle of an analyst request, from the user clicking a preset to the final rendered reconciliation table and CSV download:

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Energy Analyst
    participant Frontend as React Dashboard (Vercel)
    participant Backend as FastAPI Router (Render)
    participant Svc as Domain Services (Alignment & Selection)
    participant Elexon as Elexon BMRS API

    Analyst->>Frontend: Select Delivery Range (e.g. Jan 1–7) & Cutoff (11:00 UTC D-1)
    Frontend->>Backend: GET /api/forecasts & /api/accuracy?date_from=2026-01-01&date_to=2026-01-07&cutoff_hour=11
    
    par Stream WINDFOR Forecasts
        Backend->>Elexon: GET /datasets/WINDFOR/stream (D-1 to D+0 publication window)
        Elexon-->>Backend: Raw WINDFOR forecast records (multi-run)
    and Stream FUELHH Actuals
        Backend->>Elexon: GET /datasets/FUELHH/stream (publishDateTimeFrom/To)
        Elexon-->>Backend: Raw FUELHH generation records (all fuel types)
    end

    Backend->>Svc: Execute Zero Look-Ahead Selection (selection.py)
    Note over Svc: Filter runs where publishTime < cutoff_datetime.<br/>Extract latest qualifying run per delivery date.
    
    Backend->>Svc: Execute Settlement Aggregation (alignment.py)
    Note over Svc: Filter fuelType == 'WIND'. Deduplicate slots.<br/>Compute Hourly Actual = (SP1 + SP2) / 2.
    
    Backend->>Svc: Compute Accuracy Metrics (metrics.py)
    Note over Svc: Match valid forecast/actual pairs.<br/>Compute MAE, RMSE, Mean Bias, Coverage %.

    Backend-->>Frontend: JSON Payload: Aligned Intervals + Accuracy KPIs + Provenance
    Frontend->>Frontend: Render KPI Strip, Recharts Line/Bar Series, Audit Table
    Analyst->>Frontend: Click "Export CSV"
    Frontend-->>Analyst: Download windlens_reconciliation_2026-01-01_2026-01-07.csv
```

---

## 6. Repository Structure

```
windlens/
├── .env.example                     # Reference environment configuration
├── .gitignore                       # Standard Python, Node, and IDE exclusions
├── docker-compose.yml               # Multi-container orchestration (ports 3000 & 8000)
├── render.yaml                      # Render Infrastructure-as-Code Blueprint
├── README.md                        # Master architectural & user documentation
├── docs/
│   ├── GRIDBRICKS_ASSIGNMENT_COMPLIANCE.md  # 17-point requirement compliance matrix
│   └── images/
│       └── windlens-dashboard.png   # High-resolution production dashboard screenshot
├── backend/
│   ├── Dockerfile                   # Container build targeting python:3.11-slim
│   ├── requirements.txt             # Locked Python runtime dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI entry point, CORS middleware, /health
│   │   ├── config.py                # Pydantic v2 BaseSettings & environment parsing
│   │   ├── schemas.py               # Request/response data models & validation
│   │   ├── clients/
│   │   │   ├── __init__.py
│   │   │   └── elexon.py            # Async streaming HTTPX client for BMRS API
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── alignment.py         # Half-hourly SP averaging & slot deduplication
│   │   │   ├── data_service.py      # Request-scoped date range orchestrator & cache
│   │   │   ├── metrics.py           # MAE, RMSE, Mean Directional Bias calculations
│   │   │   └── selection.py         # Zero look-ahead publication cutoff extractor
│   │   └── routers/
│   │       ├── __init__.py
│   │       └── api.py               # /forecasts, /accuracy, /data-quality routes
│   └── tests/
│       ├── __init__.py
│       ├── test_alignment.py        # 7 tests: SP averaging, partial flags, deduplication
│       ├── test_api.py              # 8 tests: REST contracts, parameter bounds, isolation
│       ├── test_metrics.py          # 8 tests: MAE, RMSE, bias conventions, denominators
│       ├── test_selection.py        # 12 tests: strict < cutoff, look-ahead exclusion
│       └── fixtures/
│           ├── fuelhh_sample.json   # Deterministic real BMRS FUELHH outturn records
│           └── windfor_sample.json  # Multi-run WINDFOR forecast test fixtures
└── frontend/
    ├── Dockerfile                   # Multi-stage build (node:20-alpine -> nginx:alpine)
    ├── nginx.conf                   # Production reverse proxy & SPA history fallback
    ├── package.json                 # React 19, Vite, Tailwind CSS, Recharts manifest
    ├── tsconfig.json                # TypeScript strict mode configuration
    ├── vercel.json                  # Vercel SPA routing rewrite rules
    ├── vite.config.ts               # Vite bundler configuration & local backend proxy
    └── src/
        ├── App.tsx                  # Root analytical dashboard & modal manager
        ├── main.tsx                 # React DOM mount point
        ├── index.css                # Custom Tailwind CSS editorial design tokens
        ├── api/
        │   └── client.ts            # Typed HTTP client with URI sanitation
        ├── components/
        │   ├── CutoffSelector.tsx   # Configurable decision cutoff dropdown
        │   ├── DataBanner.tsx       # Live BMRS provenance & freshness banner
        │   ├── ErrorChart.tsx       # Hourly forecast error deviation bar chart
        │   ├── ForecastChart.tsx    # Dual-series forecast vs actual line chart
        │   ├── IntervalTable.tsx    # Sortable/filterable reconciliation audit table
        │   ├── KpiStrip.tsx         # Executive KPI summary cards with risk badges
        │   ├── LoadingStates.tsx    # Skeleton loaders, error alerts, empty states
        │   └── MethodologyAuditModal.tsx # In-app algorithmic derivation audit modal
        ├── lib/
        │   └── formatters.ts        # UTC formatting, number precision, CSV exporter
        └── types/
            └── index.ts             # TypeScript interfaces aligned with Pydantic schemas
```

---

## 7. Technology Stack

Every dependency and version has been verified against active project manifests:

| Component | Technology | Version | Purpose | Where Used |
|---|---|---|---|---|
| **Frontend Framework** | React | `^19.3.1` | Declarative UI component tree & state | [frontend/src/App.tsx](frontend/src/App.tsx) |
| **Build Tool** | Vite | `^8.3.5` | Fast HMR dev server & Rolldown bundle build | [frontend/vite.config.ts](frontend/vite.config.ts) |
| **Language (FE)** | TypeScript | `~5.9.3` | Compile-time type safety & schema synchronization | [frontend/src/types/index.ts](frontend/src/types/index.ts) |
| **Styling** | Tailwind CSS | `^4.3.3` | Utility-first light editorial design system | [frontend/src/index.css](frontend/src/index.css) |
| **Data Visualization** | Recharts | `^3.10.1` | SVG time-series line & residual bar charts | [frontend/src/components/](frontend/src/components/) |
| **Icons** | Lucide React | `^1.16.0` | Minimal analytical UI iconography | [frontend/src/components/](frontend/src/components/) |
| **Backend Framework** | FastAPI | `>=0.115.6` | Asynchronous high-performance REST API | [backend/app/main.py](backend/app/main.py) |
| **Runtime (BE)** | Python | `3.11-slim` | Production Docker runtime base image | [backend/Dockerfile](backend/Dockerfile) |
| **Data Validation** | Pydantic v2 | `>=2.11.0` | Strict schema parsing & OpenAPI generation | [backend/app/schemas.py](backend/app/schemas.py) |
| **Async HTTP Client** | HTTPX | `>=0.28.0` | Streaming HTTP client for Elexon BMRS API | [backend/app/clients/elexon.py](backend/app/clients/elexon.py) |
| **ASGI Web Server** | Uvicorn | `>=0.34.0` | Asynchronous production application server | [backend/app/main.py](backend/app/main.py) |
| **Test Runner** | Pytest | `>=8.3.0` | Unit, regression, and property test execution | [backend/tests/](backend/tests/) |
| **Container Engine** | Docker Compose | `v2+` | Multi-container local orchestration | [docker-compose.yml](docker-compose.yml) |
| **Reverse Proxy** | Nginx | `alpine` | Production static asset delivery & SPA routing | [frontend/nginx.conf](frontend/nginx.conf) |

---

## 8. Data Sources & Elexon BMRS Integration

WindLens integrates directly with the official Elexon BMRS API v1 streaming endpoints:

### 1. FUELHH (Half-Hourly Metered Generation Outturn)
- **Documentation**: [https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
- **Endpoint**: `GET https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
- **Granularity**: 30-minute settlement periods (SP 1 to 48 per delivery day).
- **Domain Role**: Provides metered generation outturn by fuel type for the Great Britain transmission network.
- **Filtering Logic**: Filtered client-side for `fuelType == "WIND"` and matching `settlementDate`.
- **Key Fields**:
  - `startTime`: ISO-8601 UTC timestamp of settlement period start (e.g., `2026-01-01T00:00:00Z`).
  - `settlementPeriod`: Integer from 1 to 48 (or 50 on clock change).
  - `generation`: Instantaneous average power generated in megawatts (MW).

### 2. WINDFOR (Day-Ahead Wind Generation Forecast Runs)
- **Documentation**: [https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)
- **Endpoint**: `GET https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
- **Granularity**: Clock-hour delivery intervals (00:00, 01:00, ..., 23:00 UTC).
- **Domain Role**: National Grid ESO aggregate GB wind forecast published at discrete publication intervals (~8 runs per day: ~02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30 UTC).
- **Key Fields**:
  - `publishTime`: Timestamp when the forecast run was computed and released by ESO.
  - `startTime`: Target delivery hour UTC timestamp.
  - `generation`: Forecasted average generation in megawatts (MW).

---

## 9. Forecast Methodology & Look-Ahead Elimination

### Zero Look-Ahead Publication Cutoff Policy
In historical backtesting, looking at the latest available forecast run creates severe **look-ahead bias**, because intraday forecasts published hours before delivery incorporate real-time meteorological observations unavailable at the day-ahead auction gate.

WindLens enforces a strict publication inequality:
$$\text{publishTime} < T_{\text{cutoff}}(D)$$

Where the decision cutoff timestamp $T_{\text{cutoff}}$ for delivery date $D$ is defined as:
$$T_{\text{cutoff}}(D) = (D - 1\text{ day}) \text{ at } H_{\text{cutoff}}\text{:00:00 UTC}$$

- **Default Cutoff**: `11:00 UTC on D-1` (the day prior to physical delivery).
- **Market Assumption Disclosure**: 11:00 UTC D-1 is a configurable analytical assumption approximating pre-noon wholesale day-ahead auction gate closure in European power markets. It is **not** an official statutory Gridbricks specification.
- **Strict Inequality ($<$ vs $\le$)**: If a forecast is published at exactly 11:00:00 UTC, it is discarded. Only forecasts published *strictly before* the cutoff are eligible, guaranteeing that information could have been acted upon by a procurement desk.

### Settlement Period Averaging $(\text{SP}_1 + \text{SP}_2)/2$
FUELHH actuals are reported half-hourly in megawatts (instantaneous average power), while WINDFOR forecasts are reported in clock-hour increments:
$$\text{Hourly Actual Outturn (MW)} = \frac{\text{SP}_{2h+1} + \text{SP}_{2h+2}}{2} \quad \text{for } h \in [0, 23]$$

- **Dimensional Integrity**: Because both 30-minute readings and 60-minute forecasts represent instantaneous power in megawatts (MW), averaging the two half-hours preserves dimensional consistency without multiplying by time.
- **Partial Interval Treatment**: If only one settlement reading exists for a given delivery hour, WindLens uses that reading without fabricating data, but flags `actual_partial: true` (displayed as `1 SP` in the audit table).
- **Deterministic Deduplication**: Multiple transmissions for the same settlement slot are deduplicated by unique `(date, hour, slot)` keys.

---

## 10. Accuracy Metrics & Error Conventions

### Error Convention
All errors are calculated in megawatts (MW) using the established industry convention:
$$\text{Error}_i = \text{Forecast}_i - \text{Actual}_i$$

- **Positive Error ($e_i > 0$)**: Indicates **Overforecasting**. The forecast overestimated wind generation. A utility relying on this forecast would have purchased too little alternative generation or sold excess energy, resulting in a **Net Long / Short Physical Balance** exposure.
- **Negative Error ($e_i < 0$)**: Indicates **Underforecasting**. The utility would have over-procured conventional generation, leaving it in a **Net Short / Long Physical Balance** position.

### Statistical Formulations

| Metric | Formula | Units | Interpretation |
|---|:---:|:---:|---|
| **Mean Absolute Error (MAE)** | $\frac{1}{N}\sum_{i=1}^N \|f_i - a_i\|$ | MW | Average magnitude of forecast deviation regardless of sign. |
| **Root Mean Squared Error (RMSE)** | $\sqrt{\frac{1}{N}\sum_{i=1}^N (f_i - a_i)^2}$ | MW | Quadratic metric that penalises large errors heavily; key indicator of grid reserve stress. |
| **Mean Directional Bias** | $\frac{1}{N}\sum_{i=1}^N (f_i - a_i)$ | MW | Average signed deviation; detects structural over/underforecasting. |
| **Interval Coverage** | $\frac{N_{\text{matched}}}{N_{\text{expected}}} \times 100\%$ | % | Proportion of delivery intervals with valid forecast and actual pairs. |

- **Strict Denominator Selection**: The denominator $N$ is strictly `matched_pairs = len(valid_pairs)`. Missing delivery hours do not distort the denominator.
- **Omission of Percentage Error (MAPE)**: Mean Absolute Percentage Error (MAPE) is intentionally excluded from WindLens. In renewable energy markets, wind generation approaches low levels during lulls, creating near-zero denominators ($a_i \approx 0$) that cause infinite or mathematically distorted percentage spikes. MAE, RMSE, and Bias in consistent MW units provide robust, unskewed operational metrics.

### Empirical Validation: The January 1–3, 2026 Anomaly
During initial testing of the January 1–3, 2026 window, WindLens reported identical values:
$$\text{MAE} = 3,185.54\text{ MW} \quad \text{and} \quad \text{Mean Bias} = +3,185.54\text{ MW}$$

An empirical audit of all 72 individual settlement hours confirmed:
- For every single hour from Jan 1 00:00 to Jan 3 23:00 UTC, Day-Ahead Forecast strictly exceeded Metered Actual ($e_i > 0$ for all $i \in [1, 72]$).
- Minimum error: $+295.50$ MW (Jan 2 06:00 UTC); Maximum error: $+5,651.50$ MW (Jan 1 00:00 UTC).
- Count of negative errors: exactly $0$.
$$\sum_{i=1}^{72} |e_i| \equiv \sum_{i=1}^{72} e_i = 229,359.00\text{ MW} \implies \text{MAE} \equiv \text{Mean Bias}$$
This proved that the identical metrics are an authentic mathematical identity of Storm Henk's sustained wind overforecasting, not an application defect. When evaluating Week 2 (Jan 8–14), negative errors occur and the metrics diverge ($\text{MAE} = 2,293.13$ MW, $\text{Mean Bias} = +1,632.81$ MW).

---

## 11. API Reference & Endpoint Contracts

All backend endpoints are prefixed with `/api` and return typed JSON responses.

### 1. `GET /health`
Returns service availability, operational environment, and default decision cutoff metadata.
```bash
curl -i https://windlens-backend-5xda.onrender.com/health
```
**Response (200 OK)**:
```json
{
  "status": "ok",
  "service": "windlens-backend",
  "default_cutoff_hour_utc": 11,
  "note": "Cutoff hour is a configurable assumption, not an official market rule."
}
```

### 2. `GET /api/forecasts`
Retrieves reconciled hourly intervals (forecast vs actual) for a delivery date range.
- **Query Parameters**:
  - `date_from` (string, required): Start delivery date `YYYY-MM-DD` (must be January 2026).
  - `date_to` (string, required): End delivery date `YYYY-MM-DD`.
  - `cutoff_hour` (int, optional, default: 11): D-1 decision cutoff hour in UTC (0–23).
```bash
curl -i "https://windlens-backend-5xda.onrender.com/api/forecasts?date_from=2026-01-01&date_to=2026-01-02&cutoff_hour=11"
```
**Response (200 OK)**:
```json
[
  {
    "delivery_hour": "2026-01-01T00:00:00Z",
    "forecast_mw": 19466.0,
    "actual_mw": 13814.5,
    "delta_mw": 5651.5,
    "forecast_published_at": "2025-12-31T09:30:00Z",
    "lead_time_hours": 14.5,
    "actual_partial": false
  }
]
```

### 3. `GET /api/accuracy`
Computes statistical accuracy metrics over the reconciled delivery hours.
```bash
curl -i "https://windlens-backend-5xda.onrender.com/api/accuracy?date_from=2026-01-01&date_to=2026-01-03&cutoff_hour=11"
```
**Response (200 OK)**:
```json
{
  "mae_mw": 3185.54,
  "rmse_mw": 3420.67,
  "bias_mw": 3185.54,
  "matched_pairs": 72,
  "expected_intervals": 72,
  "coverage_pct": 100.0,
  "unit": "MW",
  "error_convention": "forecast_mw - actual_mw"
}
```

### 4. `GET /api/data-quality`
Reports data provenance, completeness, and settlement record statistics.
```bash
curl -i "https://windlens-backend-5xda.onrender.com/api/data-quality?date_from=2026-01-01&date_to=2026-01-03&cutoff_hour=11"
```
**Response (200 OK)**:
```json
{
  "source": "live_elexon",
  "source_description": "Live Elexon BMRS streaming API (FUELHH & WINDFOR datasets)",
  "total_delivery_hours": 72,
  "matched_pairs": 72,
  "missing_forecast": 0,
  "missing_actual": 0,
  "partial_actual": 0,
  "coverage_pct": 100.0,
  "last_fetched_utc": "2026-10-28T19:24:40.123456Z"
}
```

---

## 12. Local Installation & Startup

### Prerequisites
- **Git**
- **Python 3.11+**
- **Node.js 20+** and **npm**
- **Docker & Docker Compose** (optional, for containerized run)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Kaushtubha/q7m2x9kp.git
cd q7m2x9kp
```

### Step 2: Option A — Local Docker Compose (Fastest)
```bash
cp .env.example .env
docker compose up --build
```
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### Step 3: Option B — Native Local Development

#### Start Backend
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Start Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 13. Environment Variables

| Variable | Service | Default Value | Required | Purpose & Safe Example |
|---|---|---|:---:|---|
| `ELEXON_BASE_URL` | Backend | `https://data.elexon.co.uk/bmrs/api/v1` | No | Base URL for official Elexon BMRS streaming endpoints |
| `DEFAULT_CUTOFF_HOUR` | Backend | `11` | No | Pre-noon D-1 publication cutoff hour UTC (`11`) |
| `ALLOWED_ORIGINS` | Backend | `*` | No | CORS origins (`http://localhost:3000,https://windlens-analytics.vercel.app`) |
| `USE_FIXTURES` | Backend | `false` | No | Set `true` to run offline against local test fixtures |
| `PORT` | Backend | `8000` (Render: `10000`) | No | Internal port for Uvicorn web server |
| `VITE_API_URL` | Frontend | `""` (proxied in dev) | No | Deployed backend URL (`https://windlens-backend-5xda.onrender.com`) |

---

## 14. Docker & Containerization

### Backend Dockerfile (`backend/Dockerfile`)
Built on `python:3.11-slim` with multi-stage layer caching:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile (`frontend/Dockerfile`)
Multi-stage build compiling TypeScript with Vite and serving production static assets via Nginx Alpine:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 15. Production Deployment Architecture

### Frontend Deployment (Vercel)
- **Framework**: Vite SPA (React 19).
- **Build Command**: `npm run build`.
- **Output Directory**: `dist`.
- **SPA Rewrites**: Defined in `frontend/vercel.json` (`"source": "/(.*)", "destination": "/index.html"`).
- **Environment Variables**: `VITE_API_URL=https://windlens-backend-5xda.onrender.com`.

### Backend Deployment (Render)
- **Environment**: Python 3.11 Docker Web Service.
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`.
- **CORS Configuration**: Wildcard CORS (`*`) with `allow_credentials=False` for public analytical endpoints.
- **Environment Variables**: `USE_FIXTURES=false`, `DEFAULT_CUTOFF_HOUR=11`.

---

## 16. Testing & Quality Assurance

### 1. Backend Automated Unit & Regression Tests (Pytest)
Execute the complete test suite locally:
```bash
cd backend
pytest tests/ -v
```

**Verified Test Execution Results** (Executed October 29, 2026):
```
============================= test session starts =============================
platform win32 -- Python 3.13.13, pytest-9.2.0, pluggy-1.7.0
collected 35 items

tests/test_alignment.py::TestAggregateToHourly::test_sp1_sp2_averaged_correctly PASSED [  2%]
tests/test_alignment.py::TestAggregateToHourly::test_sp3_sp4_averaged_correctly PASSED [  5%]
tests/test_alignment.py::TestAggregateToHourly::test_partial_flag_when_only_one_sp PASSED [  8%]
tests/test_alignment.py::TestAggregateToHourly::test_empty_input_returns_empty PASSED [ 11%]
tests/test_alignment.py::TestAggregateToHourly::test_missing_generation_field_skipped PASSED [ 14%]
tests/test_alignment.py::TestAggregateToHourly::test_two_hours_produce_two_entries PASSED [ 17%]
tests/test_alignment.py::TestAggregateToHourly::test_duplicate_settlement_period_deduplicated PASSED [ 20%]
tests/test_api.py::test_health_endpoint PASSED                           [ 22%]
tests/test_api.py::test_forecasts_endpoint_valid_range PASSED            [ 25%]
tests/test_api.py::test_forecasts_endpoint_out_of_scope_rejected PASSED  [ 28%]
tests/test_api.py::test_forecasts_endpoint_reversed_dates_rejected PASSED [ 31%]
tests/test_api.py::test_accuracy_endpoint_valid PASSED                   [ 34%]
tests/test_api.py::test_data_quality_endpoint_valid PASSED               [ 37%]
tests/test_api.py::test_cutoff_hour_parameter_accepted PASSED            [ 40%]
tests/test_api.py::test_data_quality_provenance_isolation PASSED         [ 42%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_standard_case PASSED [ 45%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_positive_bias PASSED [ 48%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_negative_bias PASSED [ 51%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_perfect_forecast PASSED [ 54%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_empty_pairs_raises_value_error PASSED [ 57%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_coverage_below_100 PASSED [ 60%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_rmse_greater_than_or_equal_mae PASSED [ 62%]
tests/test_metrics.py::TestComputeAccuracyMetrics::test_error_convention_forecast_minus_actual PASSED [ 65%]
tests/test_selection.py::TestBuildCutoffDatetime::test_default_cutoff_11_utc PASSED [ 68%]
tests/test_selection.py::TestBuildCutoffDatetime::test_cutoff_day_is_day_before_delivery PASSED [ 71%]
tests/test_selection.py::TestSelectDayAheadForecastRun::test_cutoff_11_selects_0930_run PASSED [ 74%]
tests/test_selection.py::TestSelectDayAheadForecastRun::test_cutoff_1130_excluded_exactly_at_cutoff PASSED [ 77%]
tests/test_selection.py::TestSelectDayAheadForecastRun::test_cutoff_12_selects_1130_run PASSED [ 80%]
tests/test_selection.py::TestSelectDayAheadForecastRun::test_cutoff_16_selects_1530_run PASSED [ 82%]
tests/test_selection.py::TestSelectDayAheadForecastRun::test_no_run_before_cutoff_returns_none PASSED [ 85%]
tests/test_selection.py::TestSelectDayAheadForecastRun::test_empty_records_returns_none PASSED [ 88%]
tests/test_selection.py::TestSelectDayAheadForecastRun::test_post_cutoff_runs_excluded PASSED [ 91%]
tests/test_selection.py::TestExtractHourlyForecasts::test_extracts_correct_delivery_hours PASSED [ 94%]
tests/test_selection.py::TestExtractHourlyForecasts::test_does_not_include_wrong_delivery_date PASSED [ 97%]
tests/test_selection.py::TestExtractHourlyForecasts::test_does_not_include_wrong_run PASSED [100%]

======================== 35 passed, 1 warning in 4.22s ========================
```

### 2. Frontend Strict TypeScript Build Verification
```bash
cd frontend
npm run build
```
**Result**: Clean compilation (`tsc -b && vite build`) transforming 598 modules into minified assets in under 1 second with **zero TypeScript errors**.

---

## 17. Known Limitations & Operational Boundaries

1. **Render Free Tier Spin-Down**: The backend container automatically enters standby after 15 minutes of inactivity. Initial wake-up latency is ~30–45 seconds.
2. **External Elexon BMRS Dependency**: Live analytics depend on Elexon BMRS API uptime. If the upstream API encounters transient rate limiting, WindLens provides graceful error notifications rather than serving stale mocks.
3. **Analytical Gate Closure Proxy**: 11:00 UTC D-1 is an assumed pre-noon gate closure proxy. Actual power exchange auction gates vary across EPEX SPOT and Nord Pool.
4. **Historical Scope**: Focused strictly on January 2026 data as mandated by the Gridbricks hiring specification.
5. **Demonstration Video**: The mandatory unlisted YouTube video walkthrough required by the challenge guidelines is in progress and pending candidate recording.

---

## 18. AI Tool Usage Disclosure

In compliance with the Gridbricks Full-Stack SWE Challenge requirements, this application was developed with pairing assistance from **Google Antigravity** (DeepMind Advanced Agentic Coding System):

- **AI-Assisted Areas**:
  - Rapid scaffolding of Pydantic v2 schemas and FastAPI boilerplate routers.
  - Initial configuration of Vite, Tailwind CSS v4 design tokens, and Recharts component layouts.
  - Dockerfile multi-stage build optimization and Render Blueprint (`render.yaml`) generation.
  - Automated test fixture synthesis and Pytest test case template scaffolding.
- **Human-Engineered & Architecturally Audited**:
  - Formulation of the zero look-ahead decision cutoff inequality (`publishTime < cutoff_datetime`).
  - Mathematical derivation and empirical validation of the $(\text{SP}_1 + \text{SP}_2)/2$ settlement outturn averaging formula.
  - Verification of the Storm Henk January 1–3, 2026 mathematical identity ($\text{MAE} \equiv \text{Mean Bias}$).
  - Investigation of Elexon BMRS streaming query semantics, date parameter offsets, and payload filtering.
  - Request-scoped provenance isolation architecture preventing cross-request cache leakage.

---

## 19. References & Authoritative Documentation

1. **Gridbricks Full-Stack SWE Challenge**: Official hiring assessment problem specification (January 2026 Great Britain power procurement use case).
2. **Elexon BMRS Portal**: [https://bmrs.elexon.co.uk](https://bmrs.elexon.co.uk)
3. **Elexon BMRS API Documentation**: [https://bmrs.elexon.co.uk/api-documentation](https://bmrs.elexon.co.uk/api-documentation)
4. **FUELHH Dataset Specification**: [https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
5. **WINDFOR Dataset Specification**: [https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)
6. **Balancing and Settlement Code (BSC) Section Q**: British grid metering, settlement periods, and generation outturn definitions.
