import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { FlexWidgetStyle } from 'react-native-android-widget';

type Hex = `#${string}`;
import { progressSvg, ringSvg, weekBarsSvg } from './svg';

export type WidgetData = {
  todayKm: number;
  weekKm: number;
  goal: number;
  weekGoal: number;
  title: string;
  sub: string;
  emoji: string;
  state: 'none' | 'partial' | 'done';
  days: number[];
  dayIndex: number;
  streak: number;
  weekMinutes: number;
};

const CARD = '#17171A' as Hex;
const LINE = '#26262B' as Hex;
const LIME = '#3DD598' as Hex;
const CYAN = '#8A9BAD' as Hex;
const SUB = '#A1A1AA' as Hex;
const TEXT = '#F4F4F5' as Hex;

const n1 = (v: number) => (v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));
const stateColor = (s: WidgetData['state']): Hex => (s === 'done' ? LIME : s === 'partial' ? '#D9A15A' : '#F06A6A');

function Btn({ icon, label, mode, h, iconOnly }: { icon: string; label: string; mode: string; h: number; iconOnly: boolean }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: `treadmillurbis://add?mode=${mode}` }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: h,
        borderRadius: h / 2,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: LINE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexGap: 6,
      }}
    >
      <TextWidget text={iconOnly ? label.charAt(0) : label} style={{ fontSize: h > 40 ? 14 : 12, color: TEXT, fontWeight: '600' }} />
    </FlexWidget>
  );
}

function Buttons({ h, iconOnly }: { h: number; iconOnly: boolean }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 8 }}>
      <Btn icon="🎙️" label="Hablar" mode="voice" h={h} iconOnly={iconOnly} />
      <Btn icon="✍️" label="Escribir" mode="text" h={h} iconOnly={iconOnly} />
      <Btn icon="📷" label="Foto" mode="photo" h={h} iconOnly={iconOnly} />
    </FlexWidget>
  );
}

/** Bloque "anillo + texto" para hoy o la semana */
function RingStat({
  label,
  value,
  goal,
  ring,
  showText,
  color,
  extra,
}: {
  label: string;
  value: number;
  goal: number;
  ring: number;
  showText: boolean;
  color: Hex;
  extra: string;
}) {
  const progress = goal ? value / goal : 0;
  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: CARD,
        borderRadius: 22,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: showText ? 'flex-start' : 'center',
        flexGap: 10,
      }}
    >
      <SvgWidget
        svg={ringSvg(ring, progress, value, `/ ${n1(goal)}`, LIME, LIME)}
        style={{ width: ring, height: ring }}
      />
      {showText ? (
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget text={label} style={{ fontSize: 11, color: SUB, fontWeight: '700', letterSpacing: 0.08 }} />
          <TextWidget text={`${n1(value)} km`} style={{ fontSize: 20, color, fontWeight: '800' }} />
          <TextWidget text={extra} maxLines={2} style={{ fontSize: 11, color: SUB }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

export function TreadmillWidget({ d, width, height }: { d: WidgetData; width: number; height: number }) {
  const W = Math.max(180, width || 320);
  const H = Math.max(100, height || 180);
  const pad = 14;
  const inner = W - pad * 2;
  const tColor = stateColor(d.state);
  const todayLeft = Math.max(0, d.goal - d.todayKm);
  const weekLeft = Math.max(0, d.weekGoal - d.weekKm);
  const todayExtra = todayLeft > 0 ? `faltan ${n1(todayLeft)} km` : 'cumplido';
  const weekExtra = weekLeft > 0 ? `faltan ${n1(weekLeft)} km` : '¡semana cumplida!';

  const root: FlexWidgetStyle = {
    height: 'match_parent',
    width: 'match_parent',
    backgroundColor: '#0E0E10',
    borderRadius: 28,
    padding: pad,
    flexDirection: 'column',
    flexGap: 10,
  };

  // ---------- Pequeño: números + barras de progreso ----------
  if (H < 170) {
    const barW = Math.floor((inner - 12) / 2) - 4;
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ ...root, justifyContent: 'space-between', flexGap: 6 }}>
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 12 }}>
          {[
            ['HOY', d.todayKm, d.goal, TEXT],
            ['SEMANA', d.weekKm, d.weekGoal, TEXT],
          ].map(([l, v, g, c]) => (
            <FlexWidget key={String(l)} style={{ flex: 1, flexDirection: 'column', flexGap: 3 }}>
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 4 }}>
                <TextWidget text={n1(Number(v))} style={{ fontSize: 24, color: c as `#${string}`, fontWeight: '800' }} />
                <TextWidget text={`/ ${n1(Number(g))} ${l === 'HOY' ? 'hoy' : 'sem'}`} style={{ fontSize: 11, color: SUB }} />
              </FlexWidget>
              <SvgWidget svg={progressSvg(barW, 6, Number(g) ? Number(v) / Number(g) : 0)} style={{ width: barW, height: 6 }} />
            </FlexWidget>
          ))}
        </FlexWidget>
        {H >= 130 ? <TextWidget text={d.title} maxLines={1} truncate="END" style={{ fontSize: 12, color: tColor, fontWeight: '800' }} /> : null}
        <Buttons h={34} iconOnly={W < 300} />
      </FlexWidget>
    );
  }

  // ---------- Mediano y grande: anillos ----------
  const large = H >= 330;
  const btnH = large ? 48 : 40;
  const colW = (inner - 10) / 2;
  const showText = colW >= 150;
  const ringMax = large ? 110 : Math.min(96, H - 150);
  const ring = Math.max(56, Math.min(ringMax, showText ? colW - 110 : colW - 20));
  const ringRowH = ring + 20;

  // Espacio que queda para el gráfico semanal
  const msgH = 44;
  const chartH = H - pad * 2 - ringRowH - msgH - btnH - 10 * 3;
  const showChart = chartH >= 90;
  const svgH = Math.floor(chartH - 44);

  return (
    <FlexWidget clickAction="OPEN_APP" style={root}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 10 }}>
        <RingStat label="HOY" value={d.todayKm} goal={d.goal} ring={ring} showText={showText} color={TEXT} extra={todayExtra} />
        <RingStat label="SEMANA" value={d.weekKm} goal={d.weekGoal} ring={ring} showText={showText} color={TEXT} extra={weekExtra} />
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={d.title} maxLines={1} truncate="END" style={{ fontSize: 15, color: tColor, fontWeight: '800' }} />
          <TextWidget text={d.sub} maxLines={1} truncate="END" style={{ fontSize: 12, color: SUB }} />
        </FlexWidget>
        {d.streak > 0 ? (
          <FlexWidget style={{ backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}>
            <TextWidget text={`Racha ${d.streak}`} style={{ fontSize: 12, color: SUB, fontWeight: '700' }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>

      {showChart ? (
        <FlexWidget style={{ width: 'match_parent', flex: 1, backgroundColor: CARD, borderRadius: 22, padding: 12, flexDirection: 'column', flexGap: 6 }}>
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextWidget text="ESTA SEMANA" style={{ fontSize: 11, color: SUB, fontWeight: '700' }} />
            <TextWidget text={`${Math.round(d.weekMinutes)} min · línea = ${n1(d.goal)} km/día`} style={{ fontSize: 11, color: SUB }} />
          </FlexWidget>
          <SvgWidget svg={weekBarsSvg(inner - 24, svgH, d.days, d.dayIndex, d.goal)} style={{ width: inner - 24, height: svgH }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flex: 1 }} />
      )}

      <Buttons h={btnH} iconOnly={W < 280} />
    </FlexWidget>
  );
}
