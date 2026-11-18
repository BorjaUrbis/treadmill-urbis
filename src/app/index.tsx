import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../lib/store';
import { Dashboard } from '../components/Dashboard';
import { RecordScreen } from '../components/RecordScreen';
import { DataScreen } from '../components/DataScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { C, GRAD } from '../components/theme';

type Tab = 'home' | 'record' | 'data' | 'settings';

export default function Home() {
  const { ready } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const insets = useSafeAreaInsets();

  if (!ready)
    return (
      <View style={[s.fill, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.lime} />
      </View>
    );

  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={s.fill}>
        {tab === 'home' && <Dashboard onRecord={() => setTab('record')} onOpenSettings={() => setTab('settings')} />}
        {tab === 'record' && <RecordScreen onSaved={() => setTab('home')} />}
        {tab === 'data' && <DataScreen onOpenSettings={() => setTab('settings')} />}
        {tab === 'settings' && <SettingsScreen />}
      </View>
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabBtn icon="📈" label="Inicio" active={tab === 'home'} onPress={() => setTab('home')} />
        <TabBtn icon="📋" label="Datos" active={tab === 'data'} onPress={() => setTab('data')} />
        <Pressable onPress={() => setTab('record')} style={s.fabWrap}>
          <LinearGradient colors={GRAD} style={s.fab}>
            <Text style={{ fontSize: 26 }}>🎙️</Text>
          </LinearGradient>
        </Pressable>
        <TabBtn icon="⚙️" label="Ajustes" active={tab === 'settings'} onPress={() => setTab('settings')} />
      </View>
    </SafeAreaView>
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
  tab: { alignItems: 'center', flex: 1, gap: 2 },
  tabLbl: { color: C.dim, fontSize: 11, fontWeight: '700' },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -34 },
  fab: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.bg },
});
