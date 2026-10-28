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
    <div className="rounded-lg border border-slate-200/90 bg-white p-3.5 text-xs shadow-lg space-y-2 min-w-[240px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-semibold text-slate-900 font-mono text-[11px]">
          {d.fullHour.replace('T', ' ').slice(0, 16)} UTC
        </span>
        {d.actual_partial && (
          <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
            Partial (1 SP)
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        {d.forecast_mw !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-[#1d4ed8] inline-block" />
              <span>Day-Ahead Forecast:</span>
            </span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {d.forecast_mw.toLocaleString()} MW
            </span>
          </div>
        )}
        {d.actual_mw !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-[#047857] inline-block" />
              <span>Metered Actual:</span>
            </span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {d.actual_mw.toLocaleString()} MW
            </span>
          </div>
        )}
        {d.error_mw !== null && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
            <span className="text-slate-500">Forecast Deviation:</span>
            <span className={`font-mono tabular-nums font-semibold ${d.error_mw > 0 ? 'text-amber-800' : 'text-sky-800'}`}>
              {d.error_mw > 0 ? '+' : ''}{d.error_mw.toLocaleString()} MW
            </span>
          </div>
        )}
      </div>

      {d.publish_time && (
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
          <span>Run: {formatPublishTime(d.publish_time).replace(' UTC', '')}</span>
          {d.lead_time_hours !== null && <span>{d.lead_time_hours}h lead</span>}
        </div>
      )}
    </div>
  );
}

export function ForecastChart({ data, loading }: ForecastChartProps) {
  if (loading) {
    return <div className="h-84 animate-pulse rounded-lg bg-slate-100 border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.03)]" />;
  }
  if (!data.length) {
    return (
      <div className="flex h-84 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
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
    <div className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Day-Ahead Forecast vs Metered Generation
            </h3>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              Hourly Average [MW]
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Elexon WINDFOR publication run before cutoff compared against FUELHH settlement actuals
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
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', color: '#475569' }}
            formatter={(value) =>
              value === 'forecast_mw' ? 'Day-Ahead Forecast (WINDFOR)' : 'Metered Outturn (FUELHH)'
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

