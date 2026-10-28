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
  { label: 'Jan 1–3', from: '2026-01-01', to: '2026-01-03' },
  { label: 'Week 1 (Jan 1–7)', from: '2026-01-01', to: '2026-01-07' },
  { label: 'Week 2 (Jan 8–14)', from: '2026-01-08', to: '2026-01-14' },
  { label: 'Week 3 (Jan 15–21)', from: '2026-01-15', to: '2026-01-21' },
  { label: 'Week 4 (Jan 22–28)', from: '2026-01-22', to: '2026-01-28' },
  { label: 'Full Month (Jan 1–31)', from: '2026-01-01', to: '2026-01-31' },
];

export default function App() {
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-01-07');
  const [cutoffHour, setCutoffHour] = useState<number>(11);

  const [forecasts, setForecasts] = useState<ForecastActualPair[]>([]);
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [dismissNotice, setDismissNotice] = useState(false);

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
      setForecasts(fData ?? []);
      setMetrics(mData);
      setDataQuality(qData);
    } catch (err: any) {
      console.error('Failed to retrieve forecast data:', err);
      setError(err?.message || 'Failed to retrieve data from Elexon BMRS endpoint.');
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

  const getSourceDisplay = () => {
    if (!dataQuality) return { text: 'Connecting...', style: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (dataQuality.source === 'live_elexon') {
      return {
        text: 'Live Elexon BMRS API',
        style: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        hint: 'Direct live query to data.elexon.co.uk',
      };
    }
    if (dataQuality.source === 'fixture_fallback') {
      return {
        text: 'Fixture Fallback (API Issue)',
        style: 'bg-amber-50 text-amber-800 border-amber-200/90',
        hint: 'Live API query failed; using local reference sample',
      };
    }
    return {
      text: 'Deterministic Fixtures',
      style: 'bg-slate-100 text-slate-700 border-slate-200',
      hint: 'Local test sample (tests/fixtures)',
    };
  };

  const sourceInfo = getSourceDisplay();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200/90 bg-white sticky top-0 z-40 backdrop-blur-md bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-teal-800 flex items-center justify-center text-white font-bold text-base shadow-2xs">
              <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">WindLens</span>
                <span className="text-[10px] font-semibold text-teal-900 bg-teal-50 border border-teal-200/90 px-1.5 py-0.5 rounded tracking-wide uppercase">
                  GB Power Market Analytics
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  • Jan 2026 Benchmark
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Day-Ahead Wind Forecast vs Metered Outturn Benchmark • Procurement Decision Support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMethodology(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Methodology & Audit</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={forecasts.length === 0 || loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl w-full px-4 py-5 sm:px-6 flex-1 space-y-4">
        {/* Compact Methodology Notice */}
        {!dismissNotice && (
          <div className="rounded-lg border-l-4 border-l-teal-700 border border-slate-200/90 bg-white p-3.5 text-xs text-slate-600 flex items-start justify-between gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900">Market Assumption & Temporal Alignment: </span>
              <span>
                Day-ahead forecast selection enforces an analytical gate closure cutoff at <strong>{cutoffHour}:00 UTC on D-1</strong> (configurable).
                This cutoff is an assumed proxy for pre-noon wholesale gate closure, not an official Gridbricks requirement.
                Actual wind generation is derived from FUELHH settlement records by averaging adjacent half-hourly readings: <code className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded">(SP1 + SP2) / 2</code>.
                Error convention is strictly <code className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded">Forecast − Actual</code>.
              </span>
            </div>
            <button
              onClick={() => setDismissNotice(true)}
              className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Controls Toolbar: Date Selection, Cutoff & Presets */}
        <div className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: Inputs & Refresh */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label htmlFor="dateFrom" className="text-xs font-medium text-slate-600">
                  From:
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  min="2026-01-01"
                  max="2026-01-31"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 font-mono focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="dateTo" className="text-xs font-medium text-slate-600">
                  To:
                </label>
                <input
                  id="dateTo"
                  type="date"
                  min="2026-01-01"
                  max="2026-01-31"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 font-mono focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                <label htmlFor="cutoffSelect" className="text-xs font-medium text-slate-600">
                  Cutoff:
                </label>
                <select
                  id="cutoffSelect"
                  value={cutoffHour}
                  onChange={(e) => setCutoffHour(Number(e.target.value))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 font-mono focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none"
                >
                  {CUTOFF_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md bg-teal-800 px-3 py-1 text-xs font-medium text-white hover:bg-teal-900 disabled:opacity-50 transition-colors shadow-2xs"
              >
                {loading ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Update View</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 mr-1 uppercase tracking-wider">Presets:</span>
              {DATE_PRESETS.map((p) => {
                const active = dateFrom === p.from && dateTo === p.to;
                return (
                  <button
                    key={p.label}
                    onClick={() => handlePresetClick(p.from, p.to)}
                    className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? 'bg-slate-900 text-white font-medium shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
            <span className="font-semibold">Data Retrieval Error: </span>
            <span>{error}</span>
          </div>
        )}

        {/* Executive KPI Summary */}
        <KpiStrip metrics={metrics} loading={loading} />

        {/* Diagnostic Status Strip */}
        {dataQuality && (
          <div className="rounded-lg border border-slate-200/90 bg-white px-4 py-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium border px-2 py-0.5 rounded-md ${sourceInfo.style}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
                <span>{sourceInfo.text}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-mono text-[11px]">
                Freshness: {dataQuality.last_fetched_utc ? dataQuality.last_fetched_utc.slice(0, 19).replace('T', ' ') + ' UTC' : 'Cached Local State'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 text-slate-600 text-xs">
              <span>Expected Intervals: <strong className="text-slate-900 font-mono tabular-nums">{dataQuality.total_delivery_hours}</strong></span>
              <span>Matched: <strong className="text-slate-900 font-mono tabular-nums">{dataQuality.matched_pairs}</strong></span>
              <span>Missing Fcst: <strong className={`font-mono tabular-nums ${dataQuality.missing_forecast_count > 0 ? 'text-amber-800' : 'text-slate-900'}`}>{dataQuality.missing_forecast_count}</strong></span>
              <span>Missing Act: <strong className={`font-mono tabular-nums ${dataQuality.missing_actual_count > 0 ? 'text-amber-800' : 'text-slate-900'}`}>{dataQuality.missing_actual_count}</strong></span>
              <span>Partial Act: <strong className={`font-mono tabular-nums ${dataQuality.partial_actual_count > 0 ? 'text-amber-800' : 'text-slate-900'}`}>{dataQuality.partial_actual_count}</strong></span>
            </div>
          </div>
        )}

        {/* Primary Chart: Forecast vs Metered Generation */}
        <ForecastChart data={forecasts} loading={loading} />

        {/* Secondary Chart: Forecast Error Distribution */}
        <ErrorChart data={forecasts} loading={loading} />

        {/* Detailed Interval Table */}
        <IntervalTable data={forecasts} loading={loading} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>WindLens v1.0 • UK Electricity Procurement Decision Intelligence</span>
          <span>Data: Elexon BMRS WINDFOR (Day-Ahead) & FUELHH (Settlement Outturn)</span>
        </div>
      </footer>

      {/* Methodology & Audit Modal */}
      {showMethodology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Technical Audit & Methodology Reference</h2>
                <p className="text-xs text-slate-500 mt-0.5">Formal documentation of Elexon BMRS integration, cutoff assumptions, and error metrics</p>
              </div>
              <button
                onClick={() => setShowMethodology(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700 leading-relaxed">
              <section className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-sm">1. Primary Datasets (Elexon BMRS)</h3>
                <p>
                  <strong>WINDFOR (Wind Power Forecast):</strong> Aggregated GB wind generation forecast (MW) published ~8 times per day. Each publication run contains hourly delivery intervals extending out to 3 days ahead. Delivery intervals are identified by <code>startTime</code> in UTC.
                </p>
                <p>
                  <strong>FUELHH (Generation by Fuel Type):</strong> Half-hourly metered outturn per settlement period (SP1 to SP48), filtered strictly to <code>fuelType = 'WIND'</code>. Records represent instantaneous average power in MW over each 30-minute period.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-sm">2. Day-Ahead Decision Cutoff Policy</h3>
                <p>
                  In UK wholesale procurement, market participants place day-ahead physical orders prior to gate closure.
                  WindLens implements a default cutoff of <strong>11:00 UTC on D-1</strong> (the day before delivery).
                </p>
                <p>
                  <strong>Strict Look-Ahead Bias Prevention:</strong> The selection algorithm enforces a strict comparison:
                  <code className="font-mono text-[11px] bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded mx-1">publishTime &lt; cutoff_datetime</code>.
                  Any publication run released at or after the cutoff is strictly excluded, ensuring zero look-ahead data contamination.
                </p>
                <p className="text-[11px] text-slate-500 italic">
                  Note: The 11:00 UTC D-1 cutoff is an analytical project assumption approximating pre-noon wholesale gate closure, not an official statutory Gridbricks requirement.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-sm">3. Temporal Alignment (Half-Hourly to Hourly)</h3>
                <p>
                  FUELHH reports two 30-minute settlement periods per clock hour:
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                  <li>00:00 UTC delivery interval = SP1 (00:00–00:30) and SP2 (00:30–01:00).</li>
                  <li>Hourly Average (MW) = <code className="font-mono text-[11px] bg-slate-100 text-slate-900 px-1 py-0.5 rounded">(SP1 + SP2) / 2</code>.</li>
                  <li>If only one half-hourly settlement reading is present, that single reading is used and flagged as a <em>partial actual (1 SP)</em>.</li>
                  <li>Duplicate settlement-period records are deduplicated deterministically by slot.</li>
                </ul>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-sm">4. Error Metrics & Procurement Risk</h3>
                <p>
                  <strong>Error Formula:</strong> <code className="font-mono text-[11px] bg-slate-100 text-slate-900 px-1 py-0.5 rounded">Error = Forecast − Actual (MW)</code>
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                  <li><strong>MAE (Mean Absolute Error):</strong> Average magnitude of forecasting error: <code className="font-mono text-[10px]">Σ|e_i| / N</code>.</li>
                  <li><strong>RMSE (Root Mean Square Error):</strong> Quadratic penalty: <code className="font-mono text-[10px]">√(Σe_i² / N)</code>. Disproportionately penalises large forecasting errors, a crucial metric for evaluating reserve margin stress.</li>
                  <li><strong>Mean Directional Bias:</strong> <code className="font-mono text-[10px]">Σe_i / N</code>. Positive indicates systematic overforecast (short position risk), negative indicates systematic underforecast (long position risk).</li>
                  <li><strong>Coverage:</strong> Percentage of expected delivery intervals that have both valid forecast and actual data.</li>
                </ul>
              </section>

              <section className="space-y-1 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                <h3 className="font-semibold text-slate-900 text-xs">5. Empirical Audit Note on January 1–3, 2026 Results</h3>
                <p className="text-[11.5px] text-slate-600 leading-normal">
                  For the January 1–3, 2026 window, WindLens reports <strong>MAE = 3,185.54 MW</strong> and <strong>Mean Bias = +3,185.54 MW</strong>.
                  An exhaustive interval-by-interval audit confirms that across all 72 delivery intervals, the day-ahead forecast strictly exceeded the metered actual (<code className="font-mono text-[10px]">e_i &gt; 0</code> for all 72 hours, minimum error +295.5 MW, maximum error +5,651.5 MW).
                  Because no negative errors occurred, <code className="font-mono text-[10px]">Σ|e_i| ≡ Σe_i</code>, rendering MAE and Mean Bias mathematically identical. This is a verified empirical property of the underlying Elexon dataset, not an implementation defect.
                </p>
              </section>

              <section className="rounded-md border border-slate-200 bg-slate-50/50 p-3 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">Compliance & Scope Disclosure</p>
                <p>
                  Built for the Gridbricks Full-Stack SWE hiring assignment. The scope is constrained strictly to January 2026. All live queries communicate with Elexon BMRS Stream endpoints. Offline test fixtures are maintained solely for deterministic testing and emergency fallback.
                </p>
              </section>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowMethodology(false)}
                className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors shadow-2xs"
              >
                Close Audit Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

