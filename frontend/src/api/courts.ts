import type { Court, SportKind } from '../types';
import { authFetch, throwApiError } from './client';

export async function fetchCourts(sport: SportKind): Promise<Court[]> {
  const res = await authFetch(`/api/courts?sport=${encodeURIComponent(sport)}`);
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить площадки');
  return res.json();
}
