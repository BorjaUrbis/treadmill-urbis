import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChartColumn, ChevronRight, House, Mic, PenLine, Plus, Settings, Table2 } from 'lucide-react-native';
import { useStore } from '../lib/store';
import { Dashboard } from '../components/Dashboard';
import { Mode, RecordScreen } from '../components/RecordScreen';
import { DataScreen } from '../components/DataScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { C, themed } from '../components/theme';

type Tab = 'home' | 'stats' | 'record' | 'data' | 'settings';

// Se conserva la pestaña al cambiar de tema (la app se vuelve a montar)
let lastTab: Tab = 'home';

const ACTIONS: { mode: Mode; Icon: typeof Mic; title: string; sub: string }[] = [
  { mode: 'voice', Icon: Mic, title: 'Hablar', sub: 'Cuéntalo con tu voz' },
  { mode: 'text', Icon: PenLine, title: 'Escribir', sub: 'Tecléalo como quieras' },
  { mode: 'photo', Icon: Camera, title: 'Foto', sub: 'De la pantalla de la cinta' },
];

export default function Home() {
  const { ready } = useStore();
  const [tab, setTabState] = useState<Tab>(lastTab);
  const [recordMode, setRecordMode] = useState<Mode>('voice');
  const [recordKey, setRecordKey] = useState(0);
  const [menu, setMenu] = useState(false);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const { add } = useLocalSearchParams<{ add?: string }>();

  const setTab = (t: Tab) => {
    lastTab = t === 'record' ? 'home' : t;
    setTabState(t);
  };

  useEffect(() => {
    Animated.timing(anim, { toValue: menu ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [menu, anim]);

  const openRecord = (m: Mode) => {
    setMenu(false);
    setRecordMode(m);
    setRecordKey((k) => k + 1);
    setTab('record');
  };

  // Llegada desde el widget: treadmillurbis://add?mode=...
  useEffect(() => {
    if (!add || !ready) return;
    if (add === 'voice' || add === 'text' || add === 'photo') openRecord(add);
    else setMenu(true);
    router.setParams({ add: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [add, ready]);

  if (!ready)
    return (
      <View style={[s.fill, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.lime} />
      </View>
    );

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const barBottom = Math.max(insets.bottom, 8);

  const fab = (onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [s.fab, pressed && { opacity: 0.8 }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Plus size={26} color={C.onAccent} strokeWidth={2.4} />
      </Animated.View>
    </Pressable>
  );

  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={s.fill}>
        {tab === 'home' && <Dashboard section="home" onRecord={() => setMenu(true)} onOpenSettings={() => setTab('settings')} />}
        {tab === 'stats' && <Dashboard section="stats" onRecord={() => setMenu(true)} onOpenSettings={() => setTab('settings')} />}
        {tab === 'record' && <RecordScreen key={recordKey} initialMode={recordMode} onSaved={() => setTab('home')} />}
        {tab === 'data' && <DataScreen onOpenSettings={() => setTab('settings')} />}
        {tab === 'settings' && <SettingsScreen />}
      </View>

      <View style={[s.bar, { paddingBottom: barBottom }]}>
        <TabBtn Icon={House} label="Inicio" active={tab === 'home'} onPress={() => setTab('home')} />
        <TabBtn Icon={ChartColumn} label="Progreso" active={tab === 'stats'} onPress={() => setTab('stats')} />
        <View style={s.center}>
          {fab(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setMenu(true);
          })}
        </View>
        <TabBtn Icon={Table2} label="Datos" active={tab === 'data'} onPress={() => setTab('data')} />
        <TabBtn Icon={Settings} label="Ajustes" active={tab === 'settings'} onPress={() => setTab('settings')} />
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)} statusBarTranslucent>
        <Pressable style={s.backdrop} onPress={() => setMenu(false)}>
          <Animated.View
            style={[
              s.menu,
              { bottom: barBottom + 84, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
            ]}
          >
            <Text style={s.menuTitle}>Nueva sesión</Text>
            {ACTIONS.map(({ mode, Icon, title, sub }, i) => (
              <Pressable
                key={mode}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  openRecord(mode);
                }}
                style={({ pressed }) => [s.action, i > 0 && s.actionSep, pressed && { backgroundColor: C.cardHi }]}
              >
                <View style={s.actionIcon}>
                  <Icon size={20} color={C.lime} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionTitle}>{title}</Text>
                  <Text style={s.actionSub}>{sub}</Text>
                </View>
                <ChevronRight size={18} color={C.dim} />
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
        <View style={[s.bar, s.barGhost, { paddingBottom: barBottom }]} pointerEvents="box-none">
          <View style={{ flex: 2 }} />
          <View style={s.center}>{fab(() => setMenu(false))}</View>
          <View style={{ flex: 2 }} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TabBtn({ Icon, label, active, onPress }: { Icon: typeof Mic; label: string; active: boolean; onPress: () => void }) {
  const color = active ? C.text : C.dim;
  return (
    <Pressable onPress={onPress} style={s.tab} hitSlop={4}>
      <Icon size={22} color={color} strokeWidth={active ? 2.2 : 1.8} />
      <Text style={[s.tabLbl, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = themed(() =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: C.bg },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.bg2,
      borderTopWidth: 1,
      borderTopColor: C.line,
      paddingTop: 8,
      paddingHorizontal: 6,
    },
    barGhost: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', borderTopColor: 'transparent' },
    tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
    tabLbl: { fontSize: 11, fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fab: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime },
    backdrop: { flex: 1, backgroundColor: C.overlay },
    menu: { position: 'absolute', left: 16, right: 16, backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
    menuTitle: { color: C.sub, fontSize: 13, fontWeight: '600', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
    actionSep: { borderTopWidth: 1, borderTopColor: C.line },
    actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentSoft },
    actionTitle: { color: C.text, fontSize: 16, fontWeight: '600' },
    actionSub: { color: C.sub, fontSize: 13, marginTop: 1 },
  }),
);
