import { Session, Settings } from './types';
import { addDays, dayOfWeek, todayISO, weekStart } from './dates';
import { fmt } from './calc';

export type DailyState = 'none' | 'partial' | 'done';

export function dailyStatus(sessions: Session[], settings: Settings, iso = todayISO()) {
  const todayKm = sessions.filter((s) => s.date === iso).reduce((a, s) => a + s.distanceKm, 0);
  const ws = weekStart(iso);
  const we = addDays(ws, 6);
  const weekKm = sessions.filter((s) => s.date >= ws && s.date <= we).reduce((a, s) => a + s.distanceKm, 0);
  const goal = settings.dailyGoalKm || 10;
  const remaining = Math.max(0, goal - todayKm);
  const state: DailyState = todayKm <= 0 ? 'none' : todayKm < goal ? 'partial' : 'done';
  const { title, sub, emoji } = dailyMessage(state, remaining, goal);
  return { todayKm, weekKm, goal, remaining, state, title, sub, emoji, weekGoal: settings.weeklyGoalKm, isWeekend: dayOfWeek(iso) >= 5 };
}

/** Los mensajes de Borja */
export function dailyMessage(state: DailyState, remaining: number, goal: number) {
  if (state === 'none') return { emoji: '👀', title: 'Hoy no has caminado, puto Xokas', sub: `Venga, que el objetivo son ${fmt(goal, goal % 1 ? 1 : 0)} km.` };
  if (state === 'partial')
    return { emoji: '🍑', title: 'Aprieta el culo, albondiguillas', sub: `Que te quedan ${fmt(remaining, remaining < 10 ? 1 : 0)} km para los ${fmt(goal, goal % 1 ? 1 : 0)}.` };
  return { emoji: '🏆', title: '¡Puto amo, Hércules, Maquiavelo, Perrosanxeeee!!', sub: `Objetivo de ${fmt(goal, goal % 1 ? 1 : 0)} km cumplido.` };
}
