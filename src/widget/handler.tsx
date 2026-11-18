import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadSessions, loadSettings } from '../lib/storage';
import { TreadmillWidget } from './TreadmillWidget';
import { widgetData } from './update';

/** Se ejecuta en segundo plano cuando Android pide pintar el widget (al ponerlo, al redimensionarlo, cada 30 min) */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const [sessions, settings] = await Promise.all([loadSessions(), loadSettings()]);
  const { width, height } = props.widgetInfo;
  props.renderWidget(<TreadmillWidget d={widgetData(sessions, settings)} width={width} height={height} />);
}
