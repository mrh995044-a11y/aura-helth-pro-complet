import { formatValue, formatWhen, metricUnit } from './health';
import type { TKey } from './i18n';
import type { Metric, Vault } from './types';

interface BriefOptions {
  includeVitals: boolean;
  includeMeds: boolean;
  notes: string;
  generatedAt: number;
}

// Only actual user-entered records are included. The app's demo records are never exported.
export function createVisitBrief(vault: Vault, t: (key: TKey) => string, options: BriefOptions): string {
  const lines = [t('brief_title'), `${t('brief_created')}: ${formatWhen(options.generatedAt)}`, t('brief_disclaimer')];
  if (options.includeVitals) {
    lines.push('', t('brief_vitals'));
    const recent = vault.vitals.filter(v => !v.sample && Number.isFinite(v.at) && v.at <= options.generatedAt).slice().sort((a, b) => b.at - a.at);
    const seen = new Set<Metric>();
    for (const reading of recent) {
      if (seen.has(reading.metric)) continue;
      seen.add(reading.metric);
      lines.push(`- ${t(reading.metric)}: ${formatValue(reading)} ${metricUnit(reading.metric)} · ${formatWhen(reading.at)}${reading.context ? ` · ${reading.context}` : ''}`);
    }
    if (!seen.size) lines.push(t('brief_no_vitals'));
  }
  if (options.includeMeds) {
    lines.push('', t('brief_medicines'));
    const meds = vault.meds.filter(m => !m.sample);
    if (!meds.length) lines.push(t('brief_no_medicines'));
    for (const med of meds) {
      const schedule = med.times.length ? med.times.join(', ') : t('brief_no_times');
      lines.push(`- ${med.name}${med.strength ? ` · ${med.strength}` : ''}${med.form ? ` · ${med.form}` : ''} · ${schedule}`);
    }
  }
  if (options.notes.trim()) lines.push('', t('brief_questions'), options.notes.trim());
  return lines.join('\n');
}
