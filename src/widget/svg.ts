/** Gráficos SVG para el widget (se pintan con AndroidSVG). */

const LIME = '#3DD598';
const CYAN = '#3DD598';
const LINE = '#26262B';
const SUB = '#A1A1AA';
const DIM = '#6B6B74';
const TEXT = '#F4F4F5';

const n1 = (v: number) => (v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

/** Anillo de progreso con el número en el centro */
export function ringSvg(size: number, progress: number, value: number, caption: string, from = LIME, to = CYAN) {
  const stroke = Math.max(6, Math.round(size * 0.1));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const p = Math.max(0, Math.min(1, progress));
  const circ = 2 * Math.PI * r;
  const big = Math.round(size * 0.27);
  const small = Math.max(9, Math.round(size * 0.1));
  const done = progress >= 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${LINE}" stroke-width="${stroke}"/>
${p > 0 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#g)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(circ * p).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>` : ''}
<text x="${c}" y="${c + big * 0.32}" fill="${TEXT}" font-family="sans-serif" font-weight="bold" font-size="${big}" text-anchor="middle">${n1(value)}</text>
<text x="${c}" y="${c + big * 0.32 + small * 1.5}" fill="${done ? LIME : SUB}" font-family="sans-serif" font-size="${small}" text-anchor="middle">${caption}</text>
</svg>`;
}

/** Barras L..D con valores y línea del objetivo diario */
export function weekBarsSvg(w: number, h: number, values: number[], highlight: number, dailyGoal: number) {
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const max = Math.max(...values, dailyGoal, 0.1);
  const gap = Math.max(6, w * 0.03);
  const bw = (w - gap * 6) / 7;
  const top = 16;
  const bottom = 16;
  const ch = h - top - bottom;
  const goalY = top + ch - (dailyGoal / max) * ch;
  let bars = '';
  values.forEach((v, i) => {
    const bh = v > 0 ? Math.max(4, (v / max) * ch) : 3;
    const x = i * (bw + gap);
    const y = top + ch - bh;
    const hi = i === highlight;
    const fill = v <= 0 ? LINE : v >= dailyGoal || hi ? LIME : '#2A6B52';
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(6, bw / 2).toFixed(1)}" fill="${fill}"/>`;
    if (v > 0)
      bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" fill="${SUB}" font-family="sans-serif" font-size="10" text-anchor="middle">${n1(v)}</text>`;
    bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 2}" fill="${hi ? LIME : DIM}" font-family="sans-serif" font-weight="${hi ? 'bold' : 'normal'}" font-size="11" text-anchor="middle">${labels[i]}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${CYAN}"/><stop offset="1" stop-color="${LIME}"/></linearGradient></defs>
<line x1="0" y1="${goalY.toFixed(1)}" x2="${w}" y2="${goalY.toFixed(1)}" stroke="${DIM}" stroke-width="1" stroke-dasharray="4 4"/>
${bars}
</svg>`;
}

/** Barra fina de progreso horizontal */
export function progressSvg(w: number, h: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${LIME}"/><stop offset="1" stop-color="${CYAN}"/></linearGradient></defs>
<rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" fill="${LINE}"/>
${p > 0 ? `<rect x="0" y="0" width="${Math.max(h, w * p).toFixed(1)}" height="${h}" rx="${h / 2}" fill="url(#p)"/>` : ''}
</svg>`;
}
