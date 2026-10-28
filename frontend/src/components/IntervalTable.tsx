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
  const [errorFilter, setErrorFilter] = useState<'all' | 'over' | 'under' | 'partial'>('all');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'delivery_hour' ? 'asc' : 'desc');
    }
  }

  const counts = useMemo(() => {
    let over = 0;
    let under = 0;
    let partial = 0;
    for (const d of data) {
      if ((d.error_mw ?? 0) > 0) over++;
      if ((d.error_mw ?? 0) < 0) under++;
      if (d.actual_partial) partial++;
    }
    return { all: data.length, over, under, partial };
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (errorFilter === 'over') rows = rows.filter((d) => (d.error_mw ?? 0) > 0);
    if (errorFilter === 'under') rows = rows.filter((d) => (d.error_mw ?? 0) < 0);
    if (errorFilter === 'partial') rows = rows.filter((d) => d.actual_partial);
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
    if (col !== sortKey) return <span className="ml-1 text-slate-300 font-normal">↕</span>;
    return <span className="ml-1 text-slate-700 font-semibold">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function Th({ col, label, align = 'left' }: { col: SortKey; label: string; align?: 'left' | 'right' }) {
    return (
      <th
        className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900 transition-colors ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center">
          {label}
          <SortIcon col={col} />
        </span>
      </th>
    );
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-slate-100 border border-slate-200" />;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/50 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Delivery Interval Audit Record</h3>
          <p className="text-xs text-slate-500">Hourly alignment and deviation per delivery settlement period</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setErrorFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              errorFilter === 'all'
                ? 'bg-slate-900 text-white font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setErrorFilter('over')}
            className={`px-2.5 py-1 rounded transition-colors ${
              errorFilter === 'over'
                ? 'bg-amber-100 text-amber-900 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Overforecast ({counts.over})
          </button>
          <button
            onClick={() => setErrorFilter('under')}
            className={`px-2.5 py-1 rounded transition-colors ${
              errorFilter === 'under'
                ? 'bg-sky-100 text-sky-900 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Underforecast ({counts.under})
          </button>
          {counts.partial > 0 && (
            <button
              onClick={() => setErrorFilter('partial')}
              className={`px-2.5 py-1 rounded transition-colors ${
                errorFilter === 'partial'
                  ? 'bg-orange-100 text-orange-900 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Partial Actuals ({counts.partial})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <Th col="delivery_hour" label="Delivery Hour (UTC)" />
              <Th col="forecast_mw" label="Forecast (MW)" align="right" />
              <Th col="actual_mw" label="Actual (MW)" align="right" />
              <Th col="error_mw" label="Deviation (MW)" align="right" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Publication Run (UTC)
              </th>
              <Th col="lead_time_hours" label="Lead Time" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row, i) => (
              <tr
                key={row.delivery_hour}
                className={`transition-colors hover:bg-slate-50/80 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <td className="px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                  {formatDeliveryHour(row.delivery_hour)}
                  {row.actual_partial && (
                    <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-normal">
                      1 SP
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                  {formatMW(row.forecast_mw).replace(' MW', '')}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                  {formatMW(row.actual_mw).replace(' MW', '')}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-medium whitespace-nowrap">
                  {row.error_mw === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className={row.error_mw > 0 ? 'text-amber-800' : 'text-sky-800'}>
                      {formatMWWithSign(row.error_mw).replace(' MW', '')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                  {formatPublishTime(row.publish_time).replace(' UTC', '')}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                  {row.lead_time_hours !== null ? `${row.lead_time_hours}h` : '—'}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-500">
                  No intervals match the current filter in this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 bg-slate-50">
        <span>Showing {sorted.length} of {data.length} intervals</span>
        <span className="text-[11px] text-slate-400">Values in megawatts (MW) • Error = Forecast − Actual</span>
      </div>
    </div>
  );
}
