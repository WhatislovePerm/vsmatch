import type { SportKind } from '../types';
import { authFetch, throwApiError } from './client';

export interface AdminTopPlayer {
  userId: string;
  displayName: string;
  sport: SportKind;
  rating: number;
}

export interface AdminStats {
  users: number;
  courts: number;
  matches: number;
  activeMatches: number;
  completedMatches: number;
  cancelledMatches: number;
  newFeedback: number;
  topPlayers: AdminTopPlayer[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await authFetch('/api/admin/stats');
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить статистику');
  return res.json();
}
