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
  error_mw: number | null;
  actual_partial: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ChartPoint = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-[#2a3148] bg-[#0f1117] p-3 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-[#e8eaf0]">{d.fullHour} UTC</p>
      {d.forecast_mw != null && (
        <p className="text-blue-400">Forecast: {d.forecast_mw.toLocaleString()} MW</p>
      )}
      {d.actual_mw != null && (
        <p className="text-emerald-400">
          Actual: {d.actual_mw.toLocaleString()} MW
          {d.actual_partial && <span className="ml-1 text-orange-400">(partial)</span>}
        </p>
      )}
      {d.error_mw != null && (
        <p className={d.error_mw > 0 ? 'text-orange-400' : 'text-cyan-400'}>
          Error: {d.error_mw > 0 ? '+' : ''}{d.error_mw.toLocaleString()} MW
        </p>
      )}
      {d.publish_time && (
        <p className="mt-1 text-[#7a839a]">Published: {formatPublishTime(d.publish_time)}</p>
      )}
    </div>
  );
}

export function ForecastChart({ data, loading }: ForecastChartProps) {
  if (loading) {
    return <div className="h-80 animate-pulse rounded-lg bg-[#1a1f2e]" />;
  }
  if (!data.length) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-[#2a3148] bg-[#1a1f2e] text-[#7a839a]">
        No data available for the selected range.
      </div>
    );
  }

  const chartData: ChartPoint[] = data
    .filter((d) => d.forecast_mw != null || d.actual_mw != null)
    .map((d) => ({
      hour: formatHourOnly(d.delivery_hour),
      fullHour: d.delivery_hour,
      forecast_mw: d.forecast_mw,
      actual_mw: d.actual_mw,
      error_mw: d.error_mw,
      publish_time: d.publish_time,
      actual_partial: d.actual_partial,
    }));

  return (
    <div className="rounded-lg border border-[#2a3148] bg-[#1a1f2e] p-4">
      <h3 className="mb-1 text-sm font-semibold text-[#e8eaf0]">Forecast vs Actual Wind Generation</h3>
      <p className="mb-4 text-xs text-[#7a839a]">Day-ahead forecast (selected run before cutoff) vs metered actual (MW, hourly average)</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3148" />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#7a839a', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2a3148' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#7a839a', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            unit=" MW"
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) =>
              value === 'forecast_mw' ? 'Forecast (Day-Ahead)' : 'Actual'
            }
            wrapperStyle={{ fontSize: 12, color: '#7a839a' }}
          />
          <Line
            type="monotone"
            dataKey="forecast_mw"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="forecast_mw"
          />
          <Line
            type="monotone"
            dataKey="actual_mw"
            stroke="#34d399"
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
