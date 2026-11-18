import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useStore } from '../lib/store';
import { parseLocal, parseWithClaude } from '../lib/parser';
import { SessionDraft } from '../lib/types';
import { todayISO } from '../lib/dates';
import { SessionForm } from './SessionForm';
import { Button, Card, H1, Label } from './ui';
import { C, GRAD } from './theme';

const emptyDraft = (): SessionDraft => ({
  date: todayISO(),
  endTime: null,
  minutes: 0,
  speedKmh: 0,
  distanceKm: 0,
  kcalScreen: null,
  barefoot: null,
  loadKg: 0,
  notes: '',
});

export function RecordScreen({ onSaved }: { onSaved: () => void }) {
  const { apiKey, addSessions } = useStore();
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<SessionDraft[] | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!listening) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
  }, [listening, pulse]);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setInterim('');
  });
  useSpeechRecognitionEvent('result', (e) => {
    const tr = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      setFinalText((p) => (p ? `${p} ${tr}` : tr).trim());
      setInterim('');
    } else setInterim(tr);
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    if (e.error !== 'no-speech' && e.error !== 'aborted') Alert.alert('Micrófono', `No he podido escuchar (${e.error}). Puedes escribirlo abajo.`);
  });

  const toggleMic = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso de micrófono', 'Necesito el micrófono para que puedas dictar. Actívalo en los ajustes del móvil.');
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'es-ES',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 4000 },
    });
  };

  const text = (finalText + (interim ? ` ${interim}` : '')).trim();

  const interpret = async () => {
    if (!text) return;
    if (listening) ExpoSpeechRecognitionModule.stop();
    setBusy(true);
    try {
      let r;
      if (apiKey) {
        try {
          r = await parseWithClaude(text, apiKey);
        } catch (e) {
          Alert.alert('Claude no ha respondido', `${(e as Error).message}\nUso el intérprete básico.`);
          r = parseLocal(text);
        }
      } else r = parseLocal(text);
      setDrafts(r.drafts.length ? r.drafts : null);
      setQuestion(r.question);
      setFormKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!drafts?.length) return;
    const bad = drafts.find((d) => !d.minutes || !d.distanceKm);
    if (bad) {
      Alert.alert('Falta algo', 'Cada sesión necesita al menos tiempo y distancia (o velocidad para calcularlos).');
      return;
    }
    await addSessions(drafts);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDrafts(null);
    setFinalText('');
    setQuestion(null);
    onSaved();
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <H1>Registrar</H1>
      <Text style={s.sub}>Cuéntame qué has caminado, como te salga. {apiKey ? 'Claude lo interpreta.' : 'Sin clave de API: intenta decir km, velocidad y tiempo.'}</Text>

      <View style={s.micWrap}>
        <Animated.View style={[s.halo, { transform: [{ scale }], opacity }]} />
        <Pressable onPress={toggleMic}>
          <LinearGradient colors={listening ? [C.pink, C.orange] : GRAD} style={s.mic}>
            <Text style={s.micIcon}>{listening ? '■' : '🎙️'}</Text>
          </LinearGradient>
        </Pressable>
        <Text style={s.micLbl}>{listening ? 'Escuchando... toca para parar' : 'Toca para hablar'}</Text>
      </View>

      <Card>
        <Label>Lo que has dicho</Label>
        <TextInput
          multiline
          value={text}
          onChangeText={(v) => {
            setFinalText(v);
            setInterim('');
          }}
          placeholder='Ej: "Hoy 5 km a 3 por hora, descalzo, la última media hora con la mochila de 22. He acabado a las 8 y media."'
          placeholderTextColor={C.dim}
          style={s.transcript}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={busy ? 'Pensando...' : 'Interpretar'} onPress={interpret} disabled={!text || busy} style={{ flex: 1 }} />
          {text ? <Button title="Borrar" variant="ghost" onPress={() => { setFinalText(''); setInterim(''); setDrafts(null); }} /> : null}
        </View>
        {busy ? <ActivityIndicator color={C.lime} style={{ marginTop: 12 }} /> : null}
      </Card>

      {question ? (
        <Card style={{ borderColor: C.orange }}>
          <Text style={{ color: C.orange, fontWeight: '700' }}>🤔 {question}</Text>
        </Card>
      ) : null}

      {drafts?.map((d, i) => (
        <Card key={`${formKey}-${i}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Label>{drafts.length > 1 ? `Sesión ${i + 1} de ${drafts.length}` : 'Revisa y guarda'}</Label>
            {drafts.length > 1 ? (
              <Text style={{ color: C.danger, fontWeight: '700' }} onPress={() => setDrafts(drafts.filter((_, j) => j !== i))}>
                Quitar
              </Text>
            ) : null}
          </View>
          <SessionForm draft={d} onChange={(nd) => setDrafts(drafts.map((x, j) => (j === i ? nd : x)))} />
        </Card>
      ))}

      {drafts?.length ? (
        <Button title={drafts.length > 1 ? `Guardar ${drafts.length} sesiones` : 'Guardar sesión'} onPress={save} />
      ) : (
        <Button
          title="Añadir a mano"
          variant="ghost"
          onPress={() => {
            setDrafts([emptyDraft()]);
            setFormKey((k) => k + 1);
          }}
        />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 140 },
  sub: { color: C.sub, fontSize: 14, marginTop: -4 },
  micWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  halo: { position: 'absolute', top: 24, width: 130, height: 130, borderRadius: 65, backgroundColor: C.lime },
  mic: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 48, color: '#fff' },
  micLbl: { color: C.sub, marginTop: 14, fontWeight: '600' },
  transcript: { color: C.text, fontSize: 16, minHeight: 90, textAlignVertical: 'top', marginBottom: 14, lineHeight: 22 },
});
