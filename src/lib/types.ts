export type Session = {
  id: string;
  /** Fecha local en formato YYYY-MM-DD */
  date: string;
  /** Hora de finalización HH:MM (puede faltar) */
  endTime: string | null;
  minutes: number;
  speedKmh: number;
  distanceKm: number;
  /** Calorías que marca la pantalla de la cinta (si se conocen) */
  kcalScreen: number | null;
  barefoot: boolean | null;
  loadKg: number;
  notes: string;
  createdAt: number;
  /** Última modificación (ms). Sirve para resolver conflictos al sincronizar. */
  updatedAt: number;
  /** Momento de la última sincronización correcta con Google Sheets (ms) */
  syncedAt?: number;
};

export type Settings = {
  bodyWeightKg: number;
  inclinePct: number;
  weeklyGoalKm: number;
  remindersEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  weekendReminders: boolean;
  weeklySummary: boolean;
  userName: string;
  sheetsUrl: string;
};

export const DEFAULT_SETTINGS: Settings = {
  bodyWeightKg: 84,
  inclinePct: 0,
  weeklyGoalKm: 25,
  remindersEnabled: true,
  reminderHour: 20,
  reminderMinute: 0,
  weekendReminders: false,
  weeklySummary: true,
  userName: 'Borja',
  sheetsUrl: '',
};

export type SessionDraft = Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt'>;
