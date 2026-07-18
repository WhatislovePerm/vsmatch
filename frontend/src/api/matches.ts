import type { CreateMatchRequest, Match, MatchTeam, SportKind, SubmitMatchResultRequest, UpdateMatchRequest } from '../types';
import { authFetch, throwApiError } from './client';

export async function fetchMatches(sport: SportKind, courtId?: string): Promise<Match[]> {
  const params = new URLSearchParams({ sport });
  if (courtId) params.set('courtId', courtId);
  const res = await authFetch(`/api/matches?${params.toString()}`);
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить матчи');
  return res.json();
}

export async function fetchMyMatchHistory(sport: SportKind): Promise<Match[]> {
  const res = await authFetch(`/api/matches/me/history?sport=${encodeURIComponent(sport)}`);
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить историю');
  return res.json();
}

export async function fetchMatchByInvite(inviteCode: string): Promise<Match> {
  const res = await authFetch(`/api/matches/invite/${encodeURIComponent(inviteCode)}`);
  if (!res.ok) await throwApiError(res, 'Не удалось открыть приглашение');
  return res.json();
}

export async function createMatch(req: CreateMatchRequest): Promise<Match> {
  const res = await authFetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось создать матч');
  return res.json();
}

export async function updateMatch(id: string, req: UpdateMatchRequest): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось обновить матч');
  return res.json();
}

export async function deleteMatch(id: string): Promise<void> {
  const res = await authFetch(`/api/matches/${id}`, { method: 'DELETE' });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить матч');
}

export async function joinMatch(id: string, team: MatchTeam): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}/players/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось войти в матч');
  return res.json();
}

export async function joinMatchByInvite(inviteCode: string, team: MatchTeam): Promise<Match> {
  const res = await authFetch(`/api/matches/invite/${encodeURIComponent(inviteCode)}/players/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось присоединиться по приглашению');
  return res.json();
}

export async function shuffleTeams(id: string): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}/teams/shuffle`, { method: 'POST' });
  if (!res.ok) await throwApiError(res, 'Не удалось перемешать команды');
  return res.json();
}

export async function submitMatchResult(id: string, req: SubmitMatchResultRequest): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить результат');
  return res.json();
}

export async function leaveMatch(id: string): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}/players/me`, { method: 'DELETE' });
  if (!res.ok) await throwApiError(res, 'Не удалось покинуть матч');
  return res.json();
}

/**
 * Читает SSE через fetch, чтобы JWT передавался в Authorization header,
 * а не в query string, который может попасть в access-логи и историю.
 */
export async function streamMatchEvents(
  onMatchesChanged: () => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await authFetch('/api/matches/events', {
    headers: { Accept: 'text/event-stream' },
    signal,
  });
  if (!res.ok) await throwApiError(res, 'Не удалось подключить обновления матчей');
  if (!res.body) throw new Error('Браузер не поддерживает потоковые обновления');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');

    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const eventBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const eventName = eventBlock
        .split('\n')
        .find((line) => line.startsWith('event:'))
        ?.slice('event:'.length)
        .trim();

      if (eventName === 'matches-changed') onMatchesChanged();
      boundary = buffer.indexOf('\n\n');
    }
  }
}
