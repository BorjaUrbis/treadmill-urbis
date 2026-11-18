import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../lib/store';
import { addDays, DAY_SHORT, dayOfWeek, formatDuration, prettyDate, shortDate, todayISO, weekStart, DAY_NAMES } from '../lib/dates';
import { bestDayKm, estimateKcal, fmt, kmByDay, kmLastWeeks, streak, totals, weekSessions } from '../lib/calc';
import { Bars, Card, Label, Ring, StatTile } from './ui';
import { C } from './theme';

export function Dashboard({ onRecord }: { onRecord: () => void }) {
  const { sessions, settings } = useStore();
  const { width } = useWindowDimensions();
  const today = todayISO();
  const wk = totals(weekSessions(sessions, today), settings);
  const last = totals(weekSessions(sessions, addDays(today, -7)), settings);
  const all = totals(sessions, settings);
  const st = streak(sessions);
  const best = bestDayKm(sessions);
  const byDay = kmByDay(sessions, today);
  const weeks = kmLastWeeks(sessions, 8);
  const todayKm = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.distanceKm, 0);
  const isWeekday = dayOfWeek(today) < 5;
  const goal = settings.weeklyGoalKm;
  const remaining = Math.max(0, goal - wk.km);
  const daysLeft = 7 - dayOfWeek(today);
  const diff = last.km ? ((wk.km - last.km) / last.km) * 100 : null;
  const chartW = width - 40 - 36;
  const hour = new Date().getHours();

  return (
    <ScrollView contentContainerStyle={st_.wrap} showsVerticalScrollIndicator={false}>
      <View style={st_.header}>
        <View>
          <Text style={st_.hello}>{hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'}, {settings.userName}</Text>
          <Text style={st_.date}>
            {DAY_NAMES[dayOfWeek(today)]}, {shortDate(today)}
          </Text>
        </View>
        <View style={st_.streak}>
          <Text style={st_.streakNum}>🔥 {st}</Text>
          <Text style={st_.streakLbl}>racha</Text>
        </View>
      </View>

      {todayKm === 0 ? (
        <Pressable onPress={onRecord}>
          <LinearGradient colors={isWeekday ? ['#3A1420', '#1A0F18'] : ['#1A2233', '#121722']} style={st_.alert}>
            <Text style={st_.alertEmoji}>{isWeekday ? '👀' : '😎'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st_.alertTitle}>{isWeekday ? 'Hoy todavía no has caminado' : 'Es finde, pero si te apetece...'}</Text>
              <Text style={st_.alertSub}>
                {isWeekday ? `Ey, ¿qué onda? Toca subirse a la cinta. ` : ''}Toca aquí para registrar.
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      ) : (
        <LinearGradient colors={['#18300F', '#0F1A10']} style={st_.alert}>
          <Text style={st_.alertEmoji}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={st_.alertTitle}>Hoy llevas {fmt(todayKm, 2)} km</Text>
            <Text style={st_.alertSub}>Bien ahí. Hoy no hay aviso.</Text>
          </View>
        </LinearGradient>
      )}

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Label>Esta semana</Label>
        <Ring progress={goal ? wk.km / goal : 0} center={fmt(wk.km)} caption={`de ${fmt(goal, 0)} km`} />
        <Text style={st_.ringSub}>
          {remaining > 0
            ? `Te faltan ${fmt(remaining)} km · ${fmt(remaining / daysLeft)} km/día hasta el domingo`
            : '🎉 ¡Objetivo semanal cumplido!'}
        </Text>
        {diff !== null ? (
          <Text style={[st_.diff, { color: diff >= 0 ? C.lime : C.pink }]}>
            {diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(diff), 0)}% vs semana pasada ({fmt(last.km)} km)
          </Text>
        ) : null}
      </Card>

      <View style={st_.grid}>
        <StatTile label="Tiempo" value={formatDuration(wk.minutes)} />
        <StatTile label="Kcal estimadas" value={fmt(wk.kcal, 0)} color={C.orange} />
        <StatTile label="Velocidad media" value={fmt(wk.avgSpeed)} unit="km/h" color={C.cyan} />
        <StatTile label="Sesiones" value={String(wk.sessions)} sub={`${wk.activeDays} días activos`} />
      </View>

      <Card>
        <Label>Km por día</Label>
        <Bars values={byDay} labels={DAY_SHORT} highlight={dayOfWeek(today)} width={chartW} />
      </Card>

      <Card>
        <Label>Últimas 8 semanas</Label>
        <Bars values={weeks.map((w) => w.km)} labels={weeks.map((w) => shortDate(w.week).split(' ')[0])} highlight={7} width={chartW} goalLine={goal} />
        <Text style={st_.note}>La línea gris es tu objetivo semanal.</Text>
      </Card>

      <View style={st_.grid}>
        <StatTile label="Con carga" value={fmt(wk.kmLoaded)} unit="km" color={C.violet} sub="esta semana" />
        <StatTile label="Descalzo" value={wk.minutes ? `${Math.round((wk.minutesBarefoot / wk.minutes) * 100)}%` : '—'} color={C.pink} sub="del tiempo" />
      </View>

      <Card>
        <Label>Histórico</Label>
        <View style={st_.row}>
          <Big label="Km totales" value={fmt(all.km)} />
          <Big label="Horas" value={fmt(all.minutes / 60)} />
          <Big label="Kcal" value={fmt(all.kcal, 0)} />
        </View>
        {best ? <Text style={st_.note}>🏆 Mejor día: {fmt(best.km, 2)} km ({prettyDate(best.date)})</Text> : null}
      </Card>

      <Card>
        <Label>Últimas sesiones</Label>
        {[...sessions]
          .sort((a, b) => (b.date + (b.endTime ?? '99')).localeCompare(a.date + (a.endTime ?? '99')))
          .slice(0, 4)
          .map((s) => (
            <View key={s.id} style={st_.sess}>
              <View style={[st_.dot, { backgroundColor: s.loadKg > 0 ? C.violet : C.lime }]} />
              <View style={{ flex: 1 }}>
                <Text style={st_.sessTitle}>
                  {fmt(s.distanceKm, 2)} km · {formatDuration(s.minutes)} · {fmt(s.speedKmh)} km/h
                </Text>
                <Text style={st_.sessSub}>
                  {prettyDate(s.date)}
                  {s.loadKg ? ` · 🎒 ${s.loadKg} kg` : ''}
                  {s.barefoot ? ' · 🦶 descalzo' : ''} · ~{Math.round(estimateKcal(s, settings))} kcal
                </Text>
              </View>
            </View>
          ))}
        {sessions.length === 0 ? <Text style={st_.note}>Todavía no hay sesiones.</Text> : null}
      </Card>
      <Text style={[st_.note, { textAlign: 'center', marginBottom: 20 }]}>Semana del {shortDate(weekStart(today))}</Text>
    </ScrollView>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: C.sub, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const st_ = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
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
  diff: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  note: { color: C.dim, fontSize: 12, marginTop: 10 },
  sess: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sessTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  sessSub: { color: C.sub, fontSize: 12, marginTop: 2 },
});

