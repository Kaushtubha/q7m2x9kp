# WindLens Frontend

Modern, high-performance analytical dashboard built with React 19, TypeScript, Vite, Tailwind CSS, and Recharts.

## Features

- **Interactive Date Range & Presets:** Quick exploration across January 2026 (Week 1, Week 2, Week 3, Week 4, Full Month).
- **Day-Ahead Cutoff Selector:** Configurable gate closure cutoff (09:30 UTC D-1, 11:00 UTC D-1 default, 15:30 UTC D-1).
- **Executive KPI Strip:** MAE, RMSE, Mean Bias (directional risk indicator), and Coverage % with tooltips.
- **Pipeline Diagnostics:** Real-time visibility into matched intervals, missing forecasts, and partial actuals.
- **Time-Series Forecast vs Actual Chart:** Side-by-side comparison with formatted tooltips and UTC timestamps.
- **Hourly Forecast Error Chart:** Color-coded overforecast (orange) vs underforecast (cyan) distribution.
- **Detailed Interval Table:** Multi-column sorting (delivery hour, forecast, actual, error, lead time) and filtering (All, Overforecast, Underforecast).
- **Data Export:** Instant CSV export of all filtered delivery intervals.
- **Methodology & Audit Modal:** Transparent domain explanations and assessment disclosures.

## Getting Started

### Local Development
```bash
npm install
npm run dev
```

The frontend will run at `http://localhost:3000` and proxies `/api` and `/health` requests to the FastAPI backend at `http://localhost:8000`.

### Production Build
```bash
npm run build
```
Build output is saved to `dist/`.
