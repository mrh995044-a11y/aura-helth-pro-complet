import type { Band, Metric, Med, Vital, Appointment, Profile, Settings } from './types';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function hashPass(email: string, pass: string) {
  let h = 2166136261;
  const s = `aura.v1|${email.trim().toLowerCase()}|${pass}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv:${(h >>> 0).toString(16)}`;
}

export function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function validPassword(v: string) {
  return v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
}

export function luhn(num: string) {
  const s = num.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(s)) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const DAY = 86400000;

function atDaysAgo(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export function seedVitals(): Vital[] {
  const sys = [128, 132, 126, 134, 129, 125, 127];
  const dia = [84, 86, 82, 88, 85, 81, 83];
  const hr = [74, 78, 72, 80, 76, 71, 73];
  const glu = [102, 110, 98, 115, 104, 99, 101];
  const sleep = [6.4, 7.2, 6.9, 5.8, 7.5, 7.1, 6.6];
  const steps = [6420, 8120, 5340, 9100, 7260, 4980, 7840];
  const water = [1600, 2100, 1400, 2400, 1900, 1200, 2000];
  const rows: Vital[] = [];
  for (let u = 6; u >= 0; u--) {
    const h = 6 - u;
    rows.push(
      { id: `sv-bp-${u}`, metric: 'bp', value: sys[h], value2: dia[h], at: atDaysAgo(u, 7, 20), context: 'Morning, seated', sample: true },
      { id: `sv-hr-${u}`, metric: 'hr', value: hr[h], at: atDaysAgo(u, 7, 22), context: 'Resting', sample: true },
      { id: `sv-gl-${u}`, metric: 'glucose', value: glu[h], at: atDaysAgo(u, 6, 50), context: 'Fasting', sample: true },
      { id: `sv-sl-${u}`, metric: 'sleep', value: sleep[h], at: atDaysAgo(u, 6, 30), sample: true },
      { id: `sv-st-${u}`, metric: 'steps', value: steps[h], at: atDaysAgo(u, 21, 0), sample: true },
      { id: `sv-wa-${u}`, metric: 'water', value: water[h], at: atDaysAgo(u, 20, 30), sample: true },
    );
  }
  rows.push({ id: 'sv-wt', metric: 'weight', value: 72.4, at: atDaysAgo(0, 7, 5), sample: true });
  rows.push({ id: 'sv-ox', metric: 'spo2', value: 97, at: atDaysAgo(0, 7, 6), sample: true });
  return rows.sort((a, b) => b.at - a.at);
}

export function seedMeds(): Med[] {
  const now = Date.now();
  return [
    {
      id: 'med-1', name: 'Losartan', strength: '50 mg', form: 'Tablet', times: ['08:00'], withFood: false,
      stock: 24, perDose: 1, colorIdx: 0, startedAt: now - 30 * DAY, sample: true,
      notes: 'Sample record — blood pressure. Replace with your own prescription.',
    },
    {
      id: 'med-2', name: 'Metformin', strength: '500 mg', form: 'Tablet', times: ['08:00', '20:00'], withFood: true,
      stock: 46, perDose: 1, colorIdx: 1, startedAt: now - 60 * DAY, sample: true,
      notes: 'Sample record — take with meals. Not a verified prescription.',
    },
    {
      id: 'med-3', name: 'Vitamin D3', strength: '1000 IU', form: 'Capsule', times: ['13:00'], withFood: true,
      stock: 8, perDose: 1, colorIdx: 2, startedAt: now - 15 * DAY, sample: true,
      notes: 'Sample record — supplement.',
    },
  ];
}

export function seedAppointments(): Appointment[] {
  const now = Date.now();
  return [
    {
      id: 'apt-1', type: 'physical', centerId: 'asiri-central', centerName: 'Asiri Central Hospital',
      doctor: 'Consultant Cardiologist (sample)', specialty: 'Cardiology',
      at: now + 3 * DAY + 2 * 3600000, refNo: 'SAMPLE-0142', fee: 4500, status: 'upcoming', reminder: true, sample: true,
      notes: 'Sample appointment. Fees are reference only — confirm with the hospital.',
    },
    {
      id: 'apt-2', type: 'lab', centerId: 'asiri-labs', centerName: 'Asiri Laboratories',
      specialty: 'Clinical Chemistry', at: now + 6 * DAY + 1 * 3600000, fee: 5200, status: 'upcoming', reminder: true, sample: true,
      notes: 'Fasting lipid profile + HbA1c (sample record).',
    },
    {
      id: 'apt-3', type: 'tele', centerId: 'doc990', centerName: 'Doc990 Tele-channelling',
      doctor: 'General Physician (sample)', specialty: 'General Medicine',
      at: now - 9 * DAY, fee: 2500, status: 'completed', reminder: false, sample: true,
      notes: 'Follow-up on BP control (sample record).',
    },
  ];
}

export function seedProfile(name = 'Nimali'): Profile {
  return {
    name,
    dob: '1986-04-12',
    sex: 'Female',
    bloodGroup: 'O+',
    heightCm: '163',
    weightKg: '72.4',
    conditions: 'Hypertension (sample), Pre-diabetes (sample)',
    allergies: 'Penicillin (sample)',
    emergencyName: 'Family contact',
    emergencyPhone: '',
    homeDistrict: 'Colombo',
  };
}

export function defaultSettings(): Settings {
  return {
    lang: 'en',
    lockEnabled: false,
    biometric: false,
    aiMode: 'proxy',
    proxyUrl: process.env.EXPO_PUBLIC_AURA_AI_URL || '',
    model: 'gemini-2.5-flash',
    aiConsent: false,
    bedtimeReminder: '',
    shareVitals: true,
    shareMeds: true,
    shareProfile: false,
    plan: 'free',
    planUntil: null,
    receipts: [],
  };
}

export const PLANS = {
  monthly: { lkr: 390, days: 30, label: 'Pro Monthly' },
  yearly: { lkr: 3490, days: 365, label: 'Pro Yearly' },
} as const;

export function isPro(s: Settings) {
  if (s.plan === 'free') return false;
  if (s.planUntil && s.planUntil < Date.now()) return false;
  return true;
}

export function classify(metric: Metric, value: number, value2?: number): Band {
  switch (metric) {
    case 'bp': {
      const dia = value2 ?? 80;
      if (value >= 180 || dia >= 120) return 'urgent';
      if (value < 90 || dia < 60) return 'low';
      if (value >= 140 || dia >= 90) return 'high';
      if (value >= 120 || dia >= 80) return 'watch';
      return 'ok';
    }
    case 'hr':
      if (value < 45 || value > 130) return 'urgent';
      if (value < 55) return 'low';
      if (value > 100) return 'high';
      return 'ok';
    case 'glucose':
      if (value < 55 || value >= 250) return 'urgent';
      if (value < 70) return 'low';
      if (value >= 126) return 'high';
      if (value >= 100) return 'watch';
      return 'ok';
    case 'sleep':
      if (value < 5) return 'low';
      if (value > 9.5) return 'watch';
      if (value < 6.5) return 'watch';
      return 'ok';
    case 'steps':
      if (value < 3000) return 'low';
      if (value < 7000) return 'watch';
      return 'ok';
    case 'water':
      if (value < 1200) return 'low';
      if (value < 2000) return 'watch';
      return 'ok';
    case 'spo2':
      if (value < 92) return 'urgent';
      if (value < 95) return 'watch';
      return 'ok';
    default:
      return 'none';
  }
}

export function bandColor(b: Band) {
  if (b === 'ok') return '#34D399';
  if (b === 'watch') return '#FBBF24';
  if (b === 'low' || b === 'high') return '#FB7185';
  if (b === 'urgent') return '#F43F5E';
  return '#A89BC4';
}

export const METRICS: Metric[] = ['bp', 'hr', 'glucose', 'sleep', 'steps', 'water', 'weight', 'spo2'];

export function metricUnit(m: Metric) {
  switch (m) {
    case 'bp': return 'mmHg';
    case 'hr': return 'bpm';
    case 'glucose': return 'mg/dL';
    case 'sleep': return 'h';
    case 'steps': return 'steps';
    case 'water': return 'ml';
    case 'weight': return 'kg';
    case 'spo2': return '%';
  }
}

export function formatValue(v: Vital) {
  if (v.metric === 'bp') return `${Math.round(v.value)}/${Math.round(v.value2 ?? 0)}`;
  if (v.metric === 'sleep' || v.metric === 'weight') return String(Math.round(v.value * 10) / 10);
  return String(Math.round(v.value));
}

export function sameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function startOfDay(t = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatWhen(t: number, withTime = true) {
  const d = new Date(t);
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (!withTime) return day;
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function greetingKey(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'good_morning' as const;
  if (h < 17) return 'good_afternoon' as const;
  return 'good_evening' as const;
}

export function latestOf(vitals: Vital[], metric: Metric) {
  return vitals.find((v) => v.metric === metric);
}

export function weekSeries(vitals: Vital[], metric: Metric) {
  const out: { day: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const t = startOfDay(Date.now() - i * DAY);
    const hit = vitals.find((v) => v.metric === metric && sameDay(v.at, t));
    const d = new Date(t);
    out.push({ day: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), value: hit ? hit.value : 0 });
  }
  return out;
}

export function todayWater(vitals: Vital[]) {
  return vitals.filter((v) => v.metric === 'water' && sameDay(v.at, Date.now())).reduce((s, v) => s + v.value, 0);
}

export function todaySteps(vitals: Vital[]) {
  const rows = vitals.filter((v) => v.metric === 'steps' && sameDay(v.at, Date.now()));
  return rows.length ? rows[0].value : 0;
}

export function parseDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const t = new Date(`${date}T${time}:00`);
  if (Number.isNaN(t.getTime())) return null;
  return t.getTime();
}

export function toDateInput(t: number) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toTimeInput(t: number) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
