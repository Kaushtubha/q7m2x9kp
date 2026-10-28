import { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import type { AccuracyMetrics, DataQualityReport, ForecastActualPair } from './types';
import { CUTOFF_OPTIONS } from './types';
import { KpiStrip } from './components/KpiStrip';
import { ForecastChart } from './components/ForecastChart';
import { ErrorChart } from './components/ErrorChart';
import { IntervalTable } from './components/IntervalTable';
import { exportToCSV } from './lib/formatters';

const DATE_PRESETS = [
  { label: 'Jan 1–3 (Fixtures & Live)', from: '2026-01-01', to: '2026-01-03' },
  { label: 'Jan 1–7 (Week 1)', from: '2026-01-01', to: '2026-01-07' },
  { label: 'Jan 8–14 (Week 2)', from: '2026-01-08', to: '2026-01-14' },
  { label: 'Jan 15–21 (Week 3)', from: '2026-01-15', to: '2026-01-21' },
  { label: 'Jan 22–28 (Week 4)', from: '2026-01-22', to: '2026-01-28' },
  { label: 'Full Jan 2026', from: '2026-01-01', to: '2026-01-31' },
];

export default function App() {
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-01-03');
  const [cutoffHour, setCutoffHour] = useState<number>(11);

  const [forecasts, setForecasts] = useState<ForecastActualPair[]>([]);
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [dismissBanner, setDismissBanner] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { dateFrom, dateTo, cutoffHour };
      const [fData, mData, qData] = await Promise.all([
        api.forecasts(params),
        api.accuracy(params),
        api.dataQuality(params),
      ]);
      setForecasts(fData);
      setMetrics(mData);
      setDataQuality(qData);
    } catch (err: any) {
      console.error('Failed to fetch WindLens data:', err);
      setError(err?.message || 'Failed to fetch data from API');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, cutoffHour]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = () => {
    if (!forecasts.length) return;
    const filename = `windlens_${dateFrom}_to_${dateTo}_cutoff_${cutoffHour}UTC.csv`;
    exportToCSV(forecasts, filename);
  };

  const handlePresetClick = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e8eaf0] antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#2a3148] bg-[#0f1117]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
              <svg className="h-5 w-5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 9V3" />
                <path d="M12 15v6" />
                <path d="M9.4 13.5l-5.2 3" />
                <path d="M14.6 10.5l5.2-3" />
                <path d="M9.4 10.5l-5.2-3" />
                <path d="M14.6 13.5l5.2 3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">WindLens</h1>
                <span className="rounded bg-indigo-900/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-700/50">
                  GB Market Analytics
                </span>
              </div>
              <p className="text-xs text-[#7a839a]">Day-ahead wind power forecast vs actual generation benchmark</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowMethodology(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a3148] bg-[#1a1f2e] px-3 py-1.5 text-xs font-medium text-[#7a839a] hover:bg-[#252b3d] hover:text-[#e8eaf0] transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Methodology & Audit</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={forecasts.length === 0 || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Methodological Context & Assumption Banner */}
        {!dismissBanner && (
          <div className="relative rounded-lg border border-indigo-900/40 bg-indigo-950/20 p-4 text-xs text-indigo-200">
            <button
              onClick={() => setDismissBanner(true)}
              className="absolute right-3 top-3 text-indigo-400 hover:text-white"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
            <div className="flex items-start gap-2.5 pr-6">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                i
              </span>
              <div className="space-y-1">
                <p className="font-semibold text-indigo-100">
                  Day-Ahead Trading Horizon Assumption & Alignment Methodology
                </p>
                <p className="text-indigo-300/90 leading-relaxed">
                  Decision cutoff assumed at <strong>{cutoffHour}:00 UTC D-1</strong> (configurable). BMRS WINDFOR publishes approximately 8 runs/day; the latest run before the cutoff is selected to represent day-ahead commitments. Actual generation is calculated from FUELHH settlement records by averaging the two half-hourly periods per hour: <code className="rounded bg-indigo-950/80 px-1 py-0.5 font-mono text-[11px] text-indigo-300">(SP1 + SP2) / 2</code>. Error convention is <code className="rounded bg-indigo-950/80 px-1 py-0.5 font-mono text-[11px] text-indigo-300">Forecast − Actual</code> (positive = overforecast).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls Bar: Date Range, Presets & Cutoff Selector */}
        <section className="rounded-lg border border-[#2a3148] bg-[#1a1f2e] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Date Pickers */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="dateFrom" className="text-xs font-medium text-[#7a839a]">
                  From:
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  min="2026-01-01"
                  max="2026-01-31"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded border border-[#2a3148] bg-[#0f1117] px-2.5 py-1 text-xs text-[#e8eaf0] focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="dateTo" className="text-xs font-medium text-[#7a839a]">
                  To:
                </label>
                <input
                  id="dateTo"
                  type="date"
                  min="2026-01-01"
                  max="2026-01-31"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded border border-[#2a3148] bg-[#0f1117] px-2.5 py-1 text-xs text-[#e8eaf0] focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Cutoff Selector */}
              <div className="flex items-center gap-2 pl-0 sm:pl-3 sm:border-l sm:border-[#2a3148]">
                <label htmlFor="cutoffSelect" className="text-xs font-medium text-[#7a839a]">
                  Cutoff:
                </label>
                <select
                  id="cutoffSelect"
                  value={cutoffHour}
                  onChange={(e) => setCutoffHour(Number(e.target.value))}
                  className="rounded border border-[#2a3148] bg-[#0f1117] px-2.5 py-1 text-xs text-[#e8eaf0] focus:border-indigo-500 focus:outline-none"
                >
                  {CUTOFF_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#7a839a] mr-1">Presets:</span>
              {DATE_PRESETS.map((p) => {
                const active = dateFrom === p.from && dateTo === p.to;
                return (
                  <button
                    key={p.label}
                    onClick={() => handlePresetClick(p.from, p.to)}
                    className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                      active
                        ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 font-medium'
                        : 'border border-[#2a3148] bg-[#0f1117] text-[#7a839a] hover:text-[#e8eaf0]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4 text-xs text-red-300">
            <p className="font-semibold text-red-200">Data Fetch Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* KPI Metric Strip */}
        <KpiStrip metrics={metrics} loading={loading} />

        {/* Data Quality Overview Card */}
        {dataQuality && (
          <div className="rounded-lg border border-[#2a3148] bg-[#1a1f2e] p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[#7a839a]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[#e8eaf0] font-medium">Data Pipeline Diagnostics</span>
                <span>•</span>
                <span>Source: <strong className="text-white uppercase">{dataQuality.source}</strong></span>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px]">
                <span>Total Delivery Hours: <strong className="text-white">{dataQuality.total_delivery_hours}</strong></span>
                <span>Matched Pairs: <strong className="text-emerald-400">{dataQuality.matched_pairs}</strong></span>
                <span>Missing Forecasts: <strong className={dataQuality.missing_forecast_count > 0 ? 'text-orange-400' : 'text-white'}>{dataQuality.missing_forecast_count}</strong></span>
                <span>Missing Actuals: <strong className={dataQuality.missing_actual_count > 0 ? 'text-orange-400' : 'text-white'}>{dataQuality.missing_actual_count}</strong></span>
                <span>Partial Actuals: <strong className={dataQuality.partial_actual_count > 0 ? 'text-amber-400' : 'text-white'}>{dataQuality.partial_actual_count}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Forecast vs Actual Chart */}
        <ForecastChart data={forecasts} loading={loading} />

        {/* Forecast Error Chart */}
        <ErrorChart data={forecasts} loading={loading} />

        {/* Interval Table Detail */}
        <IntervalTable data={forecasts} loading={loading} />
      </main>

      {/* Methodology & Review Modal */}
      {showMethodology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#2a3148] bg-[#1a1f2e] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2a3148] pb-3">
              <h2 className="text-base font-bold text-white">WindLens Methodology & Technical Notes</h2>
              <button
                onClick={() => setShowMethodology(false)}
                className="text-[#7a839a] hover:text-white"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-[#cad1e0] leading-relaxed">
              <div>
                <h3 className="font-semibold text-indigo-300">1. Data Sources (Elexon BMRS)</h3>
                <p className="mt-1">
                  <strong>WINDFOR (Wind Power Forecast):</strong> Aggregated GB wind generation forecasts published approximately 8 times per day (e.g., ~09:30, 11:30, 15:30 UTC). Each run covers delivery hours out to 3 days ahead.
                </p>
                <p className="mt-1">
                  <strong>FUELHH (Generation by Fuel Type):</strong> Half-hourly outturn generation for GB fuel types. Filtered to <code>fuelType = WIND</code>, representing metered outturn per 30-minute settlement period (SP1 to SP48).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-indigo-300">2. Day-Ahead Decision Cutoff Assumption</h3>
                <p className="mt-1">
                  Power traders submitting day-ahead bids or planning reserve must freeze their forecast prior to the day-ahead gate closure (typically 11:00 or 12:00 UTC D-1).
                  WindLens assumes a default cutoff of <strong>11:00 UTC D-1</strong>. The latest WINDFOR run published strictly before 11:00 UTC on the previous day (usually the 09:30 UTC run) is selected. Look-ahead bias is strictly prevented: any run published after 11:00 UTC D-1 is excluded.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-indigo-300">3. Half-Hourly to Hourly Alignment</h3>
                <p className="mt-1">
                  FUELHH reports two 30-minute settlement periods per clock hour:
                </p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5 text-[#7a839a]">
                  <li>00:00 UTC delivery hour = SP1 (00:00–00:30) and SP2 (00:30–01:00)</li>
                  <li>Hourly Average (MW) = <code>(Gen_SP1 + Gen_SP2) / 2</code></li>
                  <li>If only one SP is available, that single value is used and flagged as <em>partial</em>.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-indigo-300">4. Error Metrics & Trading Interpretation</h3>
                <p className="mt-1">
                  <strong>Error = Forecast − Actual (MW)</strong>
                </p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5 text-[#7a839a]">
                  <li><strong>MAE (Mean Absolute Error):</strong> Average magnitude of forecasting error.</li>
                  <li><strong>RMSE (Root Mean Square Error):</strong> Penalises large errors disproportionately, critical for assessing grid imbalance stress.</li>
                  <li><strong>Mean Bias:</strong> Positive indicates systematic overforecast (short position risk), negative indicates systematic underforecast (long position risk).</li>
                  <li><strong>Coverage %:</strong> Ratio of matched (forecast + actual) hours to expected delivery hours.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-[#2a3148] bg-[#0f1117] p-3 text-[11px] text-[#7a839a]">
                <p>
                  <strong>Assessment Context:</strong> Built for Gridbricks Full-Stack SWE Challenge. Production-minded FastAPI backend + React/TypeScript dashboard with fully deterministic test coverage.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowMethodology(false)}
                className="rounded bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
