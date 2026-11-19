import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useStore } from '../lib/store';
import { ImageInput, ParseResult, parseLocal, parseWithClaude } from '../lib/parser';
import { SessionDraft } from '../lib/types';
import { todayISO } from '../lib/dates';
import { SessionForm } from './SessionForm';
import { Button, Card, H1, Label } from './ui';
import { C, GRAD } from './theme';

export type Mode = 'voice' | 'text' | 'photo';

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

export function RecordScreen({ onSaved, initialMode = 'voice' }: { onSaved: () => void; initialMode?: Mode }) {
  const { apiKey, addSessions } = useStore();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; img: ImageInput } | null>(null);
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
      setFinalText((p) => (p.trim() ? `${p.trimEnd()} ${tr}` : tr).trim());
      setInterim('');
    } else setInterim(tr);
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    if (e.error !== 'no-speech' && e.error !== 'aborted') Alert.alert('Micrófono', `No he podido escuchar (${e.error}). Puedes escribirlo.`);
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

  // Si se abre desde el menú + en modo voz, empezamos a escuchar directamente
  useEffect(() => {
    if (initialMode === 'voice') toggleMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return Alert.alert('Permiso de cámara', 'Activa la cámara para Treadmill Urbis en los ajustes del móvil.');
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      // Reducimos la foto para que viaje rápido y cueste menos
      const ctx = ImageManipulator.manipulate(a.uri);
      if ((a.width || 0) > 1400) ctx.resize({ width: 1400 });
      const ref = await ctx.renderAsync();
      const out = await ref.saveAsync({ base64: true, compress: 0.75, format: SaveFormat.JPEG });
      if (!out.base64) throw new Error('No se pudo leer la imagen');
      setPhoto({ uri: out.uri, img: { base64: out.base64, mediaType: 'image/jpeg' } });
      setDrafts(null);
    } catch (e) {
      Alert.alert('Foto', String((e as Error).message || e));
    }
  };

  // Lo que se ve en el cuadro (sin recortar, para que el espacio funcione al escribir)
  const shown = interim ? `${finalText}${finalText && !finalText.endsWith(' ') ? ' ' : ''}${interim}` : finalText;
  // Lo que se manda a interpretar
  const text = shown.trim();
  const usingPhoto = mode === 'photo' && !!photo;
  const canInterpret = usingPhoto ? !!apiKey : !!text;

  const interpret = async () => {
    if (!canInterpret) return;
    if (listening) ExpoSpeechRecognitionModule.stop();
    setBusy(true);
    try {
      let r: ParseResult;
      if (apiKey) {
        try {
          r = await parseWithClaude(text, apiKey, usingPhoto ? photo!.img : null);
        } catch (e) {
          if (usingPhoto) {
            Alert.alert('Claude no ha respondido', (e as Error).message);
            return;
          }
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

  const reset = () => {
    setDrafts(null);
    setFinalText('');
    setInterim('');
    setQuestion(null);
    setPhoto(null);
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
    reset();
    onSaved();
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  const hint =
    mode === 'voice'
      ? apiKey
        ? 'Cuéntamelo como te salga, Claude lo interpreta.'
        : 'Sin clave de API: di km, velocidad y tiempo claramente.'
      : mode === 'text'
        ? 'Escríbelo como quieras: "45 min a 4,5, descalzo, 180 kcal".'
        : apiKey
          ? 'Haz una foto a la pantalla de la cinta. Puedes añadir detalles abajo (carga, descalzo...).'
          : 'Para leer fotos hace falta la clave de API (Ajustes → Voz con Claude).';

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <H1>Registrar</H1>

      <View style={s.modes}>
        {(
          [
            ['voice', '🎙️', 'Voz'],
            ['text', '✍️', 'Texto'],
            ['photo', '📷', 'Foto'],
          ] as const
        ).map(([m, icon, label]) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[s.mode, mode === m && s.modeOn]}>
            <Text style={s.modeIcon}>{icon}</Text>
            <Text style={[s.modeLbl, mode === m && { color: C.lime }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.sub}>{hint}</Text>

      {mode === 'voice' ? (
        <View style={s.micWrap}>
          <Animated.View style={[s.halo, { transform: [{ scale }], opacity }]} />
          <Pressable onPress={toggleMic}>
            <LinearGradient colors={listening ? [C.pink, C.orange] : GRAD} style={s.mic}>
              <Text style={s.micIcon}>{listening ? '■' : '🎙️'}</Text>
            </LinearGradient>
          </Pressable>
          <Text style={s.micLbl}>{listening ? 'Escuchando... toca para parar' : 'Toca para hablar'}</Text>
        </View>
      ) : null}

      {mode === 'photo' ? (
        <Card>
          {photo ? (
            <View>
              <Image source={{ uri: photo.uri }} style={s.photo} resizeMode="contain" />
              <Text style={s.retake} onPress={() => setPhoto(null)}>
                Cambiar foto
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="📸 Cámara" onPress={() => pickPhoto('camera')} style={{ flex: 1 }} />
              <Button title="🖼️ Galería" variant="ghost" onPress={() => pickPhoto('library')} style={{ flex: 1 }} />
            </View>
          )}
        </Card>
      ) : null}

      <Card>
        <Label>{mode === 'voice' ? 'Lo que has dicho' : mode === 'text' ? 'Escribe tu sesión' : 'Detalles extra (opcional)'}</Label>
        <TextInput
          multiline
          value={shown}
          autoFocus={mode === 'text'}
          onChangeText={(v) => {
            setFinalText(v);
            setInterim('');
          }}
          placeholder={
            mode === 'photo'
              ? 'Ej: "con la mochila de 22, descalzo"'
              : 'Ej: "Hoy 5 km a 3 por hora, descalzo, la última media hora con la mochila de 22. He acabado a las 8 y media."'
          }
          placeholderTextColor={C.dim}
          style={[s.transcript, mode === 'photo' && { minHeight: 50 }]}
        />
        {mode === 'photo' ? (
          <Text style={s.dictate} onPress={toggleMic}>
            {listening ? '■ Parar dictado' : '🎙️ Dictar detalles'}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={busy ? 'Pensando...' : usingPhoto ? 'Leer foto' : 'Interpretar'} onPress={interpret} disabled={!canInterpret || busy} style={{ flex: 1 }} />
          {text || photo || drafts ? <Button title="Borrar" variant="ghost" onPress={reset} /> : null}
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
          title="Rellenar a mano"
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
  modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  modeOn: { borderColor: C.lime, backgroundColor: C.lime + '14' },
  modeIcon: { fontSize: 22 },
  modeLbl: { color: C.sub, fontWeight: '800', fontSize: 13, marginTop: 4 },
  micWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  halo: { position: 'absolute', top: 18, width: 130, height: 130, borderRadius: 65, backgroundColor: C.lime },
  mic: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 48, color: '#fff' },
  micLbl: { color: C.sub, marginTop: 14, fontWeight: '600' },
  transcript: { color: C.text, fontSize: 16, minHeight: 90, textAlignVertical: 'top', marginBottom: 14, lineHeight: 22 },
  photo: { width: '100%', height: 260, borderRadius: 14, backgroundColor: C.bg2 },
  retake: { color: C.cyan, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  dictate: { color: C.cyan, fontWeight: '700', marginBottom: 12 },
});
