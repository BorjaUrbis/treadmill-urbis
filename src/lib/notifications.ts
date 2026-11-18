import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, dayOfWeek, fromISODate, todayISO, weekStart } from './dates';
import { fmt, streak, totals, weekSessions } from './calc';
import { Session, Settings } from './types';

const CHANNEL = 'recordatorios';
const DAYS_AHEAD = 30;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Recordatorios de caminar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#C6FF3D',
    });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

const NUDGES: ((km: string, goal: string, st: number) => [string, string])[] = [
  (km) => ['Ey, ¿qué onda? 👀', `Hoy 0 km en la cinta. Esta semana llevas ${km} km. Venga, aunque sea media horita.`],
  (km, goal) => ['La cinta te echa de menos 🥲', `Vas por ${km} de ${goal} km esta semana. Hoy toca sumar.`],
  (_, __, st) =>
    st > 1
      ? ['¡Que se te rompe la racha! 🔥', `Llevas ${st} días seguidos. No lo tires hoy, sube a la cinta.`]
      : ['Hoy no has caminado 🚶‍♂️', 'Ponte un podcast y tira 3 km. Te lo vas a agradecer.'],
  (km) => ['La cinta no se camina sola 😏', `Hoy nada todavía. Semana: ${km} km. Dale.`],
  (km, goal) => ['Recordatorio Treadmill Urbis', `Sin sesión hoy. Llevas ${km} de ${goal} km esta semana.`],
];

/**
 * Programa los avisos de los próximos días. Se llama cada vez que cambian
 * las sesiones o los ajustes: los días que ya tienen sesión no llevan aviso.
 */
export async function rescheduleReminders(sessions: Session[], settings: Settings) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const today = todayISO();
  const days = new Set(sessions.map((s) => s.date));
  const now = Date.now();
  const wk = totals(weekSessions(sessions, today), settings);
  const st = streak(sessions);
  const km = fmt(wk.km);
  const goal = fmt(settings.weeklyGoalKm, 0);

  if (settings.remindersEnabled) {
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const iso = addDays(today, i);
      if (days.has(iso)) continue;
      if (!settings.weekendReminders && dayOfWeek(iso) >= 5) continue;
      const when = fromISODate(iso);
      when.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
      if (when.getTime() <= now + 30_000) continue;
      // Para días de otras semanas, los km de "esta semana" serían 0.
      const sameWeek = weekStart(iso) === weekStart(today);
      const [title, body] = NUDGES[i % NUDGES.length](sameWeek ? km : '0', goal, i === 0 ? st : 0);
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { kind: 'reminder', date: iso } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      });
    }
  }

  if (settings.weeklySummary) {
    const sunday = addDays(weekStart(today), 6);
    const when = fromISODate(sunday);
    when.setHours(21, 0, 0, 0);
    if (when.getTime() > now) {
      const pct = settings.weeklyGoalKm ? Math.round((wk.km / settings.weeklyGoalKm) * 100) : 0;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Resumen de la semana: ${km} km 📊`,
          body: `${wk.sessions} sesiones · ${Math.round(wk.minutes)} min · ~${Math.round(wk.kcal)} kcal · ${pct}% del objetivo. Abre la app para ver el detalle.`,
          data: { kind: 'summary' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      });
    }
  }
}

export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Ey, ¿qué onda? 👀', body: 'Así te llegarán los avisos de Treadmill Urbis.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CHANNEL },
  });
}
