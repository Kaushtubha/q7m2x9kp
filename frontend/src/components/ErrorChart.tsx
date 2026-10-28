import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { ForecastActualPair } from '../types';
import { formatHourOnly } from '../lib/formatters';

interface ErrorChartProps {
  data: ForecastActualPair[];
  loading: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const error = d.error_mw as number;

  return (
    <div className="rounded-lg border border-slate-200/90 bg-white p-3.5 text-xs shadow-lg space-y-1.5 min-w-[260px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-semibold text-slate-900 font-mono text-[11px]">
          {d.fullHour.replace('T', ' ').slice(0, 16)} UTC
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${
          error > 0 ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-sky-50 text-sky-900 border border-sky-200'
        }`}>
          {error > 0 ? 'OVERFORECAST' : 'UNDERFORECAST'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 py-0.5">
        <span className="text-slate-600 font-medium">Deviation (Fcst − Act):</span>
        <span className={`font-mono tabular-nums font-bold ${error > 0 ? 'text-amber-800' : 'text-sky-800'}`}>
          {error > 0 ? '+' : ''}{error.toLocaleString()} MW
        </span>
      </div>

      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 leading-snug">
        {error > 0
          ? 'Physical wind fell short of day-ahead expectation. Utility short position risk.'
          : 'Physical wind exceeded day-ahead expectation. Utility surplus position.'}
      </p>
    </div>
  );
}

export function ErrorChart({ data, loading }: ErrorChartProps) {
  if (loading) {
    return <div className="h-60 animate-pulse rounded-lg bg-slate-100 border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.03)]" />;
  }

  const chartData = data
    .filter((d) => d.error_mw !== null)
    .map((d) => ({
      hour: formatHourOnly(d.delivery_hour),
      fullHour: d.delivery_hour,
      error_mw: d.error_mw as number,
    }));

  if (!chartData.length) {
    return (
      <div className="flex h-60 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        No paired forecast/actual intervals available for error analysis.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Hourly Forecast Deviation</h3>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              Error = Fcst − Act [MW]
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Positive error denotes generation overforecast (short position); negative denotes underforecast
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#d97706] inline-block" />
            <span className="text-[11px] text-slate-700">Overforecast (+MW)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#0284c7] inline-block" />
            <span className="text-[11px] text-slate-700">Underforecast (−MW)</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={65}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" />
          <Bar dataKey="error_mw" radius={[1, 1, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.error_mw > 0 ? '#d97706' : '#0284c7'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

