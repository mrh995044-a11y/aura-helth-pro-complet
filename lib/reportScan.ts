import type { Metric } from './types';

export type ReportReading = { metric: Extract<Metric, 'bp' | 'hr' | 'glucose' | 'spo2' | 'weight'>; value: string; value2?: string };

// Treat model output as untrusted: accept only explicitly labelled units and
// plausible input ranges. This does not validate clinical accuracy.
export function parseReportReading(text: string): ReportReading | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let data: any;
  try { data = JSON.parse(cleaned); } catch { return null; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const rules: Record<string, { unit: string; min: number; max: number; whole?: boolean }> = {
    bp: { unit: 'mmhg', min: 20, max: 300, whole: true },
    hr: { unit: 'bpm', min: 20, max: 250, whole: true },
    glucose: { unit: 'mg/dl', min: 10, max: 1000 },
    spo2: { unit: '%', min: 1, max: 100 },
    weight: { unit: 'kg', min: 1, max: 500 },
  };
  const rule = typeof data.metric === 'string' ? rules[data.metric] : undefined;
  if (!rule || typeof data.unit !== 'string' || data.unit.trim().toLowerCase() !== rule.unit || typeof data.value !== 'number' || !Number.isFinite(data.value) || data.value < rule.min || data.value > rule.max || (rule.whole && !Number.isInteger(data.value))) return null;
  if (data.metric === 'bp') {
    if (typeof data.value2 !== 'number' || !Number.isInteger(data.value2) || data.value2 < 10 || data.value2 > 200 || data.value2 >= data.value) return null;
    return { metric: 'bp', value: String(data.value), value2: String(data.value2) };
  }
  return { metric: data.metric as ReportReading['metric'], value: String(data.value) };
}
