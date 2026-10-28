import type { AccuracyMetrics } from '../types';
import { formatMW, formatMWWithSign } from '../lib/formatters';

interface KpiStripProps {
  metrics: AccuracyMetrics | null;
  loading: boolean;
}

export function KpiStrip({ metrics, loading }: KpiStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-slate-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 space-y-2 animate-pulse">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-7 w-28 bg-slate-200 rounded" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const isAvailable = metrics !== null && metrics.matched_pairs > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* MAE Block */}
      <div className="p-4 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mean Absolute Error
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isAvailable ? formatMW(metrics.mae_mw).replace(' MW', '') : '—'}
            </span>
            {isAvailable && <span className="ml-1 text-xs font-medium text-slate-500">MW</span>}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 leading-tight">
          Average absolute error magnitude across all matched delivery intervals.
        </p>
      </div>

      {/* RMSE Block */}
      <div className="p-4 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Root Mean Sq Error
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isAvailable ? formatMW(metrics.rmse_mw).replace(' MW', '') : '—'}
            </span>
            {isAvailable && <span className="ml-1 text-xs font-medium text-slate-500">MW</span>}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 leading-tight">
          Penalises large deviations; key proxy for grid reserve stress.
        </p>
      </div>

      {/* Mean Bias Block */}
      <div className="p-4 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mean Bias
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isAvailable ? formatMWWithSign(metrics.bias_mw).replace(' MW', '') : '—'}
            </span>
            {isAvailable && <span className="ml-1 text-xs font-medium text-slate-500">MW</span>}
          </div>
        </div>
        {isAvailable && metrics.bias_mw !== null ? (
          <div className="mt-2">
            {metrics.bias_mw > 100 ? (
              <span className="inline-flex items-center text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                Overforecast (Net Long Risk)
              </span>
            ) : metrics.bias_mw < -100 ? (
              <span className="inline-flex items-center text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded">
                Underforecast (Net Short Risk)
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                Neutral Directional Bias
              </span>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No paired data in range.</p>
        )}
      </div>

      {/* Interval Coverage Block */}
      <div className="p-4 flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Interval Coverage
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isAvailable ? `${metrics.coverage_pct.toFixed(1)}%` : '—'}
            </span>
            {isAvailable && (
              <span className="ml-2 text-xs text-slate-500">
                ({metrics.matched_pairs} / {metrics.expected_intervals} hrs)
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 leading-tight">
          Delivery hours with both eligible forecast and actual generation.
        </p>
      </div>
    </div>
  );
}
