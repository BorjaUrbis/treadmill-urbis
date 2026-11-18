import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { DEFAULT_SETTINGS, Session, SessionDraft, Settings } from './types';
import {
  getApiKey,
  getSheetsToken,
  loadLastSync,
  loadSessions,
  loadSettings,
  loadTombstones,
  newId,
  saveLastSync,
  saveSessions,
  saveSettings,
  saveTombstones,
  setApiKey as storeApiKey,
} from './storage';
import { rescheduleReminders, setupNotifications } from './notifications';
import { newToken, syncWithSheets } from './sync';

export type SyncState = { status: 'off' | 'idle' | 'syncing' | 'error'; message?: string; last: number | null };

type Store = {
  ready: boolean;
  sessions: Session[];
  settings: Settings;
  apiKey: string | null;
  sync: SyncState;
  addSessions: (d: SessionDraft[]) => Promise<void>;
  updateSession: (s: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  updateSettings: (p: Partial<Settings>) => Promise<void>;
  setApiKey: (k: string | null) => Promise<void>;
  syncNow: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [apiKey, setKey] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>({ status: 'off', last: null });

  // Refs con el estado más reciente, para la sincronización asíncrona
  const sessionsRef = useRef<Session[]>([]);
  const tombRef = useRef<string[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const syncing = useRef(false);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitSessions = useCallback(async (next: Session[]) => {
    sessionsRef.current = next;
    setSessions(next);
    await saveSessions(next);
    rescheduleReminders(next, settingsRef.current).catch(() => {});
  }, []);

  const runSync = useCallback(async () => {
    const url = settingsRef.current.sheetsUrl;
    if (!url) {
      setSync((s) => ({ ...s, status: 'off' }));
      return;
    }
    if (syncing.current) {
      pending.current = true;
      return;
    }
    syncing.current = true;
    setSync((s) => ({ ...s, status: 'syncing' }));
    try {
      const token = await getSheetsToken(newToken);
      const before = sessionsRef.current;
      const sentTombs = [...tombRef.current];
      const res = await syncWithSheets(url, token, before, sentTombs, settingsRef.current);
      // Si mientras tanto ha cambiado algo en el móvil, se conserva y se sube en la siguiente vuelta
      const changedMeanwhile = sessionsRef.current !== before;
      let merged = res.sessions;
      if (changedMeanwhile) {
        const fresh = new Map(sessionsRef.current.map((s) => [s.id, s]));
        merged = merged.filter((s) => fresh.has(s.id)).map((s) => {
          const f = fresh.get(s.id)!;
          return f.updatedAt > s.updatedAt ? f : s;
        });
        for (const f of sessionsRef.current) if (!merged.find((m) => m.id === f.id)) merged.push(f);
        pending.current = true;
      }
      tombRef.current = tombRef.current.filter((t) => !sentTombs.includes(t));
      await saveTombstones(tombRef.current);
      await commitSessions(merged);
      const now = Date.now();
      await saveLastSync(now);
      setSync({ status: 'idle', last: now });
    } catch (e) {
      setSync((s) => ({ ...s, status: 'error', message: (e as Error).message }));
    } finally {
      syncing.current = false;
      if (pending.current) {
        pending.current = false;
        setTimeout(runSync, 500);
      }
    }
  }, [commitSessions]);

  const scheduleSync = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(runSync, 1500);
  }, [runSync]);

  useEffect(() => {
    (async () => {
      const [s, st, k, tomb, last] = await Promise.all([loadSessions(), loadSettings(), getApiKey(), loadTombstones(), loadLastSync()]);
      sessionsRef.current = s;
      settingsRef.current = st;
      tombRef.current = tomb;
      setSessions(s);
      setSettings(st);
      setKey(k);
      setSync({ status: st.sheetsUrl ? 'idle' : 'off', last });
      setReady(true);
      try {
        await setupNotifications();
        await rescheduleReminders(s, st);
      } catch (e) {
        console.warn('notifications', e);
      }
      if (st.sheetsUrl) runSync();
    })();
  }, [runSync]);

  // Al volver a la app: traer cambios de la hoja y reprogramar avisos
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !ready) return;
      rescheduleReminders(sessionsRef.current, settingsRef.current).catch(() => {});
      runSync();
    });
    return () => sub.remove();
  }, [ready, runSync]);

  const value = useMemo<Store>(
    () => ({
      ready,
      sessions,
      settings,
      apiKey,
      sync,
      addSessions: async (drafts) => {
        const now = Date.now();
        const added = drafts.map((d, i) => ({ ...d, id: newId(), createdAt: now + i, updatedAt: now + i }));
        await commitSessions([...sessionsRef.current, ...added]);
        scheduleSync();
      },
      updateSession: async (s) => {
        const next = { ...s, updatedAt: Date.now() };
        await commitSessions(sessionsRef.current.map((x) => (x.id === s.id ? next : x)));
        scheduleSync();
      },
      deleteSession: async (id) => {
        const victim = sessionsRef.current.find((x) => x.id === id);
        await commitSessions(sessionsRef.current.filter((x) => x.id !== id));
        if (victim?.syncedAt) {
          tombRef.current = [...tombRef.current, id];
          await saveTombstones(tombRef.current);
        }
        scheduleSync();
      },
      updateSettings: async (p) => {
        const next = { ...settingsRef.current, ...p };
        settingsRef.current = next;
        setSettings(next);
        await saveSettings(next);
        rescheduleReminders(sessionsRef.current, next).catch(() => {});
        if ('sheetsUrl' in p || 'bodyWeightKg' in p || 'inclinePct' in p || 'weeklyGoalKm' in p) scheduleSync();
      },
      setApiKey: async (k) => {
        await storeApiKey(k);
        setKey(k ? k.trim() : null);
      },
      syncNow: runSync,
    }),
    [ready, sessions, settings, apiKey, sync, commitSessions, scheduleSync, runSync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore fuera de StoreProvider');
  return c;
}
