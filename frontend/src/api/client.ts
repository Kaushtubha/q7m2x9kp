/**
 * Typed API client for the WindLens backend.
 * Base URL is configured via VITE_API_URL env var (defaults to '' for Vite proxy).
 */

import type { AccuracyMetrics, DataQualityReport, ForecastActualPair } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    if (res.status === 404) {
      return null as unknown as T;
    }
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface ForecastParams {
  dateFrom: string;   // YYYY-MM-DD
  dateTo: string;     // YYYY-MM-DD
  cutoffHour: number; // 0–23 UTC, on D-1
}

function params(p: ForecastParams): string {
  return new URLSearchParams({
    date_from: p.dateFrom,
    date_to: p.dateTo,
    cutoff_hour: String(p.cutoffHour),
  }).toString();
}

export const api = {
  forecasts: (p: ForecastParams) =>
    get<ForecastActualPair[]>(`/api/forecasts?${params(p)}`),

  accuracy: (p: ForecastParams) =>
    get<AccuracyMetrics>(`/api/accuracy?${params(p)}`),

  dataQuality: (p: ForecastParams) =>
    get<DataQualityReport>(`/api/data-quality?${params(p)}`),
};
