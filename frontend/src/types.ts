export type SportKind = 'Football' | 'Basketball' | 'TableTennis';

export interface SportConfig {
  kind: SportKind;
  label: string;
  emoji: string;
}

export const SPORTS: SportConfig[] = [
  { kind: 'Football',    label: 'Футбол',    emoji: '⚽' },
  { kind: 'Basketball',  label: 'Баскетбол', emoji: '🏀' },
  { kind: 'TableTennis', label: 'Теннис',    emoji: '🏓' },
];

export const DEFAULT_SPORT: SportKind = 'Football';

export interface Court {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  lat: number;
  lon: number;
  sport: SportKind;
  surface: string | null;
  rating: number | null;
  isFree: boolean;
}

export type MatchStatus = 'Scheduled' | 'Ready' | 'InProgress' | 'Completed' | 'Cancelled';
export type MatchTeam = 'TeamA' | 'TeamB';

export interface Match {
  id: string;
  courtId: string;
  courtName: string;
  createdByUserId: string;
  sport: SportKind;
  inviteCode: string;
  inviteUrl: string;
  title: string;
  description: string | null;
  teamAName: string;
  teamBName: string;
  startsAtUtc: string;
  durationMinutes: number;
  maxPlayers: number;
  currentPlayers: number;
  players: MatchPlayer[];
  status: MatchStatus;
  teamAScore: number | null;
  teamBScore: number | null;
  resultSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface MatchPlayer {
  userId: string;
  displayName: string;
  team: MatchTeam;
  goals: number;
  assists: number;
  rating: number;
  ratingDelta: number;
  joinedAt: string;
}

export interface CreateMatchRequest {
  courtId: string;
  title: string;
  description: string | null;
  teamAName: string | null;
  teamBName: string | null;
  startsAtUtc: string;
  durationMinutes: number;
  maxPlayers: number;
}

export interface UpdateMatchRequest extends CreateMatchRequest {
  status: MatchStatus;
}

export interface SubmitMatchResultRequest {
  teamAScore: number;
  teamBScore: number;
  players: Array<{
    userId: string;
    goals: number;
    assists: number;
  }>;
}
