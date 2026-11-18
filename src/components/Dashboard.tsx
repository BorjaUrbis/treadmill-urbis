import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../lib/store';
import { addDays, dayOfWeek, formatDuration, prettyDate, shortDate, todayISO, weekStart, DAY_NAMES } from '../lib/dates';
import {
  estimateKcal,
  fmt,
  kmPerDay,
  Period,
  periodBars,
  periodRange,
  records,
  sessionsInRange,
  streak,
  totals,
  weekCumulative,
  weeklySeries,
  weekSessions,
} from '../lib/calc';
import { Button, Card, Chip, Label, Ring, StatTile } from './ui';
import { dailyStatus } from '../lib/daily';
import { Heatmap, MiniLine, PaceLine, SplitBar, TapBars } from './charts';
import { SyncBadge } from './SyncBadge';
import { C } from './theme';

const PERIODS: [Period, string][] = [
  ['week', 'Semana'],
  ['month', 'Mes'],
  ['3m', '3 meses'],
  ['year', 'Año'],
];
const PREV_LABEL: Record<Period, string> = { week: 'semana pasada', month: 'mes pasado', '3m': '3 meses anteriores', year: 'año pasado' };

export function Dashboard({ onRecord, onOpenSettings }: { onRecord: () => void; onOpenSettings: () => void }) {
  const { sessions, settings, updateSettings } = useStore();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('week');
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  const today = todayISO();
  const chartW = width - 40 - 36;
  const goal = settings.weeklyGoalKm;
  const wk = totals(weekSessions(sessions, today), settings);
  const st = streak(sessions);
  const day = dailyStatus(sessions, settings, today);
  const remaining = Math.max(0, goal - wk.km);
  const daysLeft = 7 - dayOfWeek(today);
  const hour = new Date().getHours();

  const range = periodRange(period, today);
  const inRange = sessionsInRange(sessions, range.from, range.to);
  const cur = totals(inRange, settings);
  const prev = totals(sessionsInRange(sessions, range.prevFrom, range.prevTo), settings);
  const diff = prev.km ? ((cur.km - prev.km) / prev.km) * 100 : null;
  const bars = periodBars(sessions, period, today);
  const tipLabels = bars.keys.map((k) => (period === 'year' ? k : period === '3m' ? `Semana del ${shortDate(k)}` : prettyDate(k)));
  const series = weeklySeries(sessions, 12, settings);
  const rec = records(sessions, settings);
  const periodName = PERIODS.find((p) => p[0] === period)![1].toLowerCase();
  const g = Number(goalDraft.replace(',', '.')) || 0;

  const openGoal = () => {
    setGoalDraft(String(goal).replace('.', ','));
    setGoalOpen(true);
  };
  const saveGoal = () => {
    if (g > 0 && g < 1000) updateSettings({ weeklyGoalKm: g });
    setGoalOpen(false);
  };

  return (
    <ScrollView contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.hello}>
            {hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'}, {settings.userName}
          </Text>
          <Text style={s.date}>
            {DAY_NAMES[dayOfWeek(today)]}, {shortDate(today)}
          </Text>
        </View>
        <View style={s.streak}>
          <Text style={s.streakNum}>🔥 {st}</Text>
          <Text style={s.streakLbl}>racha</Text>
        </View>
      </View>
      <View style={{ alignSelf: 'flex-start' }}>
        <SyncBadge onPress={onOpenSettings} />
      </View>

      <Pressable onPress={day.state === 'done' ? undefined : onRecord}>
        <LinearGradient
          colors={day.state === 'done' ? ['#18300F', '#0F1A10'] : day.state === 'partial' ? ['#3A2410', '#1A130C'] : ['#3A1420', '#1A0F18']}
          style={s.alert}
        >
          <Text style={s.alertEmoji}>{day.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>{day.title}</Text>
            <Text style={s.alertSub}>
              {day.state === 'none' ? day.sub : `Hoy llevas ${fmt(day.todayKm, 2)} km. ${day.sub}`}
              {day.state === 'done' ? '' : ' Toca para registrar.'}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Label>Objetivo de la semana</Label>
        <Pressable onPress={openGoal}>
          <Ring progress={goal ? wk.km / goal : 0} center={fmt(wk.km)} caption={`de ${fmt(goal, goal % 1 ? 1 : 0)} km ✏️`} />
        </Pressable>
        <Text style={s.ringSub}>
          {remaining > 0 ? `Te faltan ${fmt(remaining)} km · ${fmt(remaining / daysLeft)} km/día hasta el domingo` : '🎉 ¡Objetivo semanal cumplido!'}
        </Text>
        <Text style={s.tapHint}>Toca el anillo para cambiar tu objetivo</Text>
      </Card>

      <Card>
        <Label>Ritmo de la semana</Label>
        <PaceLine cumulative={weekCumulative(sessions, today)} goal={goal} width={chartW} />
      </Card>

      <View style={s.periods}>
        {PERIODS.map(([p, l]) => (
          <Chip key={p} label={l} active={period === p} onPress={() => setPeriod(p)} />
        ))}
      </View>

      <View style={s.grid}>
        <StatTile
          label="Km"
          value={fmt(cur.km)}
          color={C.lime}
          sub={diff !== null ? `${diff >= 0 ? '▲' : '▼'} ${fmt(Math.abs(diff), 0)}% vs ${PREV_LABEL[period]}` : `sin datos del ${PREV_LABEL[period]}`}
        />
        <StatTile label="Tiempo" value={formatDuration(cur.minutes)} sub={`${cur.sessions} sesiones · ${cur.activeDays} días`} />
        <StatTile label="Kcal estimadas" value={fmt(cur.kcal, 0)} color={C.orange} sub={cur.activeDays ? `${fmt(cur.kcal / cur.activeDays, 0)} por día activo` : undefined} />
        <StatTile label="Velocidad media" value={fmt(cur.avgSpeed)} unit="km/h" color={C.cyan} sub={`${fmt(cur.kmLoaded)} km con carga`} />
      </View>

      <Card>
        <Label>{period === 'week' ? 'Km por día' : period === 'month' ? 'Km por día del mes' : period === '3m' ? 'Km por semana' : 'Km por mes'}</Label>
        <TapBars values={bars.values} labels={bars.labels} tipLabels={tipLabels} highlight={bars.highlight} width={chartW} goalLine={period === '3m' ? goal : undefined} />
        {period === '3m' ? <Text style={s.note}>La línea gris es tu objetivo semanal.</Text> : null}
      </Card>

      <Card>
        <Label>Cómo has caminado ({periodName})</Label>
        <Text style={s.splitTitle}>Calzado (por tiempo)</Text>
        <SplitBar
          parts={[
            { label: 'Descalzo', value: cur.minutesBarefoot, color: C.pink },
            { label: 'Zapatillas', value: inRange.filter((x) => x.barefoot === false).reduce((a, x) => a + x.minutes, 0), color: C.cyan },
            { label: 'Sin dato', value: inRange.filter((x) => x.barefoot === null).reduce((a, x) => a + x.minutes, 0), color: C.dim },
          ]}
        />
        <Text style={[s.splitTitle, { marginTop: 16 }]}>Carga (por km)</Text>
        <SplitBar
          parts={[
            { label: 'Con carga', value: cur.kmLoaded, color: C.violet },
            { label: 'Sin carga', value: cur.km - cur.kmLoaded, color: C.lime },
          ]}
        />
      </Card>

      <Card>
        <Label>Constancia</Label>
        <Heatmap kmByDay={kmPerDay(sessions)} weeks={16} lastWeekStart={weekStart(today)} addDays={addDays} width={chartW} />
      </Card>

      <Card>
        <Label>Velocidad media por semana</Label>
        <MiniLine values={series.map((x) => x.avgSpeed)} labels={series.map((x) => shortDate(x.week).split(' ')[0])} width={chartW} unit="km/h" />
      </Card>

      {rec ? (
        <Card>
          <Label>Récords 🏆</Label>
          <Record icon="📅" label="Mejor día" value={`${fmt(rec.bestDay[1], 2)} km`} sub={prettyDate(rec.bestDay[0])} />
          <Record icon="🗓️" label="Mejor semana" value={`${fmt(rec.bestWeek[1])} km`} sub={`semana del ${shortDate(rec.bestWeek[0])}`} />
          <Record icon="⏱️" label="Sesión más larga" value={formatDuration(rec.longest.minutes)} sub={`${fmt(rec.longest.distanceKm, 2)} km · ${prettyDate(rec.longest.date)}`} />
          {rec.fastest ? <Record icon="⚡" label="Más rápida" value={`${fmt(rec.fastest.speedKmh)} km/h`} sub={prettyDate(rec.fastest.date)} /> : null}
          {rec.heaviest.loadKg > 0 ? (
            <Record icon="🎒" label="Más carga" value={`${rec.heaviest.loadKg} kg`} sub={`${fmt(rec.heaviest.distanceKm, 2)} km · ${prettyDate(rec.heaviest.date)}`} />
          ) : null}
          <Record icon="🔥" label="Más kcal" value={`${fmt(estimateKcal(rec.mostKcal, settings), 0)} kcal`} sub={prettyDate(rec.mostKcal.date)} />
        </Card>
      ) : null}

      <Card>
        <Label>Últimas sesiones</Label>
        {[...sessions]
          .sort((a, b) => (b.date + (b.endTime ?? '99')).localeCompare(a.date + (a.endTime ?? '99')))
          .slice(0, 4)
          .map((x) => (
            <View key={x.id} style={s.sess}>
              <View style={[s.dot, { backgroundColor: x.loadKg > 0 ? C.violet : C.lime }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.sessTitle}>
                  {fmt(x.distanceKm, 2)} km · {formatDuration(x.minutes)} · {fmt(x.speedKmh)} km/h
                </Text>
                <Text style={s.sessSub}>
                  {prettyDate(x.date)}
                  {x.loadKg ? ` · 🎒 ${x.loadKg} kg` : ''}
                  {x.barefoot ? ' · 🦶 descalzo' : ''} · ~{Math.round(estimateKcal(x, settings))} kcal
                </Text>
              </View>
            </View>
          ))}
        {sessions.length === 0 ? <Text style={s.note}>Todavía no hay sesiones.</Text> : null}
      </Card>

      <Modal visible={goalOpen} transparent animationType="fade" onRequestClose={() => setGoalOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Objetivo semanal</Text>
            <Text style={s.alertSub}>¿Cuántos km quieres caminar a la semana?</Text>
            <View style={s.goalRow}>
              <Pressable style={s.step} onPress={() => setGoalDraft(String(Math.max(1, g - 1)).replace('.', ','))}>
                <Text style={s.stepTxt}>−</Text>
              </Pressable>
              <TextInput value={goalDraft} onChangeText={setGoalDraft} keyboardType="decimal-pad" style={s.goalInput} selectTextOnFocus />
              <Pressable style={s.step} onPress={() => setGoalDraft(String(g + 1).replace('.', ','))}>
                <Text style={s.stepTxt}>+</Text>
              </Pressable>
            </View>
            <Text style={[s.alertSub, { textAlign: 'center' }]}>
              ≈ {fmt(g / 5)} km/día entre semana · {fmt(g / 7)} km/día todos los días
            </Text>
            <View style={s.quick}>
              {[15, 20, 25, 30, 40, 50].map((v) => (
                <Chip key={v} label={`${v} km`} active={g === v} onPress={() => setGoalDraft(String(v))} />
              ))}
            </View>
            <Button title="Guardar objetivo" onPress={saveGoal} />
            <Button title="Cancelar" variant="ghost" onPress={() => setGoalOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Record({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <View style={s.rec}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.recLabel}>{label}</Text>
        <Text style={s.recSub}>{sub}</Text>
      </View>
      <Text style={s.recVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { color: C.text, fontSize: 24, fontWeight: '800' },
  date: { color: C.sub, fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
  streak: { alignItems: 'center', backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.line },
  streakNum: { color: C.orange, fontSize: 20, fontWeight: '800' },
  streakLbl: { color: C.sub, fontSize: 11 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: C.line },
  alertEmoji: { fontSize: 30 },
  alertTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  alertSub: { color: C.sub, fontSize: 13, marginTop: 2 },
  ringSub: { color: C.sub, fontSize: 13, marginTop: 14, textAlign: 'center' },
  tapHint: { color: C.dim, fontSize: 11, marginTop: 6 },
  periods: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  note: { color: C.dim, fontSize: 12, marginTop: 10 },
  splitTitle: { color: C.text, fontWeight: '700', marginBottom: 8 },
  sess: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sessTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  sessSub: { color: C.sub, fontSize: 12, marginTop: 2 },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  recLabel: { color: C.text, fontWeight: '700', fontSize: 14 },
  recSub: { color: C.dim, fontSize: 12 },
  recVal: { color: C.lime, fontWeight: '800', fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: C.bg2, borderRadius: 26, padding: 22, gap: 14, borderWidth: 1, borderColor: C.line },
  modalTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  step: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: C.text, fontSize: 26, fontWeight: '700' },
  goalInput: { color: C.lime, fontSize: 44, fontWeight: '800', minWidth: 110, textAlign: 'center' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
});
