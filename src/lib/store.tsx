import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { DEFAULT_SETTINGS, Session, SessionDraft, Settings } from './types';
import { getApiKey, loadSessions, loadSettings, newId, saveSessions, saveSettings, setApiKey as storeApiKey } from './storage';
import { rescheduleReminders, setupNotifications } from './notifications';

type Store = {
  ready: boolean;
  sessions: Session[];
  settings: Settings;
  apiKey: string | null;
  addSessions: (d: SessionDraft[]) => Promise<void>;
  updateSession: (s: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  updateSettings: (p: Partial<Settings>) => Promise<void>;
  setApiKey: (k: string | null) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [apiKey, setKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, st, k] = await Promise.all([loadSessions(), loadSettings(), getApiKey()]);
      setSessions(s);
      setSettings(st);
      setKey(k);
      setReady(true);
      try {
        await setupNotifications();
        await rescheduleReminders(s, st);
      } catch (e) {
        console.warn('notifications', e);
      }
    })();
  }, []);

  // Al volver a la app, reprogramar (por si ha cambiado el día)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready) rescheduleReminders(sessions, settings).catch(() => {});
    });
    return () => sub.remove();
  }, [ready, sessions, settings]);

  const persist = useCallback(
    async (next: Session[], st: Settings = settings) => {
      setSessions(next);
      await saveSessions(next);
      rescheduleReminders(next, st).catch(() => {});
    },
    [settings],
  );

  const value = useMemo<Store>(
    () => ({
      ready,
      sessions,
      settings,
      apiKey,
      addSessions: async (drafts) => {
        const now = Date.now();
        const added = drafts.map((d, i) => ({ ...d, id: newId(), createdAt: now + i }));
        await persist([...sessions, ...added]);
      },
      updateSession: async (s) => persist(sessions.map((x) => (x.id === s.id ? s : x))),
      deleteSession: async (id) => persist(sessions.filter((x) => x.id !== id)),
      updateSettings: async (p) => {
        const next = { ...settings, ...p };
        setSettings(next);
        await saveSettings(next);
        rescheduleReminders(sessions, next).catch(() => {});
      },
      setApiKey: async (k) => {
        await storeApiKey(k);
        setKey(k ? k.trim() : null);
      },
    }),
    [ready, sessions, settings, apiKey, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore fuera de StoreProvider');
  return c;
}
