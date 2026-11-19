import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { C, themed } from './theme';

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
    off: { dot: C.dim, txt: 'Sin Sheets' },
    idle: { dot: C.lime, txt: `Sincronizado ${ago(sync.last)}` },
    syncing: { dot: C.orange, txt: 'Sincronizando' },
    error: { dot: C.danger, txt: 'Error de sync' },
  }[sync.status];
  return (
    <Pressable onPress={sync.status === 'off' || sync.status === 'error' ? onPress : syncNow} style={s.badge}>
      <View style={[s.dot, { backgroundColor: map.dot }]} />
      <Text style={s.txt}>{map.txt}</Text>
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  txt: { fontSize: 12, fontWeight: '500', color: C.sub },
}));
