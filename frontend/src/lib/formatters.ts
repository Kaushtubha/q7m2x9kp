/** Format a UTC ISO datetime string to a readable local delivery time label. */
export function formatDeliveryHour(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString('en-GB', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatHourOnly(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateOnly(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
}

export function formatMW(mw: number | null): string {
  if (mw === null) return '—';
  return `${mw.toLocaleString('en-GB', { maximumFractionDigits: 0 })} MW`;
}

export function formatMWWithSign(mw: number | null): string {
  if (mw === null) return '—';
  const sign = mw > 0 ? '+' : '';
  return `${sign}${mw.toLocaleString('en-GB', { maximumFractionDigits: 0 })} MW`;
}

export function formatPublishTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-GB', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' UTC';
}

export function exportToCSV(data: { delivery_hour: string; forecast_mw: number | null; actual_mw: number | null; error_mw: number | null; publish_time: string | null; lead_time_hours: number | null; actual_partial: boolean }[], filename: string) {
  const headers = ['delivery_hour_utc', 'forecast_mw', 'actual_mw', 'error_mw', 'publish_time_utc', 'lead_time_hours', 'actual_partial'];
  const rows = data.map((d) => [
    `"${d.delivery_hour}"`,
    d.forecast_mw ?? '',
    d.actual_mw ?? '',
    d.error_mw ?? '',
    d.publish_time ? `"${d.publish_time}"` : '',
    d.lead_time_hours ?? '',
    d.actual_partial ? 'true' : 'false',
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

