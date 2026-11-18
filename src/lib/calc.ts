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

// ---------- Series para gráficos ----------

export type Period = 'week' | 'month' | '3m' | 'year';

export function kmPerDay(list: Session[]): Record<string, number> {
  const by: Record<string, number> = {};
  for (const s of list) by[s.date] = (by[s.date] || 0) + s.distanceKm;
  return by;
}

/** Rango [desde, hasta] del periodo que contiene `iso`, y del periodo anterior */
export function periodRange(p: Period, iso: string): { from: string; to: string; prevFrom: string; prevTo: string } {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (p === 'week') {
    const from = weekStart(iso);
    return { from, to: addDays(from, 6), prevFrom: addDays(from, -7), prevTo: addDays(from, -1) };
  }
  if (p === 'month') {
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const pf = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const pt = new Date(d.getFullYear(), d.getMonth(), 0);
    return { from: ymd(from), to: ymd(to), prevFrom: ymd(pf), prevTo: ymd(pt) };
  }
  if (p === '3m') {
    const to = addDays(weekStart(iso), 6);
    const from = addDays(weekStart(iso), -7 * 12);
    return { from, to, prevFrom: addDays(from, -91), prevTo: addDays(from, -1) };
  }
  const from = `${d.getFullYear()}-01-01`;
  return { from, to: `${d.getFullYear()}-12-31`, prevFrom: `${d.getFullYear() - 1}-01-01`, prevTo: `${d.getFullYear() - 1}-12-31` };
}

const MONTH_SHORT = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Barras del periodo: semana → 7 días; mes → días; 3 meses → 13 semanas; año → 12 meses */
export function periodBars(list: Session[], p: Period, iso: string): { values: number[]; labels: string[]; keys: string[]; highlight: number } {
  const by = kmPerDay(list);
  const { from, to } = periodRange(p, iso);
  if (p === 'week' || p === 'month') {
    const values: number[] = [];
    const labels: string[] = [];
    const keys: string[] = [];
    let hi = -1;
    for (let d = from, i = 0; d <= to; d = addDays(d, 1), i++) {
      values.push(by[d] || 0);
      keys.push(d);
      labels.push(p === 'week' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'][i] : i % 5 === 0 || d === iso ? String(Number(d.slice(8))) : '');
      if (d === iso) hi = i;
    }
    return { values, labels, keys, highlight: hi };
  }
  if (p === '3m') {
    const values: number[] = [];
    const labels: string[] = [];
    const keys: string[] = [];
    for (let w = from, i = 0; w <= to; w = addDays(w, 7), i++) {
      let km = 0;
      for (let k = 0; k < 7; k++) km += by[addDays(w, k)] || 0;
      values.push(km);
      keys.push(w);
      labels.push(i % 2 === 0 ? String(Number(w.slice(8))) : '');
    }
    return { values, labels, keys, highlight: values.length - 1 };
  }
  const year = from.slice(0, 4);
  const values = new Array(12).fill(0);
  for (const [d, km] of Object.entries(by)) if (d.startsWith(year)) values[Number(d.slice(5, 7)) - 1] += km;
  return { values, labels: MONTH_SHORT, keys: MONTH_SHORT.map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`), highlight: Number(iso.slice(5, 7)) - 1 };
}

/** Km acumulados por día de la semana actual (null en días futuros) */
export function weekCumulative(list: Session[], iso: string): (number | null)[] {
  const by = kmPerDay(list);
  const ws = weekStart(iso);
  let acc = 0;
  const out: (number | null)[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    if (d > iso) out.push(null);
    else {
      acc += by[d] || 0;
      out.push(acc);
    }
  }
  return out;
}

/** Serie semanal de las últimas n semanas */
export function weeklySeries(list: Session[], n: number, settings: Settings) {
  const cur = weekStart(todayISO());
  const out: { week: string; km: number; minutes: number; avgSpeed: number; kmLoaded: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const w = addDays(cur, -7 * i);
    const t = totals(sessionsInRange(list, w, addDays(w, 6)), settings);
    out.push({ week: w, km: t.km, minutes: t.minutes, avgSpeed: t.avgSpeed, kmLoaded: t.kmLoaded });
  }
  return out;
}

export function records(list: Session[], settings: Settings) {
  if (!list.length) return null;
  const byDay = kmPerDay(list);
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const byWeek: Record<string, number> = {};
  for (const s of list) byWeek[weekStart(s.date)] = (byWeek[weekStart(s.date)] || 0) + s.distanceKm;
  const bestWeek = Object.entries(byWeek).sort((a, b) => b[1] - a[1])[0];
  const longest = [...list].sort((a, b) => b.minutes - a.minutes)[0];
  const fastest = [...list].filter((s) => s.minutes >= 10).sort((a, b) => b.speedKmh - a.speedKmh)[0];
  const heaviest = [...list].sort((a, b) => b.loadKg - a.loadKg)[0];
  const mostKcal = [...list].sort((a, b) => estimateKcal(b, settings) - estimateKcal(a, settings))[0];
  return { bestDay, bestWeek, longest, fastest, heaviest, mostKcal };
}
