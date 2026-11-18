import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStore } from '../lib/store';
import { Dashboard } from '../components/Dashboard';
import { Mode, RecordScreen } from '../components/RecordScreen';
import { DataScreen } from '../components/DataScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { C, GRAD } from '../components/theme';

type Tab = 'home' | 'record' | 'data' | 'settings';

const ACTIONS: { mode: Mode; icon: string; title: string; sub: string }[] = [
  { mode: 'voice', icon: '🎙️', title: 'Hablar', sub: 'Cuéntalo con tu voz' },
  { mode: 'text', icon: '✍️', title: 'Escribir', sub: 'Tecléalo como quieras' },
  { mode: 'photo', icon: '📷', title: 'Foto', sub: 'De la pantalla de la cinta' },
];

export default function Home() {
  const { ready } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [recordMode, setRecordMode] = useState<Mode>('voice');
  const [recordKey, setRecordKey] = useState(0);
  const [menu, setMenu] = useState(false);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: menu ? 1 : 0, useNativeDriver: true, friction: 7, tension: 80 }).start();
  }, [menu, anim]);

  const openRecord = (m: Mode) => {
    setMenu(false);
    setRecordMode(m);
    setRecordKey((k) => k + 1);
    setTab('record');
  };

  if (!ready)
    return (
      <View style={[s.fill, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.lime} />
      </View>
    );

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const barBottom = Math.max(insets.bottom, 10);

  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={s.fill}>
        {tab === 'home' && <Dashboard onRecord={() => setMenu(true)} onOpenSettings={() => setTab('settings')} />}
        {tab === 'record' && <RecordScreen key={recordKey} initialMode={recordMode} onSaved={() => setTab('home')} />}
        {tab === 'data' && <DataScreen onOpenSettings={() => setTab('settings')} />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={[s.bar, { paddingBottom: barBottom }]}>
        <View style={s.side}>
          <TabBtn icon="📈" label="Inicio" active={tab === 'home'} onPress={() => setTab('home')} />
          <TabBtn icon="📋" label="Datos" active={tab === 'data'} onPress={() => setTab('data')} />
        </View>
        <View style={{ width: 84 }} />
        <View style={s.side}>
          <TabBtn icon="⚙️" label="Ajustes" active={tab === 'settings'} onPress={() => setTab('settings')} />
        </View>
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)} statusBarTranslucent>
        <Pressable style={s.backdrop} onPress={() => setMenu(false)}>
          <View style={[s.menu, { bottom: barBottom + 96 }]}>
            <Text style={s.menuTitle}>Añade tu sesión</Text>
            {ACTIONS.map((a, i) => (
              <Animated.View
                key={a.mode}
                style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30 + i * 12, 0] }) }] }}
              >
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    openRecord(a.mode);
                  }}
                  style={({ pressed }) => [s.action, pressed && { opacity: 0.7 }]}
                >
                  <LinearGradient colors={GRAD} style={s.actionIcon}>
                    <Text style={{ fontSize: 24 }}>{a.icon}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={s.actionTitle}>{a.title}</Text>
                    <Text style={s.actionSub}>{a.sub}</Text>
                  </View>
                  <Text style={s.chev}>›</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Pressable>
        <View style={[s.fabWrapModal, { bottom: barBottom + 18 }]} pointerEvents="box-none">
          <Fab rotate={rotate} onPress={() => setMenu(false)} />
        </View>
      </Modal>

      <View style={[s.fabWrap, { bottom: barBottom + 18 }]} pointerEvents="box-none">
        <Fab
          rotate={rotate}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setMenu(true);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function Fab({ rotate, onPress }: { rotate: Animated.AnimatedInterpolation<string>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <LinearGradient colors={GRAD} style={s.fab}>
        <Animated.Text style={[s.plus, { transform: [{ rotate }] }]}>+</Animated.Text>
      </LinearGradient>
    </Pressable>
  );
}

function TabBtn({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.tab}>
      <Text style={{ fontSize: 20, opacity: active ? 1 : 0.45 }}>{icon}</Text>
      <Text style={[s.tabLbl, active && { color: C.lime }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: C.bg2,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 10,
  },
  side: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  tab: { alignItems: 'center', flex: 1, gap: 2 },
  tabLbl: { color: C.dim, fontSize: 11, fontWeight: '700' },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fabWrapModal: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.bg },
  plus: { fontSize: 40, lineHeight: 44, fontWeight: '400', color: '#06100A', marginTop: -2 },
  backdrop: { flex: 1, backgroundColor: '#000c' },
  menu: { position: 'absolute', left: 20, right: 20, gap: 10 },
  menuTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.line },
  actionIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: C.text, fontSize: 17, fontWeight: '800' },
  actionSub: { color: C.sub, fontSize: 13, marginTop: 2 },
  chev: { color: C.dim, fontSize: 28, fontWeight: '300' },
});
