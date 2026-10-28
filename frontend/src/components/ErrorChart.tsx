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
    <div className="rounded border border-slate-200 bg-white p-3 text-xs shadow-md space-y-1">
      <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">
        {d.fullHour.replace('T', ' ').slice(0, 16)} UTC
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-600">Deviation:</span>
        <span className={`font-mono tabular-nums font-semibold ${error > 0 ? 'text-amber-800' : 'text-sky-800'}`}>
          {error > 0 ? '+' : ''}{error.toLocaleString()} MW
        </span>
      </div>
      <p className="text-[11px] text-slate-500 pt-0.5">
        {error > 0
          ? 'Overforecast (Actual wind lower than procurement bid)'
          : 'Underforecast (Actual wind higher than procurement bid)'}
      </p>
    </div>
  );
}

export function ErrorChart({ data, loading }: ErrorChartProps) {
  if (loading) {
    return <div className="h-56 animate-pulse rounded-lg bg-slate-100 border border-slate-200" />;
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
      <div className="flex h-56 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500">
        No paired forecast/actual intervals available for error analysis.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Hourly Forecast Deviation</h3>
          <p className="text-xs text-slate-500">
            Error = Day-Ahead Forecast − Metered Actual (MW).
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-600 inline-block" />
            <span>Overforecast (+)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-sky-600 inline-block" />
            <span>Underforecast (−)</span>
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
