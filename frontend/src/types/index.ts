// Shared TypeScript interfaces matching backend Pydantic schemas exactly.

export interface ForecastActualPair {
  delivery_hour: string;           // UTC ISO-8601 datetime string
  forecast_mw: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  publish_time: string | null;     // UTC ISO-8601 datetime string
  lead_time_hours: number | null;
  actual_partial: boolean;
}

export interface AccuracyMetrics {
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  matched_pairs: number;
  expected_intervals: number;
  coverage_pct: number;
}

export interface DataQualityReport {
  source: 'live_elexon' | 'fixture' | 'fixture_fallback' | 'mixed_live_and_fixture';
  last_fetched_utc: string | null;
  date_from: string;
  date_to: string;
  cutoff_hour_utc: number;
  total_delivery_hours: number;
  forecast_available: number;
  actual_available: number;
  matched_pairs: number;
  partial_actual_count: number;
  missing_forecast_count: number;
  missing_actual_count: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  default_cutoff_hour_utc: number;
  note: string;
}

// The cutoff options exposed in the UI correspond to verified WINDFOR run times
export const CUTOFF_OPTIONS = [
  { value: 9,  label: '09:30 UTC D-1', description: 'Before morning run' },
  { value: 11, label: '11:00 UTC D-1', description: 'Default — before late-morning run' },
  { value: 15, label: '15:30 UTC D-1', description: 'Before afternoon run' },
] as const;
