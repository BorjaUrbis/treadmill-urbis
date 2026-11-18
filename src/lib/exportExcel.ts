import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { addDays, fromISODate, todayISO, weekStart } from './dates';
import { estimateKcal, startTime, totals, sessionsInRange } from './calc';
import { Session, Settings } from './types';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function exportExcel(sessions: Session[], settings: Settings) {
  const sorted = [...sessions].sort((a, b) => (a.date + (a.endTime ?? '')).localeCompare(b.date + (b.endTime ?? '')));

  const registro = sorted.map((s) => ({
    Fecha: fromISODate(s.date),
    'Hora inicio': startTime(s) ?? '',
    'Hora fin': s.endTime ?? '',
    'Tiempo (min)': s.minutes,
    'Velocidad (km/h)': s.speedKmh,
    'Distancia (km)': s.distanceKm,
    'Calorías pantalla (kcal)': s.kcalScreen ?? '',
    'Kcal estimadas': Math.round(estimateKcal(s, settings)),
    Descalzo: s.barefoot === null ? '' : s.barefoot ? 'Sí' : 'No',
    'Peso extra (kg)': s.loadKg,
    'Semana (lunes)': fromISODate(weekStart(s.date)),
    Notas: s.notes,
  }));

  const weeks: Record<string, true> = {};
  sorted.forEach((s) => (weeks[weekStart(s.date)] = true));
  const resumen = Object.keys(weeks)
    .sort()
    .map((w) => {
      const t = totals(sessionsInRange(sessions, w, addDays(w, 6)), settings);
      return {
        'Semana (lunes)': fromISODate(w),
        'Hasta (domingo)': fromISODate(addDays(w, 6)),
        Sesiones: t.sessions,
        Minutos: Math.round(t.minutes),
        Horas: r1(t.minutes / 60),
        Km: r2(t.km),
        'Kcal estimadas': Math.round(t.kcal),
        'Vel. media (km/h)': r1(t.avgSpeed),
        'Min. descalzo': Math.round(t.minutesBarefoot),
        'Km con carga': r2(t.kmLoaded),
        'Objetivo (km)': settings.weeklyGoalKm,
        '% objetivo': settings.weeklyGoalKm ? Math.round((t.km / settings.weeklyGoalKm) * 100) : 0,
      };
    });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(registro, { cellDates: true, dateNF: 'dd/mm/yyyy' });
  ws1['!cols'] = [12, 10, 9, 11, 15, 13, 20, 14, 9, 14, 14, 40].map((wch) => ({ wch }));
  const ws2 = XLSX.utils.json_to_sheet(resumen, { cellDates: true, dateNF: 'dd/mm/yyyy' });
  ws2['!cols'] = [14, 14, 9, 9, 7, 8, 14, 16, 13, 13, 13, 11].map((wch) => ({ wch }));
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Ajustes'],
    ['Peso corporal (kg)', settings.bodyWeightKg],
    ['Inclinación (%)', settings.inclinePct],
    ['Objetivo semanal (km)', settings.weeklyGoalKm],
    [],
    ['Kcal estimadas: ecuación de marcha del ACSM, VO2 = 0,1·v + 1,8·v·pendiente + 3,5 (ml/kg/min, v en m/min),'],
    ['multiplicada por (peso corporal + carga) y 5 kcal por litro de O2. Gasto bruto aproximado.'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Registro');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen semanal');
  XLSX.utils.book_append_sheet(wb, ws3, 'Ajustes');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const file = new File(Paths.cache, `Treadmill_Urbis_${todayISO()}.xlsx`);
  if (file.exists) file.delete();
  file.create();
  await file.write(new Uint8Array(out));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Exportar Excel',
  });
}
