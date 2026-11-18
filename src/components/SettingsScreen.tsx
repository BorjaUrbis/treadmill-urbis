import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { APPS_SCRIPT_CODE } from '../lib/appsScript';
import { ago } from './SyncBadge';
import { useStore } from '../lib/store';
import { exportExcel } from '../lib/exportExcel';
import { sendTestNotification, setupNotifications } from '../lib/notifications';
import { Button, Card, Field, H1, Label } from './ui';
import { C } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');

export function SettingsScreen() {
  const { settings, updateSettings, sessions, apiKey, setApiKey, sync, syncNow } = useStore();
  const [url, setUrl] = useState(settings.sheetsUrl);
  const [keyDraft, setKeyDraft] = useState('');
  const [w, setW] = useState(String(settings.bodyWeightKg).replace('.', ','));
  const [inc, setInc] = useState(String(settings.inclinePct).replace('.', ','));
  const [goal, setGoal] = useState(String(settings.weeklyGoalKm).replace('.', ','));
  const [dgoal, setDgoal] = useState(String(settings.dailyGoalKm).replace('.', ','));
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
          <Field label="Objetivo diario" suffix="km" keyboardType="decimal-pad" value={dgoal} onChangeText={setDgoal} onBlur={() => num(dgoal) > 0 && updateSettings({ dailyGoalKm: num(dgoal) })} />
        </View>
        <View style={[s.row, { marginTop: 12 }]}>
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
        <Label>Google Sheets (base de datos)</Label>
        {settings.sheetsUrl ? (
          <>
            <Text style={s.p}>
              {sync.status === 'error'
                ? `⚠️ ${sync.message}`
                : sync.status === 'syncing'
                  ? '🔄 Sincronizando...'
                  : `✅ Conectado. Última sincronización: ${ago(sync.last)}.`}
            </Text>
            <Text style={s.note}>Se sincroniza solo al abrir la app y cada vez que cambias algo. Lo que edites en la hoja aparece aquí al volver a la app.</Text>
            <View style={[s.row, { marginTop: 12 }]}>
              <Button title="Sincronizar ahora" onPress={syncNow} style={{ flex: 1 }} />
              <Button
                title="Desconectar"
                variant="danger"
                onPress={() =>
                  Alert.alert('¿Desconectar la hoja?', 'Los datos se quedan en el móvil y en la hoja; solo dejan de sincronizarse.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Desconectar', style: 'destructive', onPress: () => { setUrl(''); updateSettings({ sheetsUrl: '' }); } },
                  ])
                }
              />
            </View>
          </>
        ) : (
          <>
            <Text style={s.p}>Tus sesiones se guardan en una hoja de Google que puedes ver y editar desde cualquier sitio. Gratis. Se configura una vez:</Text>
            <Step n={1} text="Crea una hoja de cálculo nueva en Google Sheets." />
            <Button title="Abrir Google Sheets (hoja nueva)" variant="ghost" onPress={() => Linking.openURL('https://sheets.new')} />
            <Step n={2} text="En la hoja: Extensiones → Apps Script. Borra lo que haya y pega el código (botón de abajo). Guarda." />
            <Button
              title="📋 Copiar código del script"
              variant="ghost"
              onPress={async () => {
                await Clipboard.setStringAsync(APPS_SCRIPT_CODE);
                Alert.alert('Copiado', 'Pégalo en el editor de Apps Script.');
              }}
            />
            <Step n={3} text='Arriba elige la función "setup" y dale a Ejecutar. Acepta los permisos (es tu propia cuenta).' />
            <Step n={4} text='Implementar → Nueva implementación → tipo "Aplicación web". Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario. Implementar.' />
            <Step n={5} text="Copia la URL que acaba en /exec y pégala aquí:" />
          </>
        )}
        <View style={{ marginTop: 12 }}>
          <Field label="URL de la aplicación web" placeholder="https://script.google.com/macros/s/.../exec" autoCapitalize="none" autoCorrect={false} value={url} onChangeText={setUrl} />
        </View>
        {url.trim() !== settings.sheetsUrl ? (
          <Button
            title="Conectar"
            style={{ marginTop: 12 }}
            disabled={!/^https:\/\/script\.google\.com\/.+\/exec\/?$/.test(url.trim())}
            onPress={() => updateSettings({ sheetsUrl: url.trim() })}
          />
        ) : null}
      </Card>

      <Card>
        <Label>Datos</Label>
        <Text style={s.p}>{sessions.length} sesiones guardadas en el móvil{settings.sheetsUrl ? ' y en Google Sheets' : ''}. También puedes sacar una copia en Excel:</Text>
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

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
      <Text style={{ color: C.lime, fontWeight: '800', width: 18 }}>{n}.</Text>
      <Text style={{ color: C.text, flex: 1, lineHeight: 20 }}>{text}</Text>
    </View>
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
