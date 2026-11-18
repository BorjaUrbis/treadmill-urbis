import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { Session, Settings } from '../lib/types';
import { dailyStatus } from '../lib/daily';
import { TreadmillWidget, WidgetData } from './TreadmillWidget';

export const WIDGET_NAME = 'Treadmill';

export function widgetData(sessions: Session[], settings: Settings): WidgetData {
  const d = dailyStatus(sessions, settings);
  return { todayKm: d.todayKm, weekKm: d.weekKm, goal: d.goal, weekGoal: d.weekGoal, title: d.title, emoji: d.emoji, state: d.state };
}

/** Repinta el widget de la pantalla de inicio (si hay alguno puesto) */
export async function refreshWidget(sessions: Session[], settings: Settings) {
  if (Platform.OS !== 'android') return;
  try {
    const data = widgetData(sessions, settings);
    await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => <TreadmillWidget d={data} /> });
  } catch {
    // sin widget o módulo no disponible: no pasa nada
  }
}
