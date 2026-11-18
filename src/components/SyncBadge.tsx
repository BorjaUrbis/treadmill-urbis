import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useStore } from '../lib/store';
import { C } from './theme';

export function ago(t: number | null) {
  if (!t) return 'nunca';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function SyncBadge({ onPress }: { onPress?: () => void }) {
  const { sync, syncNow } = useStore();
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(i);
  }, []);
  const map = {
    off: { icon: '☁️', txt: 'Conectar Sheets', color: C.sub },
    idle: { icon: '✅', txt: ago(sync.last), color: C.lime },
    syncing: { icon: '🔄', txt: 'Sincronizando', color: C.cyan },
    error: { icon: '⚠️', txt: 'Error', color: C.orange },
  }[sync.status];
  return (
    <Pressable onPress={sync.status === 'off' || sync.status === 'error' ? onPress : syncNow} style={s.badge}>
      <Text style={[s.txt, { color: map.color }]}>
        {map.icon} {map.txt}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  badge: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.line },
  txt: { fontSize: 12, fontWeight: '800' },
});
