import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { Session } from '../lib/types';
import { formatDuration, prettyDate, shortDate, weekStart, addDays } from '../lib/dates';
import { estimateKcal, fmt, startTime, totals } from '../lib/calc';
import { SessionForm } from './SessionForm';
import { Button, Card, H1, Label } from './ui';
import { C } from './theme';

export function HistoryScreen() {
  const { sessions, settings, updateSession, deleteSession } = useStore();
  const [editing, setEditing] = useState<Session | null>(null);

  const sorted = [...sessions].sort((a, b) => (b.date + (b.endTime ?? '99')).localeCompare(a.date + (a.endTime ?? '99')));
  const byWeek: Record<string, Session[]> = {};
  for (const s of sorted) (byWeek[weekStart(s.date)] ||= []).push(s);

  return (
    <>
      <ScrollView contentContainerStyle={s.wrap}>
        <H1>Historial</H1>
        <Text style={s.sub}>Toca una sesión para editarla.</Text>
        {Object.entries(byWeek).map(([w, list]) => {
          const t = totals(list, settings);
          return (
            <Card key={w}>
              <View style={s.weekHead}>
                <Label>
                  {shortDate(w)} – {shortDate(addDays(w, 6))}
                </Label>
                <Text style={s.weekTot}>
                  {fmt(t.km)} km · {formatDuration(t.minutes)}
                </Text>
              </View>
              {list.map((x) => (
                <Pressable key={x.id} onPress={() => setEditing(x)} style={({ pressed }) => [s.item, pressed && { opacity: 0.6 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTitle}>
                      {prettyDate(x.date)}
                      {x.endTime ? ` · ${startTime(x)}–${x.endTime}` : ''}
                    </Text>
                    <Text style={s.itemSub}>
                      {fmt(x.distanceKm, 2)} km · {formatDuration(x.minutes)} · {fmt(x.speedKmh)} km/h
                      {x.loadKg ? ` · 🎒${x.loadKg} kg` : ''}
                      {x.barefoot ? ' · 🦶' : ''}
                    </Text>
                    {x.notes ? <Text style={s.notes}>{x.notes}</Text> : null}
                  </View>
                  <Text style={s.kcal}>{Math.round(estimateKcal(x, settings))}{'\n'}<Text style={s.kcalU}>kcal</Text></Text>
                </Pressable>
              ))}
            </Card>
          );
        })}
        {sessions.length === 0 ? <Text style={s.sub}>Sin sesiones todavía.</Text> : null}
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={s.modalBg}>
          <ScrollView style={s.sheet} contentContainerStyle={{ gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={s.sheetTitle}>Editar sesión</Text>
            {editing ? <SessionForm key={editing.id} draft={editing} onChange={(d) => setEditing({ ...editing, ...d })} /> : null}
            <Button
              title="Guardar cambios"
              onPress={async () => {
                if (editing) await updateSession(editing);
                setEditing(null);
              }}
            />
            <Button title="Cancelar" variant="ghost" onPress={() => setEditing(null)} />
            <Button
              title="Borrar sesión"
              variant="danger"
              onPress={() =>
                Alert.alert('¿Borrar sesión?', 'No se puede deshacer.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: async () => {
                      if (editing) await deleteSession(editing.id);
                      setEditing(null);
                    },
                  },
                ])
              }
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 120 },
  sub: { color: C.sub, fontSize: 14, marginTop: -4 },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between' },
  weekTot: { color: C.lime, fontWeight: '800', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line, gap: 12 },
  itemTitle: { color: C.text, fontWeight: '700', fontSize: 15, textTransform: 'capitalize' },
  itemSub: { color: C.sub, fontSize: 13, marginTop: 3 },
  notes: { color: C.dim, fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  kcal: { color: C.orange, fontWeight: '800', fontSize: 18, textAlign: 'right' },
  kcalU: { color: C.dim, fontSize: 11, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: C.bg2, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, borderWidth: 1, borderColor: C.line },
  sheetTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
});
