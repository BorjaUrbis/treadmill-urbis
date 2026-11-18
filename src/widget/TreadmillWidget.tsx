import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetData = {
  todayKm: number;
  weekKm: number;
  goal: number;
  weekGoal: number;
  title: string;
  emoji: string;
  state: 'none' | 'partial' | 'done';
};

const BG = '#07090D';
const CARD = '#121722';
const LINE = '#232B3A';
const LIME = '#C6FF3D';
const CYAN = '#3DE0FF';
const SUB = '#8A94A8';
const TEXT = '#F2F5FA';

const n = (v: number) => (v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

function Btn({ icon, label, mode }: { icon: string; label: string; mode: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: `treadmillurbis://add?mode=${mode}` }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: 40,
        borderRadius: 14,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: LINE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexGap: 4,
      }}
    >
      <TextWidget text={icon} style={{ fontSize: 15 }} />
      <TextWidget text={label} style={{ fontSize: 12, color: TEXT, fontWeight: '700' }} />
    </FlexWidget>
  );
}

export function TreadmillWidget({ d }: { d: WidgetData }) {
  const titleColor = d.state === 'done' ? LIME : d.state === 'partial' ? '#FF9F43' : '#FF4D8D';
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: { from: '#10161F', to: BG, orientation: 'TL_BR' },
        borderRadius: 24,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text="HOY" style={{ fontSize: 10, color: SUB, fontWeight: '700', letterSpacing: 0.1 }} />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 3 }}>
            <TextWidget text={n(d.todayKm)} style={{ fontSize: 28, color: LIME, fontWeight: '800' }} />
            <TextWidget text={`/ ${n(d.goal)} km`} style={{ fontSize: 12, color: SUB, fontWeight: '600' }} />
          </FlexWidget>
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget text="SEMANA" style={{ fontSize: 10, color: SUB, fontWeight: '700' }} />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 3 }}>
            <TextWidget text={n(d.weekKm)} style={{ fontSize: 28, color: CYAN, fontWeight: '800' }} />
            <TextWidget text={`/ ${n(d.weekGoal)} km`} style={{ fontSize: 12, color: SUB, fontWeight: '600' }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      <TextWidget
        text={`${d.emoji} ${d.title}`}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 13, color: titleColor, fontWeight: '800' }}
      />

      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 8 }}>
        <Btn icon="🎙️" label="Hablar" mode="voice" />
        <Btn icon="✍️" label="Escribir" mode="text" />
        <Btn icon="📷" label="Foto" mode="photo" />
      </FlexWidget>
    </FlexWidget>
  );
}
