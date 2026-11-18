import { Session, Settings } from './types';
import { completeTriad } from './calc';

export type SyncResult = { sessions: Session[]; tombstones: string[] };

type Remote = Omit<Session, 'createdAt' | 'syncedAt'>;

export class SyncError extends Error {}

/**
 * Sincroniza con la hoja de Google:
 * - sube lo que ha cambiado en el móvil desde la última sincronización y los borrados pendientes;
 * - la hoja aplica cada cambio solo si es más reciente que lo que tiene;
 * - devuelve la lista completa y aquí se fusiona (gana la versión más reciente).
 * Si una sesión ya sincronizada desaparece de la hoja, es que se borró allí → se borra aquí.
 */
export async function syncWithSheets(
  url: string,
  token: string,
  local: Session[],
  tombstones: string[],
  settings: Settings,
): Promise<SyncResult> {
  const upserts = local
    .filter((s) => !s.syncedAt || s.updatedAt > s.syncedAt)
    .map(({ syncedAt: _s, createdAt: _c, ...rest }) => rest);

  let res: Response;
  try {
    res = await fetch(url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token,
        upserts,
        deletes: tombstones,
        settings: { bodyWeightKg: settings.bodyWeightKg, inclinePct: settings.inclinePct, weeklyGoalKm: settings.weeklyGoalKm },
      }),
    });
  } catch {
    throw new SyncError('Sin conexión con Google. Se sincronizará más tarde.');
  }
  const text = await res.text();
  let json: { ok: boolean; error?: string; sessions?: Remote[] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new SyncError(
      'Google no ha devuelto datos. Revisa que la implementación sea "Aplicación web" con acceso para "Cualquier usuario" y que la URL acabe en /exec.',
    );
  }
  if (!json.ok) {
    if (json.error === 'token')
      throw new SyncError('La hoja está vinculada a otra instalación. En Apps Script ejecuta la función "resetToken" y vuelve a sincronizar.');
    throw new SyncError(`Error en la hoja: ${json.error}`);
  }

  const now = Date.now();
  const remote = new Map((json.sessions || []).map((r) => [r.id, r]));
  const localById = new Map(local.map((s) => [s.id, s]));
  const merged: Session[] = [];

  for (const l of local) {
    const r = remote.get(l.id);
    if (!r) {
      // No está en la hoja: si ya se había sincronizado, se borró allí.
      if (l.syncedAt) continue;
      merged.push(l); // no debería pasar (se acaba de subir), pero no perdemos nada
      continue;
    }
    if (r.updatedAt > l.updatedAt) merged.push({ ...fromRemote(r), createdAt: l.createdAt, syncedAt: now });
    else merged.push({ ...l, syncedAt: now });
  }
  for (const r of remote.values()) {
    if (!localById.has(r.id)) merged.push({ ...fromRemote(r), createdAt: r.updatedAt || now, syncedAt: now });
  }
  return { sessions: merged, tombstones: [] };
}

function fromRemote(r: Remote): Omit<Session, 'createdAt'> {
  const t = completeTriad({ minutes: r.minutes, speedKmh: r.speedKmh, distanceKm: r.distanceKm });
  return { ...r, ...t, updatedAt: r.updatedAt || Date.now() };
}

export function newToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}
