export type Lang = 'en' | 'si' | 'ta';
export type Provider = 'email' | 'google' | 'sample';
export type Metric = 'bp' | 'hr' | 'glucose' | 'sleep' | 'steps' | 'water' | 'weight' | 'spo2';
export type Band = 'low' | 'ok' | 'watch' | 'high' | 'urgent' | 'none';
export type VisitType = 'physical' | 'tele' | 'lab';
export type VisitStatus = 'upcoming' | 'completed' | 'cancelled';
export type AiMode = 'proxy' | 'direct' | 'local';
export type PlanId = 'free' | 'monthly' | 'yearly';
export type Verification = 'verified' | 'listing' | 'unverified';
export type Service = 'physical' | 'tele' | 'lab';
export type PhotoKind = 'meal' | 'pack' | 'document';

export interface Center {
  id: string;
  name: string;
  kind: string;
  province: string;
  district: string;
  city: string;
  address: string;
  phones: { label: string; number: string }[];
  website?: string;
  hours: string;
  emergency24: boolean;
  specialties: string[];
  services: Service[];
  verification: Verification;
  verifiedOn?: string;
  source?: string;
  note?: string;
}

export interface UserRec {
  email: string;
  name: string;
  provider: Provider;
  passHash?: string;
  createdAt: number;
}

export interface Vital {
  id: string;
  metric: Metric;
  value: number;
  value2?: number;
  at: number;
  context?: string;
  sample?: boolean;
}

export interface Med {
  id: string;
  name: string;
  strength: string;
  form: string;
  times: string[];
  withFood: boolean;
  stock: number;
  perDose: number;
  notes: string;
  colorIdx: number;
  startedAt: number;
  sample?: boolean;
}

export interface DoseLog {
  id: string;
  medId: string;
  slot: string;
  status: 'taken' | 'skipped';
  loggedAt: number;
}

export interface Appointment {
  id: string;
  type: VisitType;
  centerId?: string;
  centerName: string;
  doctor?: string;
  specialty?: string;
  at: number;
  refNo?: string;
  fee?: number;
  notes?: string;
  status: VisitStatus;
  reminder: boolean;
  sample?: boolean;
}

export interface Profile {
  name: string;
  dob: string;
  sex: string;
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
  conditions: string;
  allergies: string;
  emergencyName: string;
  emergencyPhone: string;
  homeDistrict: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
  source?: 'gemini' | 'local' | 'user';
  photoKind?: PhotoKind;
}

export interface Receipt {
  id: string;
  at: number;
  plan: PlanId;
  amountLkr: number;
  method: 'card-demo' | 'bank-ref';
  reference: string;
  note: string;
}

export interface Settings {
  lang: Lang;
  lockEnabled: boolean;
  biometric: boolean;
  aiMode: AiMode;
  proxyUrl: string;
  model: string;
  aiConsent: boolean;
  bedtimeReminder?: string;
  stepTrackingEnabled?: boolean;
  shareVitals: boolean;
  shareMeds: boolean;
  shareProfile: boolean;
  plan: PlanId;
  planUntil: number | null;
  receipts: Receipt[];
}

export interface Vault {
  vitals: Vital[];
  meds: Med[];
  doses: DoseLog[];
  appointments: Appointment[];
  profile: Profile;
  chat: ChatMessage[];
}

export interface AppDB {
  users: UserRec[];
  session: string | null;
  vaults: Record<string, Vault>;
  settings: Record<string, Settings>;
}
