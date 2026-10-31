import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Appointment, DoseLog, Lang, Med, PlanId, Profile, Settings, UserRec, Vault, Vital } from './types';
import {
  defaultSettings,
  hashPass,
  isPro,
  PLANS,
  seedAppointments,
  seedMeds,
  seedProfile,
  seedVitals,
  uid,
  validEmail,
  validPassword,
} from './health';
import { makeT, type TKey } from './i18n';

const DB_KEY = 'aura.db.v1';

interface DB {
  users: UserRec[];
  session: string | null;
  vaults: Record<string, Vault>;
  settings: Record<string, Settings>;
}

async function secGet(key: string) {
  try {
    const v = await SecureStore.getItemAsync(key);
    if (v != null) return v;
  } catch {
    /* web / unsupported */
  }
  return AsyncStorage.getItem(`secure.${key}`);
}

async function secSet(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
    return;
  } catch {
    /* fall through */
  }
  await AsyncStorage.setItem(`secure.${key}`, value);
}

async function secDel(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
  await AsyncStorage.removeItem(`secure.${key}`);
}

function emptyVault(name: string, sample = false): Vault {
  return {
    vitals: sample ? seedVitals() : [],
    meds: sample ? seedMeds() : [],
    doses: [],
    appointments: sample ? seedAppointments() : [],
    profile: sample ? seedProfile(name) : { name, dob: '', sex: '', bloodGroup: '', heightCm: '', weightKg: '', conditions: '', allergies: '', emergencyName: '', emergencyPhone: '', homeDistrict: '' },
    chat: [],
  };
}

const emptyDB = (): DB => ({ users: [], session: null, vaults: {}, settings: {} });

interface Store {
  ready: boolean;
  session: UserRec | null;
  locked: boolean;
  vault: Vault;
  settings: Settings;
  hasPin: boolean;
  bioAvailable: boolean;
  t: (key: TKey) => string;
  signUp: (input: { name: string; email: string; password: string }) => { ok: boolean; error?: TKey };
  signIn: (email: string, password: string) => { ok: boolean; error?: TKey };
  googleLink: (email: string, name: string) => { ok: boolean; error?: TKey };
  explore: () => void;
  signOut: () => void;
  setLang: (lang: Lang) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setApiKey: (key: string) => Promise<void>;
  getApiKey: () => Promise<string>;
  setPin: (pin: string) => Promise<void>;
  checkPin: (pin: string) => Promise<boolean>;
  clearPin: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
  setBioAvailable: (v: boolean) => void;
  addVital: (v: Omit<Vital, 'id'>) => void;
  removeVital: (id: string) => void;
  saveMed: (m: Med) => void;
  removeMed: (id: string) => void;
  markDose: (medId: string, slot: string, status: 'taken' | 'skipped') => void;
  undoDose: (medId: string, slot: string) => void;
  saveAppointment: (a: Appointment) => void;
  removeAppointment: (id: string) => void;
  updateProfile: (p: Profile) => void;
  addChat: (m: Vault['chat'][number]) => void;
  clearChat: () => void;
  activatePlan: (plan: Exclude<PlanId, 'free'>, method: 'card-demo' | 'bank-ref', reference: string) => void;
  cancelPlan: () => void;
  resetSamples: () => void;
  exportJson: () => string;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('store');
  return v;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB());
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const hydrated = React.useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DB_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DB;
          setDb({
            users: parsed.users || [],
            session: parsed.session || null,
            vaults: parsed.vaults || {},
            settings: parsed.settings || {},
          });
          if (parsed.session) {
            const s = parsed.settings?.[parsed.session];
            if (s?.lockEnabled) setLocked(true);
          }
        }
        const pin = await secGet('aura.pin');
        setHasPin(!!pin);
      } catch {
        /* keep empty */
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(DB_KEY, JSON.stringify(db)).catch(() => {});
  }, [db]);

  const session = db.users.find((u) => u.email === db.session) || null;
  const email = session?.email || '';
  const vault = (email && db.vaults[email]) || emptyVault(session?.name || 'Nimali');
  const settings = (email && db.settings[email]) || defaultSettings();

  const patchVault = (fn: (v: Vault) => Vault) => {
    if (!email) return;
    setDb((d) => ({ ...d, vaults: { ...d.vaults, [email]: fn(d.vaults[email] || emptyVault(session?.name || '')) } }));
  };
  const patchSettings = (fn: (s: Settings) => Settings) => {
    if (!email) return;
    setDb((d) => ({ ...d, settings: { ...d.settings, [email]: fn(d.settings[email] || defaultSettings()) } }));
  };

  const openSession = (user: UserRec, fresh: boolean) => {
    setDb((d) => {
      const vaults = { ...d.vaults };
      const settingsMap = { ...d.settings };
      if (!vaults[user.email]) vaults[user.email] = emptyVault(user.name, user.provider === 'sample');
      if (!settingsMap[user.email]) settingsMap[user.email] = defaultSettings();
      if (fresh) {
        vaults[user.email] = emptyVault(user.name, user.provider === 'sample');
      }
      return { ...d, users: d.users.some((u) => u.email === user.email) ? d.users : [...d.users, user], session: user.email, vaults, settings: settingsMap };
    });
    secGet('aura.pin').then((pin) => {
      setHasPin(!!pin);
      setLocked(false);
    });
  };

  const api: Store = {
    ready,
    session,
    locked: !!session && locked,
    vault,
    settings,
    hasPin,
    bioAvailable,
    t: makeT(settings.lang),
    signUp: ({ name, email: raw, password }) => {
      const emailNorm = raw.trim().toLowerCase();
      if (name.trim().length < 2) return { ok: false, error: 'name_short' };
      if (!validEmail(emailNorm)) return { ok: false, error: 'invalid_email' };
      if (!validPassword(password)) return { ok: false, error: 'short_password' };
      if (db.users.some((u) => u.email === emailNorm)) return { ok: false, error: 'account_exists' };
      const user: UserRec = { email: emailNorm, name: name.trim(), provider: 'email', passHash: hashPass(emailNorm, password), createdAt: Date.now() };
      openSession(user, true);
      return { ok: true };
    },
    signIn: (raw, password) => {
      const emailNorm = raw.trim().toLowerCase();
      const user = db.users.find((u) => u.email === emailNorm);
      if (!user || !user.passHash || user.passHash !== hashPass(emailNorm, password)) return { ok: false, error: 'wrong_creds' };
      openSession(user, false);
      if (db.settings[emailNorm]?.lockEnabled) {
        secGet('aura.pin').then((pin) => pin && setLocked(true));
      }
      return { ok: true };
    },
    googleLink: (raw, name) => {
      const emailNorm = raw.trim().toLowerCase();
      if (!validEmail(emailNorm)) return { ok: false, error: 'invalid_email' };
      const existing = db.users.find((u) => u.email === emailNorm);
      if (existing && existing.provider === 'email') return { ok: false, error: 'use_password' };
      const user: UserRec = existing || {
        email: emailNorm,
        name: name.trim() || emailNorm.split('@')[0],
        provider: 'google',
        createdAt: Date.now(),
      };
      openSession(user, !existing);
      return { ok: true };
    },
    explore: () => {
      const emailNorm = 'preview@aura.health';
      const existing = db.users.find((u) => u.email === emailNorm);
      const user: UserRec = existing || { email: emailNorm, name: 'Nimali', provider: 'sample', createdAt: Date.now() };
      openSession(user, !existing);
    },
    signOut: () => {
      setLocked(false);
      setDb((d) => ({ ...d, session: null }));
    },
    setLang: (lang) => patchSettings((s) => ({ ...s, lang })),
    updateSettings: (patch) => patchSettings((s) => ({ ...s, ...patch })),
    setApiKey: async (key) => {
      if (key) await secSet('aura.gemini', key);
      else await secDel('aura.gemini');
    },
    getApiKey: async () => (await secGet('aura.gemini')) || '',
    setPin: async (pin) => {
      await secSet('aura.pin', hashPass('pin', pin));
      setHasPin(true);
      patchSettings((s) => ({ ...s, lockEnabled: true }));
    },
    checkPin: async (pin) => {
      const stored = await secGet('aura.pin');
      return !!stored && stored === hashPass('pin', pin);
    },
    clearPin: async () => {
      await secDel('aura.pin');
      setHasPin(false);
      patchSettings((s) => ({ ...s, lockEnabled: false, biometric: false }));
    },
    unlock: () => setLocked(false),
    lock: () => setLocked(true),
    setBioAvailable,
    addVital: (v) => patchVault((vaultNow) => ({ ...vaultNow, vitals: [{ ...v, id: uid() }, ...vaultNow.vitals] })),
    removeVital: (id) => patchVault((vaultNow) => ({ ...vaultNow, vitals: vaultNow.vitals.filter((v) => v.id !== id) })),
    saveMed: (m) =>
      patchVault((vaultNow) => {
        const exists = vaultNow.meds.some((x) => x.id === m.id);
        return { ...vaultNow, meds: exists ? vaultNow.meds.map((x) => (x.id === m.id ? m : x)) : [m, ...vaultNow.meds] };
      }),
    removeMed: (id) =>
      patchVault((vaultNow) => ({
        ...vaultNow,
        meds: vaultNow.meds.filter((m) => m.id !== id),
        doses: vaultNow.doses.filter((d) => d.medId !== id),
      })),
    markDose: (medId, slot, status) =>
      patchVault((vaultNow) => {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        const rest = vaultNow.doses.filter((d) => !(d.medId === medId && d.slot === slot && d.loggedAt >= day.getTime()));
        const med = vaultNow.meds.find((m) => m.id === medId);
        const meds = vaultNow.meds.map((m) => {
          if (m.id !== medId || status !== 'taken') return m;
          return { ...m, stock: Math.max(0, m.stock - (med?.perDose || 1)) };
        });
        const log: DoseLog = { id: uid(), medId, slot, status, loggedAt: Date.now() };
        return { ...vaultNow, doses: [log, ...rest], meds };
      }),
    undoDose: (medId, slot) =>
      patchVault((vaultNow) => {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        const hit = vaultNow.doses.find((d) => d.medId === medId && d.slot === slot && d.loggedAt >= day.getTime());
        const meds = vaultNow.meds.map((m) => {
          if (!hit || m.id !== medId || hit.status !== 'taken') return m;
          return { ...m, stock: m.stock + m.perDose };
        });
        return {
          ...vaultNow,
          meds,
          doses: vaultNow.doses.filter((d) => !(d.medId === medId && d.slot === slot && d.loggedAt >= day.getTime())),
        };
      }),
    saveAppointment: (a) =>
      patchVault((vaultNow) => {
        const exists = vaultNow.appointments.some((x) => x.id === a.id);
        return {
          ...vaultNow,
          appointments: exists ? vaultNow.appointments.map((x) => (x.id === a.id ? a : x)) : [a, ...vaultNow.appointments],
        };
      }),
    removeAppointment: (id) => patchVault((vaultNow) => ({ ...vaultNow, appointments: vaultNow.appointments.filter((a) => a.id !== id) })),
    updateProfile: (p) => patchVault((vaultNow) => ({ ...vaultNow, profile: p })),
    addChat: (m) => patchVault((vaultNow) => ({ ...vaultNow, chat: [...vaultNow.chat, m] })),
    clearChat: () => patchVault((vaultNow) => ({ ...vaultNow, chat: [] })),
    activatePlan: (plan, method, reference) => {
      const spec = PLANS[plan];
      patchSettings((s) => ({
        ...s,
        plan,
        planUntil: Date.now() + spec.days * 86400000,
        receipts: [
          {
            id: uid(),
            at: Date.now(),
            plan,
            amountLkr: spec.lkr,
            method,
            reference,
            note: 'Demo billing. No charge was made. Card numbers were not stored.',
          },
          ...s.receipts,
        ],
      }));
    },
    cancelPlan: () => patchSettings((s) => ({ ...s, plan: 'free', planUntil: null })),
    resetSamples: () => {
      if (!session) return;
      patchVault(() => emptyVault(session.name, true));
    },
    exportJson: () =>
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          account: session ? { email: session.email, name: session.name, provider: session.provider } : null,
          settings: { ...settings, receipts: settings.receipts },
          vault,
          pro: isPro(settings),
          note: 'Local export. Contains health notes. Not a medical record.',
        },
        null,
        2,
      ),
  };

  const value = useMemo(() => api, [db, ready, locked, hasPin, bioAvailable, session, vault, settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
