import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Flame } from 'lucide-react-native';
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
import { dailyStatus } from '../lib/daily';
import { Button, Card, Chip, H1, Label, Ring, Segmented, StatTile } from './ui';
import { Heatmap, MiniLine, PaceLine, SplitBar, TapBars } from './charts';
import { SyncBadge } from './SyncBadge';
import { C, themed } from './theme';

const PERIODS: [Period, string][] = [
  ['week', 'Semana'],
  ['month', 'Mes'],
  ['3m', '3 meses'],
  ['year', 'Año'],
];
const PREV_LABEL: Record<Period, string> = { week: 'semana pasada', month: 'mes pasado', '3m': '3 meses anteriores', year: 'año pasado' };

type Props = { section: 'home' | 'stats'; onRecord: () => void; onOpenSettings: () => void };

export function Dashboard({ section, onRecord, onOpenSettings }: Props) {
  return section === 'home' ? <HomeSection onRecord={onRecord} onOpenSettings={onOpenSettings} /> : <StatsSection />;
}

function HomeSection({ onRecord, onOpenSettings }: { onRecord: () => void; onOpenSettings: () => void }) {
  const { sessions, settings, updateSettings } = useStore();
  const { width } = useWindowDimensions();
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
  const g = Number(goalDraft.replace(',', '.')) || 0;
  const dayColor = day.state === 'done' ? C.lime : day.state === 'partial' ? C.orange : C.danger;

  return (
    <ScrollView contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.date}>
            {DAY_NAMES[dayOfWeek(today)]}, {shortDate(today)}
          </Text>
          <Text style={s.hello}>
            {hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'}, {settings.userName}
          </Text>
        </View>
        {st > 0 ? (
          <View style={s.streak}>
            <Flame size={16} color={C.orange} strokeWidth={2} />
            <Text style={s.streakNum}>{st}</Text>
          </View>
        ) : null}
      </View>

      <Pressable onPress={day.state === 'done' ? undefined : onRecord}>
        <Card style={s.dayCard}>
          <View style={[s.dayBar, { backgroundColor: dayColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.dayTitle}>{day.title}</Text>
            <Text style={s.daySub}>{day.state === 'none' ? day.sub : `Hoy llevas ${fmt(day.todayKm, 2)} km. ${day.sub}`}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.dayKm}>{fmt(day.todayKm)}</Text>
            <Text style={s.dayKmSub}>de {fmt(day.goal, 0)} km</Text>
          </View>
        </Card>
      </Pressable>

      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <View style={s.rowBetween}>
          <Label>Esta semana</Label>
          <Text style={s.link} onPress={() => { setGoalDraft(String(goal).replace('.', ',')); setGoalOpen(true); }}>
            Cambiar objetivo
          </Text>
        </View>
        <Pressable onPress={() => { setGoalDraft(String(goal).replace('.', ',')); setGoalOpen(true); }}>
          <Ring progress={goal ? wk.km / goal : 0} center={fmt(wk.km)} caption={`de ${fmt(goal, goal % 1 ? 1 : 0)} km`} />
        </Pressable>
        <Text style={s.ringSub}>
          {remaining > 0 ? `Faltan ${fmt(remaining)} km · ${fmt(remaining / daysLeft)} km/día hasta el domingo` : 'Objetivo semanal cumplido'}
        </Text>
        <View style={s.miniStats}>
          <Mini label="Tiempo" value={formatDuration(wk.minutes)} />
          <Mini label="Kcal" value={fmt(wk.kcal, 0)} />
          <Mini label="Vel. media" value={`${fmt(wk.avgSpeed)} km/h`} />
        </View>
      </Card>

      <Card>
        <Label>Ritmo de la semana</Label>
        <PaceLine cumulative={weekCumulative(sessions, today)} goal={goal} width={chartW} />
      </Card>

      <Card>
        <View style={s.rowBetween}>
          <Label>Últimas sesiones</Label>
          <SyncBadge onPress={onOpenSettings} />
        </View>
        {[...sessions]
          .sort((a, b) => (b.date + (b.endTime ?? '99')).localeCompare(a.date + (a.endTime ?? '99')))
          .slice(0, 5)
          .map((x, i) => (
            <View key={x.id} style={[s.sess, i === 0 && { borderTopWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.sessTitle}>
                  {fmt(x.distanceKm, 2)} km · {formatDuration(x.minutes)}
                </Text>
                <Text style={s.sessSub}>
                  {prettyDate(x.date)} · {fmt(x.speedKmh)} km/h
                  {x.loadKg ? ` · ${x.loadKg} kg de carga` : ''}
                  {x.barefoot ? ' · descalzo' : ''}
                </Text>
              </View>
              <Text style={s.sessKcal}>{Math.round(estimateKcal(x, settings))} kcal</Text>
            </View>
          ))}
        {sessions.length === 0 ? <Text style={s.note}>Todavía no hay sesiones.</Text> : null}
      </Card>

      <Modal visible={goalOpen} transparent animationType="fade" onRequestClose={() => setGoalOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Objetivo semanal</Text>
            <Text style={s.daySub}>¿Cuántos km quieres caminar a la semana?</Text>
            <View style={s.goalRow}>
              <Pressable style={s.step} onPress={() => setGoalDraft(String(Math.max(1, g - 1)).replace('.', ','))}>
                <Text style={s.stepTxt}>−</Text>
              </Pressable>
              <TextInput value={goalDraft} onChangeText={setGoalDraft} keyboardType="decimal-pad" style={s.goalInput} selectTextOnFocus />
              <Pressable style={s.step} onPress={() => setGoalDraft(String(g + 1).replace('.', ','))}>
                <Text style={s.stepTxt}>+</Text>
              </Pressable>
            </View>
            <Text style={[s.daySub, { textAlign: 'center' }]}>
              ≈ {fmt(g / 5)} km/día entre semana · {fmt(g / 7)} km/día todos los días
            </Text>
            <View style={s.quick}>
              {[15, 20, 25, 30, 40, 50].map((v) => (
                <Chip key={v} label={`${v}`} active={g === v} onPress={() => setGoalDraft(String(v))} />
              ))}
            </View>
            <Button
              title="Guardar"
              onPress={() => {
                if (g > 0 && g < 1000) updateSettings({ weeklyGoalKm: g });
                setGoalOpen(false);
              }}
            />
            <Button title="Cancelar" variant="ghost" onPress={() => setGoalOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatsSection() {
  const { sessions, settings } = useStore();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('week');
  const today = todayISO();
  const chartW = width - 40 - 36;
  const goal = settings.weeklyGoalKm;
  const range = periodRange(period, today);
  const inRange = sessionsInRange(sessions, range.from, range.to);
  const cur = totals(inRange, settings);
  const prev = totals(sessionsInRange(sessions, range.prevFrom, range.prevTo), settings);
  const diff = prev.km ? ((cur.km - prev.km) / prev.km) * 100 : null;
  const bars = periodBars(sessions, period, today);
  const tipLabels = bars.keys.map((k) => (period === 'year' ? k : period === '3m' ? `Semana del ${shortDate(k)}` : prettyDate(k)));
  const series = weeklySeries(sessions, 12, settings);
  const rec = records(sessions, settings);

  return (
    <ScrollView contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
      <H1>Progreso</H1>
      <Segmented value={period} options={PERIODS} onChange={setPeriod} />

      <View style={s.grid}>
        <StatTile
          label="Distancia"
          value={fmt(cur.km)}
          unit="km"
          sub={diff !== null ? `${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff), 0)}% vs ${PREV_LABEL[period]}` : `Sin datos del ${PREV_LABEL[period]}`}
        />
        <StatTile label="Tiempo" value={formatDuration(cur.minutes)} sub={`${cur.sessions} sesiones · ${cur.activeDays} días`} />
        <StatTile label="Kcal estimadas" value={fmt(cur.kcal, 0)} sub={cur.activeDays ? `${fmt(cur.kcal / cur.activeDays, 0)} por día activo` : undefined} />
        <StatTile label="Velocidad media" value={fmt(cur.avgSpeed)} unit="km/h" sub={`${fmt(cur.kmLoaded)} km con carga`} />
      </View>

      <Card>
        <Label>{period === 'week' ? 'Km por día' : period === 'month' ? 'Km por día del mes' : period === '3m' ? 'Km por semana' : 'Km por mes'}</Label>
        <TapBars values={bars.values} labels={bars.labels} tipLabels={tipLabels} highlight={bars.highlight} width={chartW} goalLine={period === '3m' ? goal : undefined} />
        {period === '3m' ? <Text style={s.note}>La línea marca tu objetivo semanal.</Text> : null}
      </Card>

      <Card>
        <Label>Cómo has caminado</Label>
        <Text style={s.splitTitle}>Calzado, por tiempo</Text>
        <SplitBar
          parts={[
            { label: 'Descalzo', value: cur.minutesBarefoot, color: C.lime },
            { label: 'Zapatillas', value: inRange.filter((x) => x.barefoot === false).reduce((a, x) => a + x.minutes, 0), color: C.cyan },
            { label: 'Sin dato', value: inRange.filter((x) => x.barefoot === null).reduce((a, x) => a + x.minutes, 0), color: C.line },
          ]}
        />
        <Text style={[s.splitTitle, { marginTop: 16 }]}>Carga, por km</Text>
        <SplitBar
          parts={[
            { label: 'Con carga', value: cur.kmLoaded, color: C.cyan },
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
          <Label>Récords</Label>
          <Record label="Mejor día" value={`${fmt(rec.bestDay[1], 2)} km`} sub={prettyDate(rec.bestDay[0])} first />
          <Record label="Mejor semana" value={`${fmt(rec.bestWeek[1])} km`} sub={`Semana del ${shortDate(rec.bestWeek[0])}`} />
          <Record label="Sesión más larga" value={formatDuration(rec.longest.minutes)} sub={`${fmt(rec.longest.distanceKm, 2)} km · ${prettyDate(rec.longest.date)}`} />
          {rec.fastest ? <Record label="Más rápida" value={`${fmt(rec.fastest.speedKmh)} km/h`} sub={prettyDate(rec.fastest.date)} /> : null}
          {rec.heaviest.loadKg > 0 ? (
            <Record label="Más carga" value={`${rec.heaviest.loadKg} kg`} sub={`${fmt(rec.heaviest.distanceKm, 2)} km · ${prettyDate(rec.heaviest.date)}`} />
          ) : null}
          <Record label="Más kcal" value={`${fmt(estimateKcal(rec.mostKcal, settings), 0)} kcal`} sub={prettyDate(rec.mostKcal.date)} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.miniVal}>{value}</Text>
      <Text style={s.miniLbl}>{label}</Text>
    </View>
  );
}

function Record({ label, value, sub, first }: { label: string; value: string; sub: string; first?: boolean }) {
  return (
    <View style={[s.rec, first && { borderTopWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.recLabel}>{label}</Text>
        <Text style={s.recSub}>{sub}</Text>
      </View>
      <Text style={s.recVal}>{value}</Text>
    </View>
  );
}

const s = themed(() =>
  StyleSheet.create({
    wrap: { padding: 20, gap: 14, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    hello: { color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
    date: { color: C.sub, fontSize: 13, marginBottom: 2, textTransform: 'capitalize' },
    streak: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.line },
    streakNum: { color: C.text, fontSize: 15, fontWeight: '700' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', alignSelf: 'stretch' },
    link: { color: C.lime, fontSize: 13, fontWeight: '600' },
    dayCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
    dayBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    dayTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
    daySub: { color: C.sub, fontSize: 13, marginTop: 3, lineHeight: 18 },
    dayKm: { color: C.text, fontSize: 22, fontWeight: '700' },
    dayKmSub: { color: C.dim, fontSize: 11 },
    ringSub: { color: C.sub, fontSize: 13, marginTop: 12, textAlign: 'center' },
    miniStats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
    miniVal: { color: C.text, fontSize: 15, fontWeight: '700' },
    miniLbl: { color: C.dim, fontSize: 11, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    note: { color: C.dim, fontSize: 12, marginTop: 10 },
    splitTitle: { color: C.text, fontWeight: '600', fontSize: 13, marginBottom: 8 },
    sess: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.line },
    sessTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
    sessSub: { color: C.sub, fontSize: 12, marginTop: 2 },
    sessKcal: { color: C.sub, fontSize: 13, fontWeight: '600' },
    rec: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.line },
    recLabel: { color: C.text, fontWeight: '600', fontSize: 14 },
    recSub: { color: C.dim, fontSize: 12, marginTop: 1 },
    recVal: { color: C.text, fontWeight: '700', fontSize: 15 },
    modalBg: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', padding: 24 },
    modal: { backgroundColor: C.card, borderRadius: 24, padding: 22, gap: 14, borderWidth: 1, borderColor: C.line },
    modalTitle: { color: C.text, fontSize: 20, fontWeight: '700' },
    goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    step: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
    stepTxt: { color: C.text, fontSize: 24, fontWeight: '500' },
    goalInput: { color: C.text, fontSize: 44, fontWeight: '700', minWidth: 110, textAlign: 'center' },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  }),
);
