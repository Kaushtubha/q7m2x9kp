import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ForecastActualPair } from '../types';
import { formatHourOnly, formatPublishTime } from '../lib/formatters';

interface ForecastChartProps {
  data: ForecastActualPair[];
  loading: boolean;
}

interface ChartPoint {
  hour: string;
  fullHour: string;
  forecast_mw: number | null;
  actual_mw: number | null;
  publish_time: string | null;
  lead_time_hours: number | null;
  error_mw: number | null;
  actual_partial: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ChartPoint = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="rounded border border-slate-200 bg-white p-3 text-xs shadow-md space-y-1">
      <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">
        {d.fullHour.replace('T', ' ').slice(0, 16)} UTC
      </p>
      {d.forecast_mw !== null && (
        <div className="flex items-center justify-between gap-4 text-blue-800">
          <span className="font-medium">Day-Ahead Forecast:</span>
          <span className="font-mono tabular-nums font-semibold">{d.forecast_mw.toLocaleString()} MW</span>
        </div>
      )}
      {d.actual_mw !== null && (
        <div className="flex items-center justify-between gap-4 text-emerald-800">
          <span className="font-medium">Metered Actual:</span>
          <span className="font-mono tabular-nums font-semibold">
            {d.actual_mw.toLocaleString()} MW
            {d.actual_partial && <span className="ml-1 text-[10px] text-amber-700 font-normal">(1 SP)</span>}
          </span>
        </div>
      )}
      {d.error_mw !== null && (
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 text-slate-700">
          <span>Error (Fcst − Act):</span>
          <span className={`font-mono tabular-nums font-semibold ${d.error_mw > 0 ? 'text-amber-700' : 'text-sky-700'}`}>
            {d.error_mw > 0 ? '+' : ''}{d.error_mw.toLocaleString()} MW
          </span>
        </div>
      )}
      {d.publish_time && (
        <p className="text-[11px] text-slate-500 pt-1">
          Run published: {formatPublishTime(d.publish_time)}
          {d.lead_time_hours !== null && ` (${d.lead_time_hours}h lead)`}
        </p>
      )}
    </div>
  );
}

export function ForecastChart({ data, loading }: ForecastChartProps) {
  if (loading) {
    return <div className="h-80 animate-pulse rounded-lg bg-slate-100 border border-slate-200" />;
  }
  if (!data.length) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500">
        No delivery intervals available for the selected parameters.
      </div>
    );
  }

  const chartData: ChartPoint[] = data
    .filter((d) => d.forecast_mw !== null || d.actual_mw !== null)
    .map((d) => ({
      hour: formatHourOnly(d.delivery_hour),
      fullHour: d.delivery_hour,
      forecast_mw: d.forecast_mw,
      actual_mw: d.actual_mw,
      error_mw: d.error_mw,
      publish_time: d.publish_time,
      lead_time_hours: d.lead_time_hours,
      actual_partial: d.actual_partial,
    }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Day-Ahead Forecast vs Metered Generation
          </h3>
          <p className="text-xs text-slate-500">
            WINDFOR publication before cutoff compared against FUELHH settlement actuals (MW)
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 10, bottom: 4 }}>
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
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            unit=" MW"
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', color: '#475569' }}
            formatter={(value) =>
              value === 'forecast_mw' ? 'Day-Ahead Forecast' : 'Metered Actual'
            }
          />
          <Line
            type="monotone"
            dataKey="forecast_mw"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="forecast_mw"
          />
          <Line
            type="monotone"
            dataKey="actual_mw"
            stroke="#047857"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="actual_mw"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
