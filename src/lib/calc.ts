import { Session, Settings } from './types';
import { addDays, dayOfWeek, minutesToTime, timeToMinutes, todayISO, weekStart } from './dates';

/**
 * Gasto bruto estimado con la ecuación de marcha del ACSM:
 * VO2 (ml/kg/min) = 0,1·v + 1,8·v·pendiente + 3,5   (v en m/min)
 * kcal = VO2 · (peso corporal + carga) / 1000 · 5 · minutos
 */
export function estimateKcal(s: Pick<Session, 'speedKmh' | 'minutes' | 'loadKg'>, settings: Settings): number {
  if (!s.minutes || !s.speedKmh) return 0;
  const v = (s.speedKmh * 1000) / 60;
  const grade = settings.inclinePct / 100;
  const vo2 = 0.1 * v + 1.8 * v * grade + 3.5;
  const mass = settings.bodyWeightKg + (s.loadKg || 0);
  return (vo2 * mass * 5 * s.minutes) / 1000;
}

export function startTime(s: Session): string | null {
  if (!s.endTime) return null;
  return minutesToTime(timeToMinutes(s.endTime) - s.minutes);
}

/** Completa el dato que falte entre tiempo, velocidad y distancia */
export function completeTriad(x: { minutes?: number | null; speedKmh?: number | null; distanceKm?: number | null }) {
  let { minutes, speedKmh, distanceKm } = x;
  if (!minutes && speedKmh && distanceKm) minutes = (distanceKm / speedKmh) * 60;
  if (!distanceKm && speedKmh && minutes) distanceKm = (speedKmh * minutes) / 60;
  if (!speedKmh && distanceKm && minutes) speedKmh = distanceKm / (minutes / 60);
  return {
    minutes: minutes ? Math.round(minutes) : 0,
    speedKmh: speedKmh ? Math.round(speedKmh * 10) / 10 : 0,
    distanceKm: distanceKm ? Math.round(distanceKm * 100) / 100 : 0,
  };
}

export type Totals = {
  sessions: number;
  minutes: number;
  km: number;
  kcal: number;
  kmLoaded: number;
  minutesBarefoot: number;
  avgSpeed: number;
  activeDays: number;
};

export function totals(list: Session[], settings: Settings): Totals {
  const t = list.reduce(
    (a, s) => {
      a.minutes += s.minutes;
      a.km += s.distanceKm;
      a.kcal += estimateKcal(s, settings);
      if (s.loadKg > 0) a.kmLoaded += s.distanceKm;
      if (s.barefoot) a.minutesBarefoot += s.minutes;
      return a;
    },
    { minutes: 0, km: 0, kcal: 0, kmLoaded: 0, minutesBarefoot: 0 },
  );
  return {
    ...t,
    sessions: list.length,
    avgSpeed: t.minutes ? t.km / (t.minutes / 60) : 0,
    activeDays: new Set(list.map((s) => s.date)).size,
  };
}

export function sessionsInRange(list: Session[], from: string, to: string) {
  return list.filter((s) => s.date >= from && s.date <= to);
}

export function weekSessions(list: Session[], anyDayIso: string) {
  const ws = weekStart(anyDayIso);
  return sessionsInRange(list, ws, addDays(ws, 6));
}

/** km por día de la semana (L..D) */
export function kmByDay(list: Session[], anyDayIso: string): number[] {
  const ws = weekStart(anyDayIso);
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const s of list) {
    if (s.date >= ws && s.date <= addDays(ws, 6)) out[dayOfWeek(s.date)] += s.distanceKm;
  }
  return out;
}

/** km de las últimas n semanas, de más antigua a actual */
export function kmLastWeeks(list: Session[], n: number): { week: string; km: number }[] {
  const cur = weekStart(todayISO());
  const res: { week: string; km: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const w = addDays(cur, -7 * i);
    const km = sessionsInRange(list, w, addDays(w, 6)).reduce((a, s) => a + s.distanceKm, 0);
    res.push({ week: w, km });
  }
  return res;
}

/**
 * Racha: días entre semana consecutivos con sesión, contando hacia atrás.
 * Los fines de semana no rompen la racha (pero suman si caminas).
 * Hoy no rompe la racha si todavía no has caminado.
 */
export function streak(list: Session[]): number {
  const days = new Set(list.map((s) => s.date));
  let d = todayISO();
  let count = 0;
  if (!days.has(d)) d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    const wk = dayOfWeek(d) >= 5;
    if (days.has(d)) count++;
    else if (!wk) break;
    d = addDays(d, -1);
  }
  return count;
}

export function bestDayKm(list: Session[]): { date: string; km: number } | null {
  const by: Record<string, number> = {};
  for (const s of list) by[s.date] = (by[s.date] || 0) + s.distanceKm;
  let best: { date: string; km: number } | null = null;
  for (const [date, km] of Object.entries(by)) if (!best || km > best.km) best = { date, km };
  return best;
}

export const fmt = (n: number, d = 1) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
