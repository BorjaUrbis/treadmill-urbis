/**
 * Tema de la app: paleta clara y oscura, sobria, con un único color de acento.
 * `C` es un objeto mutable: al cambiar de tema se reescriben sus valores y la app
 * se vuelve a montar, así que todo lo que lee `C` al pintar se actualiza.
 * Las hojas de estilo se crean con `themed(() => StyleSheet.create(...))` para que
 * se regeneren con la paleta nueva.
 */
export type ThemeMode = 'light' | 'dark';

type Palette = {
  bg: string;
  bg2: string;
  card: string;
  cardHi: string;
  line: string;
  text: string;
  sub: string;
  dim: string;
  /** acento principal */
  lime: string;
  /** acento secundario, apagado (semana, segundas series) */
  cyan: string;
  /** neutros con un toque de color para repartos */
  pink: string;
  orange: string;
  violet: string;
  danger: string;
  onAccent: string;
  accentSoft: string;
  overlay: string;
};

const LIGHT: Palette = {
  bg: '#F6F6F4',
  bg2: '#FFFFFF',
  card: '#FFFFFF',
  cardHi: '#F1F1EE',
  line: '#E6E5E1',
  text: '#1A1A1C',
  sub: '#6B6B72',
  dim: '#A3A3A8',
  lime: '#12A36B',
  cyan: '#5B7083',
  pink: '#C2708A',
  orange: '#C8852D',
  violet: '#7A72B8',
  danger: '#D64545',
  onAccent: '#FFFFFF',
  accentSoft: '#12A36B1A',
  overlay: '#0008',
};

const DARK: Palette = {
  bg: '#0E0E10',
  bg2: '#151518',
  card: '#17171A',
  cardHi: '#1E1E22',
  line: '#26262B',
  text: '#F4F4F5',
  sub: '#A1A1AA',
  dim: '#6B6B74',
  lime: '#3DD598',
  cyan: '#8A9BAD',
  pink: '#D58BA3',
  orange: '#D9A15A',
  violet: '#9C95D4',
  danger: '#F06A6A',
  onAccent: '#08130E',
  accentSoft: '#3DD5981F',
  overlay: '#000B',
};

export const PALETTES: Record<ThemeMode, Palette> = { light: LIGHT, dark: DARK };

export const C: Palette = { ...DARK };
/** Antes era un degradado; ahora es color plano (mismo color dos veces) */
export const GRAD: [string, string] = [DARK.lime, DARK.lime];
export const R = 20;

let version = 0;
let current: ThemeMode = 'dark';

export function applyTheme(mode: ThemeMode) {
  if (mode === current && version > 0) return;
  current = mode;
  Object.assign(C, PALETTES[mode]);
  GRAD[0] = C.lime;
  GRAD[1] = C.lime;
  version++;
}

export function currentTheme() {
  return current;
}

/** Hoja de estilos que se regenera cuando cambia el tema */
export function themed<T extends object>(factory: () => T): T {
  let cache: { v: number; val: T } | null = null;
  return new Proxy({} as T, {
    get(_t, key) {
      if (!cache || cache.v !== version) cache = { v: version, val: factory() };
      return (cache.val as Record<string | symbol, unknown>)[key];
    },
  });
}
