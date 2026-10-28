import type { AccuracyMetrics } from '../types';
import { formatMW, formatMWWithSign } from '../lib/formatters';

interface MetricCardProps {
  label: string;
  value: string;
  tooltip: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}

function MetricCard({ label, value, tooltip, highlight = 'neutral' }: MetricCardProps) {
  const valueColor =
    highlight === 'positive'
      ? 'text-emerald-400'
      : highlight === 'negative'
      ? 'text-orange-400'
      : 'text-blue-300';

  return (
    <div
      className="rounded-lg border border-[#2a3148] bg-[#1a1f2e] p-4"
      title={tooltip}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-[#7a839a]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-[#7a839a] leading-tight">{tooltip}</p>
    </div>
  );
}

interface KpiStripProps {
  metrics: AccuracyMetrics | null;
  loading: boolean;
}

export function KpiStrip({ metrics, loading }: KpiStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-[#1a1f2e]" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-[#2a3148] bg-[#1a1f2e]" />
        ))}
      </div>
    );
  }

  const biasHighlight: 'positive' | 'negative' | 'neutral' =
    metrics.bias_mw > 200 ? 'negative' : metrics.bias_mw < -200 ? 'positive' : 'neutral';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard
        label="MAE"
        value={formatMW(metrics.mae_mw)}
        tooltip="Mean Absolute Error — average magnitude of forecast error (MW). Lower is better."
      />
      <MetricCard
        label="RMSE"
        value={formatMW(metrics.rmse_mw)}
        tooltip="Root Mean Squared Error — penalises large errors more than MAE (MW)."
      />
      <MetricCard
        label="Mean Bias"
        value={formatMWWithSign(metrics.bias_mw)}
        tooltip="Average forecast − actual (MW). Positive = systematic overforecast."
        highlight={biasHighlight}
      />
      <MetricCard
        label="Coverage"
        value={`${metrics.coverage_pct.toFixed(1)}%`}
        tooltip={`${metrics.matched_pairs} of ${metrics.expected_intervals} intervals have both forecast and actual.`}
        highlight={metrics.coverage_pct >= 90 ? 'positive' : metrics.coverage_pct < 70 ? 'negative' : 'neutral'}
      />
    </div>
  );
}
