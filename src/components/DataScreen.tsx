import React, { memo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../lib/store';
import { Session } from '../lib/types';
import { fromISODate, toISODate, todayISO } from '../lib/dates';
import { completeTriad, estimateKcal, fmt, startTime, totals } from '../lib/calc';
import { SessionForm } from './SessionForm';
import { Button, H1 } from './ui';
import { C } from './theme';
import { SyncBadge } from './SyncBadge';

type Col = { key: string; title: string; w: number; kind: 'num' | 'text' | 'calc' | 'toggle' | 'date' | 'time' };

const COLS: Col[] = [
  { key: 'date', title: 'Fecha', w: 92, kind: 'date' },
  { key: 'start', title: 'Inicio', w: 62, kind: 'calc' },
  { key: 'endTime', title: 'Fin', w: 64, kind: 'time' },
  { key: 'minutes', title: 'Min', w: 58, kind: 'num' },
  { key: 'distanceKm', title: 'Km', w: 62, kind: 'num' },
  { key: 'speedKmh', title: 'km/h', w: 58, kind: 'num' },
  { key: 'kcalScreen', title: 'Kcal pant.', w: 72, kind: 'num' },
  { key: 'kcalEst', title: 'Kcal est.', w: 70, kind: 'calc' },
  { key: 'loadKg', title: 'Carga', w: 60, kind: 'num' },
  { key: 'barefoot', title: 'Desc.', w: 58, kind: 'toggle' },
  { key: 'notes', title: 'Notas', w: 220, kind: 'text' },
];

const isoToShort = (iso: string) => {
  const d = fromISODate(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
};

function parseShortDate(v: string, fallback: string): string {
  const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : fallback;
  const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : fromISODate(fallback).getFullYear();
  const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? fallback : toISODate(d);
}

const toNum = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function cellText(s: Session, c: Col, kcal: number): string {
  switch (c.key) {
    case 'date':
      return isoToShort(s.date);
    case 'start':
      return startTime(s) ?? '—';
    case 'endTime':
      return s.endTime ?? '';
    case 'kcalEst':
      return String(Math.round(kcal));
    case 'kcalScreen':
      return s.kcalScreen == null ? '' : String(s.kcalScreen);
    case 'barefoot':
      return s.barefoot == null ? '—' : s.barefoot ? 'Sí' : 'No';
    case 'notes':
      return s.notes;
    default: {
      const v = (s as unknown as Record<string, number>)[c.key];
      return v ? String(v).replace('.', ',') : '';
    }
  }
}

function applyEdit(s: Session, key: string, raw: string): Session {
  const next: Session = { ...s };
  switch (key) {
    case 'date':
      next.date = parseShortDate(raw, s.date);
      break;
    case 'endTime': {
      const m = raw.trim().match(/^(\d{1,2})[:.h]?(\d{2})$/);
      next.endTime = m ? `${m[1].padStart(2, '0')}:${m[2]}` : raw.trim() ? s.endTime : null;
      break;
    }
    case 'kcalScreen':
      next.kcalScreen = raw.trim() ? toNum(raw) : null;
      break;
    case 'notes':
      next.notes = raw;
      break;
    case 'minutes':
    case 'distanceKm':
    case 'speedKmh':
    case 'loadKg':
      (next as unknown as Record<string, number>)[key] = toNum(raw);
      break;
  }
  // Si queda vacío uno de tiempo/distancia/velocidad, se calcula con los otros dos
  if (['minutes', 'distanceKm', 'speedKmh'].includes(key)) {
    const zeros = [next.minutes, next.distanceKm, next.speedKmh].filter((x) => !x).length;
    // Con tiempo y distancia, la velocidad se recalcula como media
    if (zeros === 1 || (key !== 'speedKmh' && next.minutes && next.distanceKm)) Object.assign(next, completeTriad(next));
  }
  return next;
}

const Cell = memo(function Cell({ s, c, kcal, onCommit }: { s: Session; c: Col; kcal: number; onCommit: (s: Session) => void }) {
  const shown = cellText(s, c, kcal);
  const [v, setV] = useState(shown);
  const [focus, setFocus] = useState(false);
  if (c.kind === 'calc') return <Text style={[st.cell, st.calc, { width: c.w }]}>{shown}</Text>;
  if (c.kind === 'toggle')
    return (
      <Pressable
        style={[st.cellBox, { width: c.w }]}
        onPress={() => onCommit({ ...s, barefoot: s.barefoot === null ? true : s.barefoot ? false : null })}
      >
        <Text style={[st.cell, { color: s.barefoot ? C.pink : C.sub }]}>{shown}</Text>
      </Pressable>
    );
  return (
    <TextInput
      value={focus ? v : shown}
      onFocus={() => {
        setV(shown);
        setFocus(true);
      }}
      onChangeText={setV}
      onBlur={() => {
        setFocus(false);
        if (v !== shown) onCommit(applyEdit(s, c.key, v));
      }}
      keyboardType={c.kind === 'num' ? 'decimal-pad' : c.kind === 'text' ? 'default' : 'numbers-and-punctuation'}
      selectTextOnFocus
      style={[st.cell, st.input, { width: c.w }, focus && st.focus, c.kind === 'text' && { textAlign: 'left' }]}
    />
  );
});

export function DataScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { sessions, settings, updateSession, deleteSession, addSessions } = useStore();
  const [editing, setEditing] = useState<Session | null>(null);
  const sorted = [...sessions].sort((a, b) => (b.date + (b.endTime ?? '99')).localeCompare(a.date + (a.endTime ?? '99')));
  const t = totals(sessions, settings);

  const confirmDelete = (s: Session) =>
    Alert.alert('¿Borrar fila?', `${isoToShort(s.date)} · ${fmt(s.distanceKm, 2)} km`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteSession(s.id) },
    ]);

  return (
    <>
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H1>Datos</H1>
          <SyncBadge onPress={onOpenSettings} />
        </View>
        <Text style={st.sub}>Toca una celda para cambiarla. "Desc." cambia Sí / No / — al tocar. Mantén pulsada una fila para borrarla.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.table}>
            <View style={[st.row, st.head]}>
              <Text style={[st.headTxt, { width: 34 }]}> </Text>
              {COLS.map((c) => (
                <Text key={c.key} style={[st.headTxt, { width: c.w }]}>
                  {c.title}
                </Text>
              ))}
            </View>
            {sorted.map((s, i) => {
              const kcal = estimateKcal(s, settings);
              return (
                <Pressable key={s.id} onLongPress={() => confirmDelete(s)} style={[st.row, i % 2 ? { backgroundColor: C.bg2 } : null]}>
                  <Pressable onPress={() => setEditing(s)} style={[st.cellBox, { width: 34 }]}>
                    <Text style={{ fontSize: 14 }}>✏️</Text>
                  </Pressable>
                  {COLS.map((c) => (
                    <Cell key={`${s.id}-${c.key}-${s.updatedAt}`} s={s} c={c} kcal={kcal} onCommit={updateSession} />
                  ))}
                </Pressable>
              );
            })}
            <View style={[st.row, st.foot]}>
              <Text style={[st.footTxt, { width: 34 + 92 + 62 + 64 }]}>Total ({t.sessions})</Text>
              <Text style={[st.footTxt, { width: 58 }]}>{Math.round(t.minutes)}</Text>
              <Text style={[st.footTxt, { width: 62 }]}>{fmt(t.km, 2)}</Text>
              <Text style={[st.footTxt, { width: 58 }]}>{fmt(t.avgSpeed)}</Text>
              <Text style={[st.footTxt, { width: 72 }]} />
              <Text style={[st.footTxt, { width: 70 }]}>{Math.round(t.kcal)}</Text>
            </View>
          </View>
        </ScrollView>

        <Button
          title="+ Fila nueva (hoy)"
          variant="ghost"
          onPress={() =>
            addSessions([
              { date: todayISO(), endTime: null, minutes: 0, speedKmh: 0, distanceKm: 0, kcalScreen: null, barefoot: null, loadKg: 0, notes: '' },
            ])
          }
        />
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={st.modalBg}>
          <ScrollView style={st.sheet} contentContainerStyle={{ gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={st.sheetTitle}>Editar sesión</Text>
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
              onPress={() => {
                if (!editing) return;
                const e = editing;
                setEditing(null);
                confirmDelete(e);
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 140 },
  sub: { color: C.sub, fontSize: 13, marginTop: -4 },
  table: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line, minHeight: 44 },
  head: { backgroundColor: C.cardHi },
  headTxt: { color: C.lime, fontWeight: '800', fontSize: 12, textAlign: 'center', paddingVertical: 10 },
  cell: { color: C.text, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  cellBox: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  input: { paddingVertical: 10, paddingHorizontal: 4 },
  focus: { backgroundColor: C.lime + '22', borderRadius: 8, color: C.lime },
  calc: { color: C.dim, paddingVertical: 10 },
  foot: { backgroundColor: C.cardHi },
  footTxt: { color: C.text, fontWeight: '800', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  modalBg: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: C.bg2, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, borderWidth: 1, borderColor: C.line },
  sheetTitle: { color: C.text, fontSize: 22, fontWeight: '800' },
});
