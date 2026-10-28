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
    if (col !== sortKey) return <span className="ml-1 text-slate-300 font-mono text-[10px]">↕</span>;
    return <span className="ml-1 text-slate-800 font-mono text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  function Th({ col, label, align = 'left' }: { col: SortKey; label: string; align?: 'left' | 'right' }) {
    return (
      <th
        className={`cursor-pointer select-none whitespace-nowrap px-3.5 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900 transition-colors ${
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
    return <div className="h-72 animate-pulse rounded-lg bg-slate-100 border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.03)]" />;
  }

  return (
    <div className="rounded-lg border border-slate-200/90 bg-white overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/90 px-4 py-3 bg-slate-50/60 gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Delivery Interval Reconciliation Table</h3>
            <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              {filtered.length} intervals
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hourly alignment, settlement outturn, and deviation per delivery settlement period
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setErrorFilter('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              errorFilter === 'all'
                ? 'bg-slate-900 text-white font-medium shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60 bg-white border border-slate-200'
            }`}
          >
            All <span className="font-mono tabular-nums text-[11px] ml-0.5">({counts.all})</span>
          </button>
          <button
            onClick={() => setErrorFilter('over')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              errorFilter === 'over'
                ? 'bg-amber-800 text-white font-medium shadow-2xs'
                : 'text-amber-800 hover:bg-amber-50 bg-white border border-amber-200'
            }`}
          >
            Overforecast <span className="font-mono tabular-nums text-[11px] ml-0.5">({counts.over})</span>
          </button>
          <button
            onClick={() => setErrorFilter('under')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              errorFilter === 'under'
                ? 'bg-sky-800 text-white font-medium shadow-2xs'
                : 'text-sky-800 hover:bg-sky-50 bg-white border border-sky-200'
            }`}
          >
            Underforecast <span className="font-mono tabular-nums text-[11px] ml-0.5">({counts.under})</span>
          </button>
          {counts.partial > 0 && (
            <button
              onClick={() => setErrorFilter('partial')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                errorFilter === 'partial'
                  ? 'bg-orange-800 text-white font-medium shadow-2xs'
                  : 'text-orange-800 hover:bg-orange-50 bg-white border border-orange-200'
              }`}
            >
              Partial <span className="font-mono tabular-nums text-[11px] ml-0.5">({counts.partial})</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              <Th col="delivery_hour" label="Delivery Hour (UTC)" />
              <Th col="forecast_mw" label="Forecast (MW)" align="right" />
              <Th col="actual_mw" label="Actual (MW)" align="right" />
              <Th col="error_mw" label="Deviation (MW)" align="right" />
              <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
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
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                }`}
              >
                <td className="px-3.5 py-2 text-slate-900 font-mono text-[11.5px] whitespace-nowrap">
                  {formatDeliveryHour(row.delivery_hour)}
                  {row.actual_partial && (
                    <span
                      title="Only 1 half-hourly settlement period recorded for this clock hour (imputed average)"
                      className="ml-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-1 py-0.2 rounded font-sans font-normal"
                    >
                      1 SP
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-2 text-right font-mono tabular-nums text-slate-800 text-[12px]">
                  {formatMW(row.forecast_mw).replace(' MW', '')}
                </td>
                <td className="px-3.5 py-2 text-right font-mono tabular-nums text-slate-800 text-[12px]">
                  {formatMW(row.actual_mw).replace(' MW', '')}
                </td>
                <td className="px-3.5 py-2 text-right font-mono tabular-nums text-[12px] whitespace-nowrap">
                  {row.error_mw === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        row.error_mw > 0
                          ? 'text-amber-900 bg-amber-50/80 border border-amber-200/60'
                          : 'text-sky-900 bg-sky-50/80 border border-sky-200/60'
                      }`}
                    >
                      {formatMWWithSign(row.error_mw).replace(' MW', '')}
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                  {formatPublishTime(row.publish_time).replace(' UTC', '')}
                </td>
                <td className="px-3.5 py-2 text-right font-mono tabular-nums text-slate-500 text-[11.5px] whitespace-nowrap">
                  {row.lead_time_hours !== null ? `${row.lead_time_hours}h` : '—'}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3.5 py-8 text-center text-xs text-slate-500">
                  No intervals match the current filter in this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 bg-slate-50/80">
        <span className="font-mono text-[11px]">Showing {sorted.length} of {data.length} delivery intervals</span>
        <span className="text-[11px] text-slate-400">Values in megawatts (MW) • Error = Forecast − Actual (Positive = Overforecast)</span>
      </div>
    </div>
  );
}

