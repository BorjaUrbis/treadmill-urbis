import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useStore } from '../lib/store';
import { exportExcel } from '../lib/exportExcel';
import { sendTestNotification, setupNotifications } from '../lib/notifications';
import { Button, Card, Field, H1, Label } from './ui';
import { C } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');

export function SettingsScreen() {
  const { settings, updateSettings, sessions, apiKey, setApiKey } = useStore();
  const [keyDraft, setKeyDraft] = useState('');
  const [w, setW] = useState(String(settings.bodyWeightKg).replace('.', ','));
  const [inc, setInc] = useState(String(settings.inclinePct).replace('.', ','));
  const [goal, setGoal] = useState(String(settings.weeklyGoalKm).replace('.', ','));
  const [name, setName] = useState(settings.userName);
  const num = (s: string) => Number(s.replace(',', '.'));

  const shiftTime = (mins: number) => {
    let t = settings.reminderHour * 60 + settings.reminderMinute + mins;
    t = (t + 1440) % 1440;
    updateSettings({ reminderHour: Math.floor(t / 60), reminderMinute: t % 60 });
  };

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <H1>Ajustes</H1>

      <Card>
        <Label>Tú</Label>
        <View style={s.row}>
          <Field label="Nombre" value={name} onChangeText={setName} onBlur={() => updateSettings({ userName: name.trim() || 'Borja' })} />
          <Field label="Peso corporal" suffix="kg" keyboardType="decimal-pad" value={w} onChangeText={setW} onBlur={() => num(w) > 0 && updateSettings({ bodyWeightKg: num(w) })} />
        </View>
        <View style={[s.row, { marginTop: 12 }]}>
          <Field label="Objetivo semanal" suffix="km" keyboardType="decimal-pad" value={goal} onChangeText={setGoal} onBlur={() => num(goal) >= 0 && updateSettings({ weeklyGoalKm: num(goal) })} />
          <Field label="Inclinación cinta" suffix="%" keyboardType="decimal-pad" value={inc} onChangeText={setInc} onBlur={() => num(inc) >= 0 && updateSettings({ inclinePct: num(inc) })} />
        </View>
        <Text style={s.note}>Las kcal se estiman con la ecuación de marcha del ACSM, usando tu peso + la carga que lleves.</Text>
      </Card>

      <Card>
        <Label>Notificaciones</Label>
        <Toggle label="Avisarme si no he caminado" value={settings.remindersEnabled} onChange={(v) => updateSettings({ remindersEnabled: v })} />
        <View style={s.timeRow}>
          <Text style={s.tLabel}>Hora del aviso</Text>
          <View style={s.stepper}>
            <Pressable onPress={() => shiftTime(-30)} style={s.stepBtn}><Text style={s.stepTxt}>−</Text></Pressable>
            <Text style={s.time}>{pad(settings.reminderHour)}:{pad(settings.reminderMinute)}</Text>
            <Pressable onPress={() => shiftTime(30)} style={s.stepBtn}><Text style={s.stepTxt}>+</Text></Pressable>
          </View>
        </View>
        <Toggle label="También fines de semana" value={settings.weekendReminders} onChange={(v) => updateSettings({ weekendReminders: v })} />
        <Toggle label="Resumen semanal (domingo 21:00)" value={settings.weeklySummary} onChange={(v) => updateSettings({ weeklySummary: v })} />
        <Button
          title="Probar notificación"
          variant="ghost"
          style={{ marginTop: 12 }}
          onPress={async () => {
            const ok = await setupNotifications();
            if (!ok) Alert.alert('Sin permiso', 'Activa las notificaciones de Treadmill Urbis en los ajustes de Android.');
            else await sendTestNotification();
          }}
        />
      </Card>

      <Card>
        <Label>Voz con Claude</Label>
        <Text style={s.p}>
          {apiKey
            ? `✅ Clave guardada (…${apiKey.slice(-4)}). La voz se interpreta con Claude Haiku.`
            : 'Sin clave: la voz usa un intérprete básico. Pega aquí tu clave de console.anthropic.com para hablar con naturalidad.'}
        </Text>
        <Field label="Clave de API" placeholder="sk-ant-..." autoCapitalize="none" autoCorrect={false} secureTextEntry value={keyDraft} onChangeText={setKeyDraft} />
        <View style={[s.row, { marginTop: 12 }]}>
          <Button
            title="Guardar clave"
            disabled={!keyDraft.trim().startsWith('sk-')}
            style={{ flex: 1 }}
            onPress={async () => {
              await setApiKey(keyDraft);
              setKeyDraft('');
            }}
          />
          {apiKey ? <Button title="Quitar" variant="danger" onPress={() => setApiKey(null)} /> : null}
        </View>
        <Text style={s.note}>La clave se guarda cifrada solo en este móvil.</Text>
      </Card>

      <Card>
        <Label>Datos</Label>
        <Text style={s.p}>{sessions.length} sesiones guardadas en el móvil.</Text>
        <Button
          title="📊 Exportar Excel"
          onPress={() => exportExcel(sessions, settings).catch((e) => Alert.alert('Error', String(e)))}
        />
      </Card>

      <Text style={[s.note, { textAlign: 'center' }]}>
        Treadmill Urbis v{Constants.expoConfig?.version} ({String(Constants.expoConfig?.android?.versionCode ?? '')})
      </Text>
    </ScrollView>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.toggle}>
      <Text style={s.tLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.lime, false: C.line }} thumbColor={value ? '#fff' : C.sub} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 120 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  note: { color: C.dim, fontSize: 12, marginTop: 10 },
  p: { color: C.sub, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  tLabel: { color: C.text, fontSize: 15, fontWeight: '600', flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: C.text, fontSize: 22, fontWeight: '700' },
  time: { color: C.lime, fontSize: 22, fontWeight: '800', minWidth: 70, textAlign: 'center' },
});
