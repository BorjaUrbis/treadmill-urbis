import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGrad, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { C } from './theme';

const fmt1 = (v: number) => (v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

/** Barras con selección al tocar: muestra el valor exacto arriba */
export function TapBars({
  values,
  labels,
  tipLabels,
  highlight,
  width,
  height = 150,
  goalLine,
  unit = 'km',
}: {
  values: number[];
  labels: string[];
  tipLabels: string[];
  highlight?: number;
  width: number;
  height?: number;
  goalLine?: number;
  unit?: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(...values, goalLine ?? 0, 0.1);
  const n = values.length;
  const gap = n > 20 ? 3 : n > 10 ? 6 : 10;
  const bw = (width - gap * (n - 1)) / n;
  const top = 8;
  const chartH = height - top - 20;
  const showVals = n <= 13;
  return (
    <View>
      <View style={st.tipRow}>
        {sel !== null ? (
          <Text style={st.tip}>
            {tipLabels[sel]}: <Text style={{ color: C.lime }}>{fmt1(values[sel])} {unit}</Text>
          </Text>
        ) : (
          <Text style={st.tipHint}>Toca una barra para ver el dato</Text>
        )}
      </View>
      <View>
        <Svg width={width} height={height}>
          <Defs>
            <SvgGrad id="tb" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={C.cyan} />
              <Stop offset="1" stopColor={C.lime} />
            </SvgGrad>
          </Defs>
          {goalLine ? <Rect x={0} y={top + chartH - (goalLine / max) * chartH} width={width} height={1} fill={C.dim} /> : null}
          {values.map((v, i) => {
            const h = v > 0 ? Math.max(4, (v / max) * chartH) : 3;
            const x = i * (bw + gap);
            const y = top + chartH - h;
            const active = sel === i || (sel === null && i === highlight);
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y} width={bw} height={h} rx={Math.min(6, bw / 2)} fill={v > 0 ? 'url(#tb)' : C.line} opacity={v > 0 && !active ? 0.55 : 1} />
                {showVals && v > 0 ? (
                  <SvgText x={x + bw / 2} y={Math.max(10, y - 4)} fill={C.sub} fontSize={10} textAnchor="middle">
                    {fmt1(v)}
                  </SvgText>
                ) : null}
                <SvgText x={x + bw / 2} y={height - 4} fill={active ? C.lime : C.dim} fontSize={10} fontWeight={active ? '800' : '400'} textAnchor="middle">
                  {labels[i]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {values.map((_, i) => (
            <Pressable key={i} style={{ flex: 1 }} onPress={() => setSel(sel === i ? null : i)} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Km acumulados de la semana vs ritmo necesario para el objetivo */
export function PaceLine({ cumulative, goal, width, height = 160 }: { cumulative: (number | null)[]; goal: number; width: number; height?: number }) {
  const max = Math.max(goal, ...cumulative.map((x) => x ?? 0), 0.1) * 1.08;
  const padL = 4;
  const padB = 20;
  const chartH = height - padB - 8;
  const step = (width - padL * 2) / 6;
  const X = (i: number) => padL + i * step;
  const Y = (v: number) => 8 + chartH - (v / max) * chartH;
  const pts = cumulative.map((v, i) => (v === null ? null : [X(i), Y(v)])).filter(Boolean) as number[][];
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = pts.length ? `${path} L${pts[pts.length - 1][0]},${Y(0)} L${pts[0][0]},${Y(0)} Z` : '';
  const last = pts[pts.length - 1];
  const lastIdx = pts.length - 1;
  const expected = goal * ((lastIdx + 1) / 7);
  const actual = cumulative[lastIdx] ?? 0;
  const ahead = actual - expected;
  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGrad id="pa" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.lime} stopOpacity={0.35} />
            <Stop offset="1" stopColor={C.lime} stopOpacity={0} />
          </SvgGrad>
        </Defs>
        <Line x1={X(0)} y1={Y(goal / 7)} x2={X(6)} y2={Y(goal)} stroke={C.dim} strokeWidth={2} strokeDasharray="6 6" />
        {area ? <Path d={area} fill="url(#pa)" /> : null}
        {path ? <Path d={path} stroke={C.lime} strokeWidth={3} fill="none" strokeLinejoin="round" /> : null}
        {pts.map((p, i) => (
          <Circle key={i} cx={p[0]} cy={p[1]} r={i === lastIdx ? 5 : 3} fill={i === lastIdx ? C.lime : C.bg} stroke={C.lime} strokeWidth={2} />
        ))}
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <SvgText key={d + i} x={X(i)} y={height - 4} fill={i === lastIdx ? C.lime : C.dim} fontSize={11} textAnchor="middle">
            {d}
          </SvgText>
        ))}
        {last ? (
          <SvgText x={Math.min(last[0] + 8, width - 50)} y={last[1] - 8} fill={C.text} fontSize={12} fontWeight="800">
            {fmt1(actual)} km
          </SvgText>
        ) : null}
      </Svg>
      <Text style={[st.paceTxt, { color: ahead >= 0 ? C.lime : C.orange }]}>
        {ahead >= 0 ? `Vas ${fmt1(ahead)} km por delante del ritmo 💪` : `Vas ${fmt1(-ahead)} km por detrás del ritmo`}
      </Text>
      <Text style={st.legend}>— — ritmo para llegar a {fmt1(goal)} km el domingo</Text>
    </View>
  );
}

/** Mapa de calor tipo GitHub: columnas = semanas, filas = L..D */
export function Heatmap({
  kmByDay,
  weeks,
  lastWeekStart,
  addDays,
  width,
}: {
  kmByDay: Record<string, number>;
  weeks: number;
  lastWeekStart: string;
  addDays: (iso: string, n: number) => string;
  width: number;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const labelW = 16;
  const gap = 3;
  const cell = Math.min(18, (width - labelW - gap * (weeks - 1)) / weeks);
  const first = addDays(lastWeekStart, -7 * (weeks - 1));
  const vals = Object.values(kmByDay);
  const max = Math.max(...vals, 1);
  const color = (km: number) => {
    if (!km) return C.line;
    const t = km / max;
    if (t < 0.25) return '#2E5A1E';
    if (t < 0.5) return '#4F8F25';
    if (t < 0.75) return '#86C930';
    return C.lime;
  };
  const cells: { d: string; x: number; y: number }[] = [];
  for (let w = 0; w < weeks; w++) for (let r = 0; r < 7; r++) cells.push({ d: addDays(first, w * 7 + r), x: labelW + w * (cell + gap), y: r * (cell + gap) });
  const h = 7 * (cell + gap);
  return (
    <View>
      <Svg width={width} height={h}>
        {['L', '', 'X', '', 'V', '', 'D'].map((l, r) => (
          <SvgText key={r} x={0} y={r * (cell + gap) + cell * 0.8} fill={C.dim} fontSize={9}>
            {l}
          </SvgText>
        ))}
        {cells.map((c) => (
          <Rect key={c.d} x={c.x} y={c.y} width={cell} height={cell} rx={3} fill={color(kmByDay[c.d] || 0)} stroke={sel === c.d ? C.text : 'none'} strokeWidth={1.5} />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', paddingLeft: labelW }]}>
        {Array.from({ length: weeks }).map((_, w) => (
          <View key={w} style={{ width: cell + gap }}>
            {Array.from({ length: 7 }).map((__, r) => {
              const d = addDays(first, w * 7 + r);
              return <Pressable key={r} style={{ height: cell + gap }} onPress={() => setSel(sel === d ? null : d)} />;
            })}
          </View>
        ))}
      </View>
      <Text style={st.legend}>
        {sel ? `${sel.split('-').reverse().join('/')}: ${fmt1(kmByDay[sel] || 0)} km` : `Últimas ${weeks} semanas · más verde = más km`}
      </Text>
    </View>
  );
}

/** Línea simple para una serie (p. ej. velocidad media por semana) */
export function MiniLine({ values, labels, width, height = 120, color = C.cyan, unit = '' }: { values: number[]; labels: string[]; width: number; height?: number; color?: string; unit?: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const present = values.map((v, i) => [i, v] as const).filter(([, v]) => v > 0);
  const vs = present.map(([, v]) => v);
  const min = vs.length ? Math.min(...vs) * 0.9 : 0;
  const max = vs.length ? Math.max(...vs) * 1.05 : 1;
  const n = values.length;
  const padB = 18;
  const X = (i: number) => 6 + (i * (width - 12)) / Math.max(1, n - 1);
  const Y = (v: number) => 8 + (height - padB - 8) * (1 - (v - min) / Math.max(0.01, max - min));
  const path = present.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i)},${Y(v)}`).join(' ');
  return (
    <View>
      <Text style={st.tipHint}>
        {sel !== null ? `${labels[sel]}: ${values[sel] ? fmt1(values[sel]) + ' ' + unit : 'sin datos'}` : 'Toca un punto'}
      </Text>
      <View>
        <Svg width={width} height={height}>
          {path ? <Path d={path} stroke={color} strokeWidth={2.5} fill="none" /> : null}
          {present.map(([i, v]) => (
            <Circle key={i} cx={X(i)} cy={Y(v)} r={sel === i ? 5 : 3} fill={color} />
          ))}
          {labels.map((l, i) =>
            i % 2 === 0 || i === n - 1 ? (
              <SvgText key={i} x={X(i)} y={height - 3} fill={C.dim} fontSize={9} textAnchor="middle">
                {l}
              </SvgText>
            ) : null,
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {values.map((_, i) => (
            <Pressable key={i} style={{ flex: 1 }} onPress={() => setSel(sel === i ? null : i)} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Barra horizontal repartida en segmentos */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <View style={{ gap: 8 }}>
      <View style={st.split}>
        {parts.map((p) =>
          p.value > 0 ? <View key={p.label} style={{ flex: p.value / total, backgroundColor: p.color }} /> : null,
        )}
        {parts.every((p) => !p.value) ? <View style={{ flex: 1, backgroundColor: C.line }} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {parts.map((p) => (
          <Text key={p.label} style={st.legendItem}>
            <Text style={{ color: p.color }}>● </Text>
            {p.label} {Math.round((p.value / total) * 100)}%
          </Text>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  tipRow: { height: 20, marginBottom: 4 },
  tip: { color: C.text, fontWeight: '700', fontSize: 13 },
  tipHint: { color: C.dim, fontSize: 12, marginBottom: 4 },
  paceTxt: { fontWeight: '800', fontSize: 14, marginTop: 8 },
  legend: { color: C.dim, fontSize: 12, marginTop: 6 },
  split: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: C.line },
  legendItem: { color: C.sub, fontSize: 12, fontWeight: '600' },
});
