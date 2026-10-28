import type { AccuracyMetrics } from '../types';
import { formatMW, formatMWWithSign } from '../lib/formatters';

interface KpiStripProps {
  metrics: AccuracyMetrics | null;
  loading: boolean;
}

export function KpiStrip({ metrics, loading }: KpiStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-slate-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 space-y-2.5 animate-pulse">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-28 bg-slate-200 rounded" />
            <div className="h-3 w-40 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const isAvailable = metrics !== null && metrics.matched_pairs > 0;

  return (
    <div className="rounded-lg border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)] divide-y sm:divide-y-0 sm:divide-x divide-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* MAE Block */}
      <div className="p-4 flex flex-col justify-between hover:bg-slate-50/40 transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Mean Absolute Error
            </span>
            <span className="text-[10px] font-mono text-slate-400">MAE</span>
          </div>
          <div className="mt-1.5 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {isAvailable ? formatMW(metrics.mae_mw).replace(' MW', '') : '—'}
            </span>
            {isAvailable && <span className="ml-1.5 text-xs font-medium text-slate-500">MW</span>}
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-slate-500 leading-snug">
          Average error magnitude <span className="font-mono text-slate-400">Σ|e|/N</span> across all matched delivery hours.
        </p>
      </div>

      {/* RMSE Block */}
      <div className="p-4 flex flex-col justify-between hover:bg-slate-50/40 transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Root Mean Sq Error
            </span>
            <span className="text-[10px] font-mono text-slate-400">RMSE</span>
          </div>
          <div className="mt-1.5 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {isAvailable ? formatMW(metrics.rmse_mw).replace(' MW', '') : '—'}
            </span>
            {isAvailable && <span className="ml-1.5 text-xs font-medium text-slate-500">MW</span>}
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-slate-500 leading-snug">
          Quadratic penalty <span className="font-mono text-slate-400">√(Σe²/N)</span>; key proxy for peak grid imbalance risk.
        </p>
      </div>

      {/* Mean Bias Block */}
      <div className="p-4 flex flex-col justify-between hover:bg-slate-50/40 transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Mean Directional Bias
            </span>
            <span className="text-[10px] font-mono text-slate-400">BIAS</span>
          </div>
          <div className="mt-1.5 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {isAvailable ? formatMWWithSign(metrics.bias_mw).replace(' MW', '') : '—'}
            </span>
            {isAvailable && <span className="ml-1.5 text-xs font-medium text-slate-500">MW</span>}
          </div>
        </div>
        {isAvailable && metrics.bias_mw !== null ? (
          <div className="mt-2.5">
            {metrics.bias_mw > 100 ? (
              <span className="inline-flex items-center text-[10px] font-medium text-amber-900 bg-amber-50/80 border border-amber-200/90 px-1.5 py-0.5 rounded">
                Overforecast • Net Long Risk (Fcst &gt; Actual)
              </span>
            ) : metrics.bias_mw < -100 ? (
              <span className="inline-flex items-center text-[10px] font-medium text-sky-900 bg-sky-50/80 border border-sky-200/90 px-1.5 py-0.5 rounded">
                Underforecast • Net Short Risk (Fcst &lt; Actual)
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                Directionally Neutral (|Bias| ≤ 100 MW)
              </span>
            )}
          </div>
        ) : (
          <p className="mt-2.5 text-[11px] text-slate-400">No paired records in window.</p>
        )}
      </div>

      {/* Interval Coverage Block */}
      <div className="p-4 flex flex-col justify-between hover:bg-slate-50/40 transition-colors">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Interval Coverage
            </span>
            <span className="text-[10px] font-mono text-slate-400">COVERAGE</span>
          </div>
          <div className="mt-1.5 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {isAvailable ? `${metrics.coverage_pct.toFixed(1)}%` : '—'}
            </span>
            {isAvailable && (
              <span className="ml-2 text-xs font-mono text-slate-500 tabular-nums">
                ({metrics.matched_pairs}/{metrics.expected_intervals} hrs)
              </span>
            )}
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-slate-500 leading-snug">
          Delivery intervals with both eligible forecast and verified actuals.
        </p>
      </div>
    </div>
  );
}

