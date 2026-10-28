import { useState, useMemo } from 'react';
import type { ForecastActualPair } from '../types';
import { formatDeliveryHour, formatMW, formatMWWithSign, formatPublishTime } from '../lib/formatters';

interface IntervalTableProps {
  data: ForecastActualPair[];
  loading: boolean;
}

type SortKey = 'delivery_hour' | 'forecast_mw' | 'actual_mw' | 'error_mw' | 'lead_time_hours';
type SortDir = 'asc' | 'desc';

export function IntervalTable({ data, loading }: IntervalTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('delivery_hour');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [errorFilter, setErrorFilter] = useState<'all' | 'over' | 'under'>('all');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    let rows = data.filter((d) => d.forecast_mw != null || d.actual_mw != null);
    if (errorFilter === 'over') rows = rows.filter((d) => (d.error_mw ?? 0) > 0);
    if (errorFilter === 'under') rows = rows.filter((d) => (d.error_mw ?? 0) < 0);
    return rows;
  }, [data, errorFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      if (sortKey === 'delivery_hour') {
        return sortDir === 'asc'
          ? a.delivery_hour.localeCompare(b.delivery_hour)
          : b.delivery_hour.localeCompare(a.delivery_hour);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function Th({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[#7a839a] hover:text-[#e8eaf0]"
        onClick={() => handleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </th>
    );
  }

  if (loading) return <div className="h-64 animate-pulse rounded-lg bg-[#1a1f2e]" />;

  return (
    <div className="rounded-lg border border-[#2a3148] bg-[#1a1f2e]">
      <div className="flex items-center justify-between border-b border-[#2a3148] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#e8eaf0]">Delivery Interval Detail</h3>
        <div className="flex gap-2">
          {(['all', 'over', 'under'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setErrorFilter(f)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                errorFilter === f
                  ? 'bg-[#2a3148] text-[#e8eaf0]'
                  : 'text-[#7a839a] hover:text-[#e8eaf0]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'over' ? 'Overforecast' : 'Underforecast'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a3148]">
              <Th col="delivery_hour" label="Delivery Hour" />
              <Th col="forecast_mw" label="Forecast" />
              <Th col="actual_mw" label="Actual" />
              <Th col="error_mw" label="Error" />
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[#7a839a]">Published</th>
              <Th col="lead_time_hours" label="Lead Time" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.delivery_hour}
                className={`border-b border-[#2a3148] last:border-0 transition-colors hover:bg-[#0f1117] ${
                  i % 2 === 0 ? '' : 'bg-[#161b28]'
                }`}
              >
                <td className="px-3 py-2 text-xs text-[#e8eaf0]">
                  {formatDeliveryHour(row.delivery_hour)}
                  {row.actual_partial && (
                    <span className="ml-1 rounded bg-orange-900/40 px-1 py-0.5 text-[10px] text-orange-400">partial</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-blue-300">{formatMW(row.forecast_mw)}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-emerald-300">{formatMW(row.actual_mw)}</td>
                <td className={`px-3 py-2 text-xs tabular-nums font-medium ${
                  row.error_mw == null ? 'text-[#7a839a]' :
                  row.error_mw > 0 ? 'text-orange-400' : 'text-cyan-400'
                }`}>
                  {formatMWWithSign(row.error_mw)}
                </td>
                <td className="px-3 py-2 text-xs text-[#7a839a]">{formatPublishTime(row.publish_time)}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-[#7a839a]">
                  {row.lead_time_hours != null ? `${row.lead_time_hours}h` : '—'}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-[#7a839a]">
                  No intervals match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[#2a3148] px-4 py-2 text-xs text-[#7a839a]">
        {sorted.length} intervals shown
      </div>
    </div>
  );
}
