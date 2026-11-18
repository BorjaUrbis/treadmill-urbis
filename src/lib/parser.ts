import { addDays, nowTime, todayISO, DAY_NAMES, dayOfWeek } from './dates';
import { completeTriad } from './calc';
import { SessionDraft } from './types';

export const CLAUDE_MODEL = 'claude-haiku-5-5';

const TOOL = {
  name: 'registrar_sesiones',
  description: 'Registra una o varias sesiones de cinta de andar a partir de lo que ha dicho el usuario.',
  input_schema: {
    type: 'object',
    properties: {
      sesiones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fecha: { type: 'string', description: 'YYYY-MM-DD' },
            hora_fin: { type: ['string', 'null'], description: 'HH:MM en 24 h, o null si no se sabe' },
            minutos: { type: ['number', 'null'] },
            velocidad_kmh: { type: ['number', 'null'] },
            distancia_km: { type: ['number', 'null'] },
            kcal_pantalla: { type: ['number', 'null'], description: 'Solo si el usuario dice lo que marca la cinta' },
            descalzo: { type: ['boolean', 'null'] },
            carga_kg: { type: 'number', description: 'Peso extra (mochila, chaleco). 0 si no lleva' },
            notas: { type: 'string', description: 'Nota breve en español con detalles útiles (pausas, velocidad variable...)' },
          },
          required: ['fecha', 'carga_kg', 'notas'],
        },
      },
      aclaracion: {
        type: ['string', 'null'],
        description: 'Pregunta breve si falta algo importante que no se pueda deducir; si no, null',
      },
    },
    required: ['sesiones'],
  },
};

function systemPrompt() {
  const today = todayISO();
  return `Eres el asistente de la app Treadmill Urbis. El usuario dicta por voz, en español coloquial, lo que ha caminado en su cinta (km/h y km).
Hoy es ${DAY_NAMES[dayOfWeek(today)]} ${today} y son las ${nowTime()}. Ayer fue ${addDays(today, -1)}.
Reglas:
- Si describe varios tramos distintos (p. ej. primero sin carga y luego con mochila), crea una sesión por tramo.
- Si da dos de (tiempo, velocidad, distancia), calcula el tercero. Si dice que la velocidad fue variable, usa la media que indique.
- Si da hora de inicio en vez de fin, calcula la hora de fin con la duración. Tramos seguidos: el segundo empieza cuando acaba el primero.
- "Tarde" sin hora concreta: deja hora_fin null. Si dice "ahora" o "acabo de terminar", usa la hora actual.
- Las calorías de la pantalla solo si las dice; si dice que la cinta se reinició o el dato es parcial, ponlo en notas y deja kcal_pantalla null.
- descalzo: true/false solo si lo dice; si no, null.
- Si te pasan una foto, los datos de la foto mandan; lo que diga el usuario los completa (carga, descalzo, fecha...).
- No inventes datos. Usa siempre la herramienta registrar_sesiones.`;
}

export type ParseResult = { drafts: SessionDraft[]; question: string | null; source: 'claude' | 'local' };

type ToolSession = {
  fecha: string;
  hora_fin?: string | null;
  minutos?: number | null;
  velocidad_kmh?: number | null;
  distancia_km?: number | null;
  kcal_pantalla?: number | null;
  descalzo?: boolean | null;
  carga_kg?: number;
  notas?: string;
};

export type ImageInput = { base64: string; mediaType: 'image/jpeg' | 'image/png' };

export async function parseWithClaude(text: string, apiKey: string, image?: ImageInput | null): Promise<ParseResult> {
  const content: unknown[] = [];
  if (image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } });
    content.push({
      type: 'text',
      text:
        'Esta es una foto de la pantalla de la cinta (o de una app) con los datos de la sesión. Lee tiempo, distancia, velocidad y calorías. ' +
        'Las calorías que salen en la foto van en kcal_pantalla. Si el tiempo aparece como mm:ss o hh:mm:ss, conviértelo a minutos.' +
        (text ? `\nAdemás, el usuario dice: "${text}"` : '\nEl usuario no ha añadido nada más: la fecha es hoy y la hora de fin es ahora, salvo que la foto diga otra cosa.'),
    });
  } else content.push({ type: 'text', text });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt(),
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) throw new Error('La clave de API no es válida. Revísala en Ajustes.');
    if (res.status === 400 && body.includes('credit')) throw new Error('Tu cuenta de API no tiene saldo.');
    throw new Error(`Error de Claude (${res.status})`);
  }
  const json = await res.json();
  const block = (json.content || []).find((b: { type: string }) => b.type === 'tool_use');
  if (!block) throw new Error('Claude no ha devuelto datos');
  const input = block.input as { sesiones: ToolSession[]; aclaracion?: string | null };
  const drafts = (input.sesiones || []).map((s) => {
    const triad = completeTriad({ minutes: s.minutos, speedKmh: s.velocidad_kmh, distanceKm: s.distancia_km });
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(s.fecha) ? s.fecha : todayISO(),
      endTime: s.hora_fin && /^\d{1,2}:\d{2}$/.test(s.hora_fin) ? s.hora_fin.padStart(5, '0') : null,
      ...triad,
      kcalScreen: s.kcal_pantalla ?? null,
      barefoot: s.descalzo ?? null,
      loadKg: s.carga_kg || 0,
      notes: s.notas || '',
    } satisfies SessionDraft;
  });
  return { drafts, question: input.aclaracion ?? null, source: 'claude' };
}

// ---------- Intérprete local (sin IA) ----------

const WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, noventa: 90,
  media: 0.5,
};

function normalize(t: string) {
  let s = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/(\d+) y medio/g, (_, n) => String(Number(n) + 0.5));
  for (const [w, n] of Object.entries(WORDS)) s = s.replace(new RegExp(`\\b${w}\\b`, 'g'), String(n));
  s = s.replace(/(\d+) (?:coma|punto) (\d+)/g, '$1.$2');
  return s;
}

const num = (m: RegExpMatchArray | null, i = 1) => (m ? Number(m[i]) : null);

export function parseLocal(text: string): ParseResult {
  const s = normalize(text);
  const speed = num(s.match(/(\d+(?:\.\d+)?)\s*(?:km\/h|kilometros por hora|km por hora|por hora|kmh)/)) ??
    num(s.match(/velocidad (?:de |media de )?(\d+(?:\.\d+)?)/));
  const sNoSpeed = s.replace(/(\d+(?:\.\d+)?)\s*(?:km\/h|kilometros por hora|km por hora|por hora|kmh)/g, '');
  const dist = num(sNoSpeed.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometros|kilometro|kms)\b/));
  let minutes: number | null = null;
  const hm = s.match(/(\d+(?:\.\d+)?)\s*horas?(?:\s*y\s*(\d+)\s*min)?/);
  if (hm && !/a las/.test(s.slice(Math.max(0, (hm.index ?? 0) - 6), hm.index))) {
    minutes = Number(hm[1]) * 60 + (hm[2] ? Number(hm[2]) : 0);
  }
  const mm = s.match(/(\d+)\s*(?:minutos|min)\b/);
  if (mm && minutes === null) minutes = Number(mm[1]);
  const kcal = num(s.match(/(\d+)\s*(?:calorias|kcal|cal)\b/));
  const load = num(s.match(/(\d+(?:\.\d+)?)\s*(?:kilos|kg|kilogramos)/)) ?? num(s.match(/mochila de (\d+)/));
  let barefoot: boolean | null = null;
  if (/descalz/.test(s)) barefoot = !/no (?:he ido |voy |iba |fui )?descalz/.test(s);
  if (/zapatill|calzado/.test(s) && barefoot === null) barefoot = false;
  let date = todayISO();
  if (/anteayer/.test(s)) date = addDays(date, -2);
  else if (/\bayer\b/.test(s)) date = addDays(date, -1);
  let endTime: string | null = null;
  const at = s.match(/(?:acabado|terminado|acabe|termine|hasta|fin)\D{0,15}a las (\d{1,2})(?::(\d{2})| y (\d{1,2}))?/) ??
    s.match(/a las (\d{1,2})(?::(\d{2})| y (\d{1,2}))?/);
  if (/ahora|acabo de (?:terminar|acabar)/.test(s)) endTime = nowTime();
  if (at) {
    let h = Number(at[1]);
    const m = Number(at[2] || at[3] || 0);
    if (h < 12 && /tarde|noche/.test(s)) h += 12;
    endTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const triad = completeTriad({ minutes, speedKmh: speed, distanceKm: dist });
  const drafts: SessionDraft[] =
    triad.minutes || triad.distanceKm
      ? [{ date, endTime, ...triad, kcalScreen: kcal, barefoot, loadKg: load || 0, notes: '' }]
      : [];
  return {
    drafts,
    question: drafts.length ? null : 'No he pillado los datos. Di por ejemplo: "5 km a 3 por hora, descalzo".',
    source: 'local',
  };
}
