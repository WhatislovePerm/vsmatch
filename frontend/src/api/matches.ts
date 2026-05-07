import type { CreateMatchRequest, Match, UpdateMatchRequest } from '../types';
import { authFetch } from './client';

export async function fetchMatches(courtId?: string): Promise<Match[]> {
  const qs = courtId ? `?courtId=${encodeURIComponent(courtId)}` : '';
  const res = await authFetch(`/api/matches${qs}`);
  if (!res.ok) throw new Error(`Failed to load matches: ${res.status}`);
  return res.json();
}

export async function fetchMatchByInvite(inviteCode: string): Promise<Match> {
  const res = await authFetch(`/api/matches/invite/${encodeURIComponent(inviteCode)}`);
  if (!res.ok) throw new Error(`Failed to load match invite: ${res.status}`);
  return res.json();
}

export async function createMatch(req: CreateMatchRequest): Promise<Match> {
  const res = await authFetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Failed to create match: ${res.status}`);
  return res.json();
}

export async function updateMatch(id: string, req: UpdateMatchRequest): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Failed to update match: ${res.status}`);
  return res.json();
}

export async function deleteMatch(id: string): Promise<void> {
  const res = await authFetch(`/api/matches/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete match: ${res.status}`);
}

export async function joinMatch(id: string): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}/players/me`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to join match: ${res.status}`);
  return res.json();
}

export async function joinMatchByInvite(inviteCode: string): Promise<Match> {
  const res = await authFetch(`/api/matches/invite/${encodeURIComponent(inviteCode)}/players/me`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to join match by invite: ${res.status}`);
  return res.json();
}

export async function leaveMatch(id: string): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}/players/me`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to leave match: ${res.status}`);
  return res.json();
}
