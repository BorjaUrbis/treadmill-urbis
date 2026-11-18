import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { Session, Settings } from '../lib/types';
import { dailyStatus } from '../lib/daily';
import { kmByDay, streak, totals, weekSessions } from '../lib/calc';
import { dayOfWeek, todayISO } from '../lib/dates';
import { TreadmillWidget, WidgetData } from './TreadmillWidget';

export const WIDGET_NAME = 'Treadmill';

export function widgetData(sessions: Session[], settings: Settings): WidgetData {
  const today = todayISO();
  const d = dailyStatus(sessions, settings, today);
  return {
    todayKm: d.todayKm,
    weekKm: d.weekKm,
    goal: d.goal,
    weekGoal: d.weekGoal,
    title: d.title,
    sub: d.sub,
    emoji: d.emoji,
    state: d.state,
    days: kmByDay(sessions, today),
    dayIndex: dayOfWeek(today),
    streak: streak(sessions),
    weekMinutes: totals(weekSessions(sessions, today), settings).minutes,
  };
}

/** Repinta el widget de la pantalla de inicio (si hay alguno puesto) */
export async function refreshWidget(sessions: Session[], settings: Settings) {
  if (Platform.OS !== 'android') return;
  try {
    const data = widgetData(sessions, settings);
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: (info) => <TreadmillWidget d={data} width={info.width} height={info.height} />,
    });
  } catch {
    // sin widget o módulo no disponible: no pasa nada
  }
}
