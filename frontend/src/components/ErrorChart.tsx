import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { ForecastActualPair } from '../types';
import { formatHourOnly } from '../lib/formatters';

interface ErrorChartProps {
  data: ForecastActualPair[];
  loading: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const error = d.error_mw as number;
  return (
    <div className="rounded-lg border border-[#2a3148] bg-[#0f1117] p-3 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-[#e8eaf0]">{d.fullHour} UTC</p>
      <p className={error > 0 ? 'text-orange-400' : 'text-cyan-400'}>
        Error: {error > 0 ? '+' : ''}{error.toLocaleString()} MW
      </p>
      <p className="text-[#7a839a] mt-1">{error > 0 ? 'Overforecast' : 'Underforecast'}</p>
    </div>
  );
}

export function ErrorChart({ data, loading }: ErrorChartProps) {
  if (loading) return <div className="h-56 animate-pulse rounded-lg bg-[#1a1f2e]" />;

  const chartData = data
    .filter((d) => d.error_mw != null)
    .map((d) => ({
      hour: formatHourOnly(d.delivery_hour),
      fullHour: d.delivery_hour,
      error_mw: d.error_mw as number,
    }));

  if (!chartData.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-[#2a3148] bg-[#1a1f2e] text-[#7a839a]">
        No error data for selected range.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#2a3148] bg-[#1a1f2e] p-4">
      <h3 className="mb-1 text-sm font-semibold text-[#e8eaf0]">Hourly Forecast Error</h3>
      <p className="mb-4 text-xs text-[#7a839a]">
        Error = forecast − actual (MW). <span className="text-orange-400">Orange = overforecast</span>,{' '}
        <span className="text-cyan-400">teal = underforecast</span>.
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3148" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#7a839a', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#2a3148' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#7a839a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#2a3148" strokeWidth={1} />
          <Bar dataKey="error_mw" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.error_mw > 0 ? '#fb923c' : '#22d3ee'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
