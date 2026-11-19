import React, { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../lib/store';
import { applyTheme, C, ThemeMode } from '../components/theme';

/** Aplica el tema (sistema / claro / oscuro) y vuelve a montar la app cuando cambia */
function ThemeGate() {
  const { settings } = useStore();
  const system = useColorScheme();
  const mode: ThemeMode = settings.theme === 'system' ? (system === 'light' ? 'light' : 'dark') : settings.theme;
  applyTheme(mode);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(C.bg).catch(() => {});
  }, [mode]);
  return (
    <View key={mode} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeGate />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
