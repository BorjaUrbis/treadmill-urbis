import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { C, R, themed } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        primary ? { backgroundColor: C.lime } : s.ghost,
        variant === 'danger' && { borderColor: C.danger + '55' },
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {icon}
      <Text style={[s.btnText, { color: primary ? C.onAccent : variant === 'danger' ? C.danger : C.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, suffix, ...p }: TextInputProps & { label: string; suffix?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 130 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.field}>
        <TextInput placeholderTextColor={C.dim} style={s.input} {...p} />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.text, borderColor: C.text }]}>
      <Text style={[s.chipText, active && { color: C.bg }]}>{label}</Text>
    </Pressable>
  );
}

/** Control segmentado (p. ej. Semana / Mes / 3 meses / Año) */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[s.segItem, value === v && s.segOn]}>
          <Text style={[s.segTxt, value === v && { color: C.text }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StatTile({ label, value, unit, color = C.text, sub }: { label: string; value: string; unit?: string; color?: string; sub?: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={[s.tileValue, { color }]}>
        {value}
        {unit ? <Text style={s.tileUnit}> {unit}</Text> : null}
      </Text>
      {sub ? <Text style={s.tileSub}>{sub}</Text> : null}
    </View>
  );
}

/** Anillo de progreso */
export function Ring({ size = 200, stroke = 14, progress, center, caption }: { size?: number; stroke?: number; progress: number; center: string; caption: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.cardHi} strokeWidth={stroke} fill="none" />
      {p > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.lime}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ * p} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
      <SvgText x={size / 2} y={size / 2 + 8} fill={C.text} fontSize={42} fontWeight="700" textAnchor="middle">
        {center}
      </SvgText>
      <SvgText x={size / 2} y={size / 2 + 32} fill={C.sub} fontSize={13} textAnchor="middle">
        {caption}
      </SvgText>
    </Svg>
  );
}

/** Barras verticales simples */
export function Bars({ values, labels, highlight, height = 130, width = 320 }: { values: number[]; labels: string[]; highlight?: number; height?: number; width?: number }) {
  const max = Math.max(...values, 0.1);
  const n = values.length;
  const gap = 10;
  const bw = (width - gap * (n - 1)) / n;
  const top = 18;
  const chartH = height - top - 20;
  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(6, (v / max) * chartH) : 4;
        const x = i * (bw + gap);
        const y = top + chartH - h;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={bw} height={h} rx={Math.min(6, bw / 2)} fill={v > 0 ? C.lime : C.cardHi} opacity={i === highlight || highlight === undefined ? 1 : 0.55} />
            <SvgText x={x + bw / 2} y={height - 4} fill={i === highlight ? C.text : C.dim} fontSize={11} textAnchor="middle">
              {labels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const s = themed(() =>
  StyleSheet.create({
    card: { backgroundColor: C.card, borderRadius: R, padding: 18, borderWidth: 1, borderColor: C.line },
    label: { color: C.sub, fontSize: 13, fontWeight: '600', marginBottom: 12 },
    h1: { color: C.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
    btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, flexDirection: 'row', gap: 8 },
    ghost: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
    btnText: { fontSize: 15, fontWeight: '600' },
    fieldLabel: { color: C.sub, fontSize: 12, marginBottom: 6, fontWeight: '500' },
    field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 },
    input: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 11, fontWeight: '500' },
    suffix: { color: C.dim, fontSize: 13, marginLeft: 6 },
    chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
    chipText: { color: C.sub, fontWeight: '600', fontSize: 13 },
    seg: { flexDirection: 'row', backgroundColor: C.cardHi, borderRadius: 12, padding: 3 },
    segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
    segOn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
    segTxt: { color: C.sub, fontWeight: '600', fontSize: 13 },
    tile: { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.line },
    tileLabel: { color: C.sub, fontSize: 12, fontWeight: '500', marginBottom: 6 },
    tileValue: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
    tileUnit: { fontSize: 13, color: C.sub, fontWeight: '500' },
    tileSub: { color: C.dim, fontSize: 12, marginTop: 4 },
  }),
);
