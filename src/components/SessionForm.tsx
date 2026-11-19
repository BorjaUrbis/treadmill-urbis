import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SessionDraft } from '../lib/types';
import { addDays, prettyDate, todayISO } from '../lib/dates';
import { completeTriad, estimateKcal, fmt } from '../lib/calc';
import { useStore } from '../lib/store';
import { Chip, Field } from './ui';
import { C } from './theme';

const toStr = (n: number | null | undefined) => (n === null || n === undefined || n === 0 ? '' : String(n).replace('.', ','));
const toNum = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Formulario editable de una sesión. Llama a onChange con el borrador actualizado. */
export function SessionForm({ draft, onChange }: { draft: SessionDraft; onChange: (d: SessionDraft) => void }) {
  const { settings } = useStore();
  const [t, setT] = useState({
    minutes: toStr(draft.minutes),
    speed: toStr(draft.speedKmh),
    dist: toStr(draft.distanceKm),
    kcal: toStr(draft.kcalScreen),
    load: toStr(draft.loadKg),
    end: draft.endTime ?? '',
  });

  const set = (k: keyof typeof t, v: string) => {
    const next = { ...t, [k]: v };
    setT(next);
    const end = /^\d{1,2}:\d{2}$/.test(next.end) ? next.end.padStart(5, '0') : null;
    onChange({
      ...draft,
      minutes: toNum(next.minutes),
      speedKmh: toNum(next.speed),
      distanceKm: toNum(next.dist),
      kcalScreen: next.kcal ? toNum(next.kcal) : null,
      loadKg: toNum(next.load),
      endTime: end,
    });
  };

  const autocomplete = () => {
    const c = completeTriad({ minutes: toNum(t.minutes), speedKmh: toNum(t.speed), distanceKm: toNum(t.dist) });
    setT({ ...t, minutes: toStr(c.minutes), speed: toStr(c.speedKmh), dist: toStr(c.distanceKm) });
    onChange({ ...draft, ...c });
  };

  const today = todayISO();
  const dates = [addDays(today, -2), addDays(today, -1), today];
  const missing = [t.minutes, t.speed, t.dist].filter((x) => !x).length === 1;
  // Si hay tiempo y distancia, al salir del campo la velocidad se pone como media
  const recalc = missing || (!!t.minutes && !!t.dist);

  return (
    <View style={{ gap: 14 }}>
      <View style={s.row}>
        {dates.map((d) => (
          <Chip key={d} label={prettyDate(d)} active={draft.date === d} onPress={() => onChange({ ...draft, date: d })} />
        ))}
        {!dates.includes(draft.date) ? <Chip label={prettyDate(draft.date)} active onPress={() => {}} /> : null}
      </View>
      <View style={s.row}>
        <Field label="Distancia" suffix="km" keyboardType="decimal-pad" value={t.dist} onChangeText={(v) => set('dist', v)} onBlur={recalc ? autocomplete : undefined} />
        <Field label="Velocidad media" suffix="km/h" keyboardType="decimal-pad" value={t.speed} onChangeText={(v) => set('speed', v)} onBlur={missing ? autocomplete : undefined} />
      </View>
      <View style={s.row}>
        <Field label="Tiempo" suffix="min" keyboardType="number-pad" value={t.minutes} onChangeText={(v) => set('minutes', v)} onBlur={recalc ? autocomplete : undefined} />
        <Field label="Hora fin" placeholder="20:30" keyboardType="numbers-and-punctuation" value={t.end} onChangeText={(v) => set('end', v)} />
      </View>
      <View style={s.row}>
        <Field label="Peso extra" suffix="kg" keyboardType="decimal-pad" value={t.load} onChangeText={(v) => set('load', v)} />
        <Field label="Kcal pantalla" suffix="kcal" keyboardType="number-pad" value={t.kcal} onChangeText={(v) => set('kcal', v)} placeholder="opcional" />
      </View>
      <View style={s.row}>
        <Chip label="🦶 Descalzo" active={draft.barefoot === true} onPress={() => onChange({ ...draft, barefoot: draft.barefoot === true ? null : true })} color={C.pink} />
        <Chip label="👟 Con zapatillas" active={draft.barefoot === false} onPress={() => onChange({ ...draft, barefoot: draft.barefoot === false ? null : false })} color={C.cyan} />
      </View>
      <Field label="Notas" value={draft.notes} onChangeText={(v) => onChange({ ...draft, notes: v })} placeholder="Pausas, sensaciones..." />
      <Text style={s.kcal}>≈ {fmt(estimateKcal(draft, settings), 0)} kcal estimadas con tu peso{draft.loadKg ? ' + carga' : ''}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kcal: { color: C.orange, fontWeight: '700', fontSize: 14 },
});
