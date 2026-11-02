import { getAuth, getIdToken } from '@react-native-firebase/auth';
import type { Med, PhotoKind, Profile, Settings, Vital } from './types';
import { classify, formatValue, formatWhen, metricUnit } from './health';

export interface AiResult {
  text: string;
  source: 'gemini' | 'local';
  model?: string;
  error?: string;
}

const SYSTEM = `You are AuraCoach inside AuraHealth Pro, a wellness journal for people in Sri Lanka.
You are not a doctor, not a diagnostic service, and not an emergency line.
Rules:
- Open with a one-line reminder that this is general wellness information, not a medical diagnosis.
- Never invent readings, medicines, or appointments that were not provided.
- Never tell the user to start, stop, or change a medicine dose.
- If a value looks far outside common wellness ranges, say so calmly and suggest contacting a clinician. Mention 1990 (Suwa Seriya) or 119 only if the user describes an emergency or a reading is extreme (for example systolic >= 180, SpO2 < 92, glucose < 55 or >= 250).
- Prefer short sections: What stands out, Gentle notes, What to ask a clinician.
- Reply in the language requested (English, Sinhala, or Tamil). If you cannot write that language well, use English and say so.
- Sample records are not the user's real chart. Say that if they are marked sample.
- Do not claim you can see a photo unless an image was attached.`;

function langName(code: string) {
  if (code === 'si') return 'Sinhala';
  if (code === 'ta') return 'Tamil';
  return 'English';
}

export function buildHealthContext(opts: {
  vitals: Vital[];
  meds: Med[];
  profile: Profile;
  settings: Settings;
  symptoms?: string;
  question?: string;
  photoKind?: PhotoKind;
}) {
  const since = Date.now() - 14 * 86400000;
  const lines: string[] = [];
  lines.push(`Language for the reply: ${langName(opts.settings.lang)}.`);
  lines.push('The user has given permission to share the sections marked included.');
  if (opts.settings.shareProfile) {
    lines.push(
      `Profile (user-entered, may include samples): name ${opts.profile.name || 'unknown'}, dob ${opts.profile.dob || 'unknown'}, sex ${opts.profile.sex || 'unknown'}, blood ${opts.profile.bloodGroup || 'unknown'}, conditions ${opts.profile.conditions || 'none noted'}, allergies ${opts.profile.allergies || 'none noted'}.`,
    );
  } else {
    lines.push('Profile was not shared.');
  }
  if (opts.settings.shareVitals) {
    const rows = opts.vitals.filter((v) => v.at >= since).slice(0, 80);
    if (!rows.length) lines.push('No vitals in the last 14 days.');
    else {
      lines.push('Vitals in the last 14 days (newest first):');
      rows.forEach((v) => {
        lines.push(`- ${v.metric} ${formatValue(v)} ${metricUnit(v.metric)} at ${formatWhen(v.at)}${v.context ? ` (${v.context})` : ''}${v.sample ? ' [SAMPLE]' : ''} band ${classify(v.metric, v.value, v.value2)}`);
      });
    }
  } else lines.push('Vitals were not shared.');
  if (opts.settings.shareMeds) {
    if (!opts.meds.length) lines.push('No medicines listed.');
    else {
      lines.push('Medicines (user-entered):');
      opts.meds.forEach((m) => {
        lines.push(`- ${m.name} ${m.strength} ${m.form}, times ${m.times.join(', ') || 'none'}, withFood ${m.withFood}, stock ${m.stock}${m.sample ? ' [SAMPLE]' : ''}. Notes: ${m.notes || 'none'}`);
      });
    }
  } else lines.push('Medicine list was not shared.');
  if (opts.symptoms) lines.push(`User symptoms/notes: ${opts.symptoms}`);
  if (opts.question) lines.push(`User question: ${opts.question}`);
  if (opts.photoKind === 'skin') lines.push('IMPORTANT: A photo cannot identify an infection, pathogen or diagnosis. Do not identify a disease, name a likely pathogen, or recommend medication. Describe only uncertain visible features and recommend a qualified clinician. Urgent symptoms require immediate medical care.');
  if (opts.photoKind) lines.push(`A photo was attached. The user labelled it as: ${opts.photoKind}. Describe only what is relevant to wellness journaling. Do not invent text on the image.`);
  return lines.join('\n');
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function localAnalysis(opts: {
  vitals: Vital[];
  meds: Med[];
  profile: Profile;
  settings: Settings;
  symptoms?: string;
  question?: string;
  photoKind?: PhotoKind;
}): AiResult {
  const since = Date.now() - 14 * 86400000;
  const rows = opts.vitals.filter((v) => v.at >= since);
  const by = (m: Vital['metric']) => rows.filter((v) => v.metric === m).sort((a, b) => a.at - b.at);
  const bits: string[] = [];
  bits.push('Wellness information only — this is not a medical diagnosis.');
  bits.push('Source: on-device engine. A live Gemini model was not used for this note.');
  if (rows.some((r) => r.sample) || opts.meds.some((m) => m.sample)) {
    bits.push('Some rows are marked sample. Treat them as placeholders, not your chart.');
  }
  const bp = by('bp');
  if (bp.length) {
    const sys = avg(bp.map((v) => v.value))!;
    const dia = avg(bp.map((v) => v.value2 || 0))!;
    const last = bp[bp.length - 1];
    const trend = bp.length > 1 ? last.value - bp[0].value : 0;
    bits.push(`Blood pressure: ${bp.length} readings, average about ${Math.round(sys)}/${Math.round(dia)} mmHg. Latest ${formatValue(last)} (${classify(last.metric, last.value, last.value2)}). Change across the window: ${trend > 2 ? 'a little higher' : trend < -2 ? 'a little lower' : 'steady'}.`);
    if (bp.some((v) => classify('bp', v.value, v.value2) === 'urgent')) {
      bits.push('At least one blood pressure reading sits in a range people usually treat as urgent. If you feel unwell, contact a clinician or call 1990.');
    }
  } else bits.push('No blood pressure logs in the last 14 days.');
  const hr = by('hr');
  if (hr.length) {
    const a = avg(hr.map((v) => v.value))!;
    bits.push(`Resting heart rate average about ${Math.round(a)} bpm across ${hr.length} logs.`);
  }
  const g = by('glucose');
  if (g.length) {
    const a = avg(g.map((v) => v.value))!;
    const high = g.filter((v) => v.value >= 126).length;
    bits.push(`Glucose average about ${Math.round(a)} mg/dL. ${high ? `${high} reading(s) are at or above 126 — worth mentioning to a clinician if these were fasting.` : 'None of the logged values are at or above 126.'} Bands assume fasting finger-stick numbers you typed in.`);
  }
  const sl = by('sleep');
  if (sl.length) {
    const a = avg(sl.map((v) => v.value))!;
    bits.push(`Sleep averages about ${a.toFixed(1)} hours. ${a < 6.5 ? 'That is on the short side of a common 7–9 hour window.' : 'That sits near a common 7–9 hour window.'}`);
  }
  const st = by('steps');
  if (st.length) {
    const a = avg(st.map((v) => v.value))!;
    bits.push(`Steps average about ${Math.round(a).toLocaleString()} a day. A gentle goal used in this app is 7,000 — not a prescription.`);
  }
  const wa = by('water');
  if (wa.length) {
    const a = avg(wa.map((v) => v.value))!;
    bits.push(`Water averages about ${Math.round(a).toLocaleString()} ml. The in-app goal is 2,000 ml, and needs differ.`);
  }
  const ox = by('spo2');
  if (ox.some((v) => v.value < 92)) bits.push('A SpO₂ reading is under 92. That is flagged here as urgent wellness information, not a diagnosis. Seek care if you feel short of breath.');
  if (opts.meds.length) {
    bits.push(`Medicines on the list: ${opts.meds.map((m) => `${m.name} ${m.strength} at ${m.times.join(' & ') || 'unscheduled'}`).join('; ')}. Do not change a dose from this note.${opts.meds.some((m) => m.sample) ? ' Sample rows are not a prescription.' : ''}`);
    const low = opts.meds.filter((m) => m.stock <= m.perDose * 7);
    if (low.length) bits.push(`Stock looks low for ${low.map((m) => m.name).join(', ')}. A refill reminder only — confirm with your pharmacy.`);
  }
  if (opts.symptoms) bits.push(`You noted: ${opts.symptoms}. A journal can hold that; it cannot explain the cause.`);
  if (opts.question) bits.push(`On your question — “${opts.question}” — the on-device engine can only reflect the logs above. Try AuraCoach again later for a fuller reply.`);
  if (opts.photoKind === 'meal') bits.push('Meal photo: this engine cannot see the image. General tip — a vegetable, a protein and a glass of water is a calm plate pattern, not a medical diet.');
  if (opts.photoKind === 'pack') bits.push('Medicine pack photo: this engine cannot read the pack. Check the name, strength and expiry yourself. Do not change a dose from an app.');
  if (opts.photoKind === 'skin') bits.push('This on-device note cannot see the photo or identify an infection. A clinician can assess your concern.');
  if (opts.photoKind === 'document') bits.push('Document photo: keep the original for your clinician. This engine does not extract a diagnosis from images.');
  bits.push('Gentle next steps: keep logging at similar times, mention patterns that worry you at your next visit, and use 1990 or 119 only for emergencies.');
  bits.push('If you feel unwell, contact a clinician. This note is not a diagnosis.');
  return { text: bits.join('\n\n'), source: 'local' };
}

async function readError(res: Response) {
  try {
    const j = await res.json();
    return j?.error?.message || j?.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function runGemini(opts: {
  settings: Settings;
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<AiResult> {
  const model = opts.settings.model || 'gemini-2.5-flash';
  const parts: Record<string, unknown>[] = [{ text: opts.prompt }];
  if (opts.imageBase64) {
    parts.push({ inline_data: { mime_type: opts.mimeType || 'image/jpeg', data: opts.imageBase64 } });
  }
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
  };
  try {
    const url = process.env.EXPO_PUBLIC_AURA_AI_URL;
    if (!url || !url.startsWith('https://')) return { text: '', source: 'gemini', error: 'The AI server is not configured for this build.' };
    const user = getAuth().currentUser;
    if (!user || !user.emailVerified) return { text: '', source: 'gemini', error: 'Sign in with a verified account to use AI.' };
    const token = await getIdToken(user);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ model, contents: body.contents, systemInstruction: body.systemInstruction, generationConfig: body.generationConfig }),
    });
    if (!res.ok) return { text: '', source: 'gemini', error: String(await readError(res)) };
    const data = await res.json();
    const text = data.text || data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
    if (!text) return { text: '', source: 'gemini', error: 'Empty reply' };
    return { text, source: 'gemini', model: typeof data.model === 'string' ? data.model : undefined };
  } catch (e) {
    return { text: '', source: 'gemini', error: e instanceof Error ? e.message : 'Network error' };
  }
}
