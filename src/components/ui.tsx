import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { C, GRAD, R } from './theme';

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
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  if (variant === 'primary')
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}>
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          <Text style={[s.btnText, { color: '#06100A' }]}>{title}</Text>
        </LinearGradient>
      </Pressable>
    );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, s.ghost, variant === 'danger' && { borderColor: C.danger }, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      <Text style={[s.btnText, { color: variant === 'danger' ? C.danger : C.text }]}>{title}</Text>
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

export function Chip({ label, active, onPress, color = C.lime }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[s.chipText, active && { color }]}>{label}</Text>
    </Pressable>
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

/** Anillo de progreso con degradado */
export function Ring({ size = 210, stroke = 18, progress, center, caption }: { size?: number; stroke?: number; progress: number; center: string; caption: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGrad id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.lime} />
          <Stop offset="1" stopColor={C.cyan} />
        </SvgGrad>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#g)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circ * p} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <SvgText x={size / 2} y={size / 2 + 8} fill={C.text} fontSize={44} fontWeight="800" textAnchor="middle">
        {center}
      </SvgText>
      <SvgText x={size / 2} y={size / 2 + 34} fill={C.sub} fontSize={13} textAnchor="middle">
        {caption}
      </SvgText>
    </Svg>
  );
}

/** Barras verticales simples */
export function Bars({
  values,
  labels,
  highlight,
  height = 130,
  width = 320,
  goalLine,
}: {
  values: number[];
  labels: string[];
  highlight?: number;
  height?: number;
  width?: number;
  goalLine?: number;
}) {
  const max = Math.max(...values, goalLine ?? 0, 0.1);
  const n = values.length;
  const gap = 10;
  const bw = (width - gap * (n - 1)) / n;
  const top = 18;
  const chartH = height - top - 20;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id="b" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={C.cyan} />
          <Stop offset="1" stopColor={C.lime} />
        </SvgGrad>
      </Defs>
      {goalLine ? (
        <Rect x={0} y={top + chartH - (goalLine / max) * chartH} width={width} height={1} fill={C.dim} opacity={0.6} />
      ) : null}
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(6, (v / max) * chartH) : 4;
        const x = i * (bw + gap);
        const y = top + chartH - h;
        const hi = i === highlight;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={bw} height={h} rx={Math.min(8, bw / 2)} fill={v > 0 ? 'url(#b)' : C.line} opacity={v > 0 && !hi && highlight !== undefined ? 0.75 : 1} />
            {v > 0 ? (
              <SvgText x={x + bw / 2} y={y - 5} fill={C.sub} fontSize={10} textAnchor="middle">
                {v >= 10 ? Math.round(v) : v.toFixed(1).replace('.', ',')}
              </SvgText>
            ) : null}
            <SvgText x={x + bw / 2} y={height - 4} fill={hi ? C.lime : C.dim} fontSize={11} fontWeight={hi ? '800' : '400'} textAnchor="middle">
              {labels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R, padding: 18, borderWidth: 1, borderColor: C.line },
  label: { color: C.sub, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  h1: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  ghost: { borderWidth: 1, borderColor: C.line, backgroundColor: C.bg2 },
  btnText: { fontSize: 16, fontWeight: '800' },
  fieldLabel: { color: C.sub, fontSize: 12, marginBottom: 6, fontWeight: '600' },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 },
  input: { flex: 1, color: C.text, fontSize: 17, paddingVertical: 12, fontWeight: '600' },
  suffix: { color: C.dim, fontSize: 14, marginLeft: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg2 },
  chipText: { color: C.sub, fontWeight: '700', fontSize: 14 },
  tile: { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.line },
  tileLabel: { color: C.sub, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  tileValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  tileUnit: { fontSize: 14, color: C.sub, fontWeight: '600' },
  tileSub: { color: C.dim, fontSize: 12, marginTop: 4 },
});
