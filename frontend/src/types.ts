export interface Court {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lon: number;
  sport: string | null;
  surface: string | null;
  rating: number | null;
  isFree: boolean;
}

export type MatchStatus = 'Scheduled' | 'Ready' | 'InProgress' | 'Completed' | 'Cancelled';

export interface Match {
  id: string;
  courtId: string;
  courtName: string;
  createdByUserId: string;
  inviteCode: string;
  inviteUrl: string;
  title: string;
  description: string | null;
  startsAtUtc: string;
  durationMinutes: number;
  maxPlayers: number;
  currentPlayers: number;
  players: MatchPlayer[];
  status: MatchStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface MatchPlayer {
  userId: string;
  displayName: string;
  joinedAt: string;
}

export interface CreateMatchRequest {
  courtId: string;
  title: string;
  description: string | null;
  startsAtUtc: string;
  durationMinutes: number;
  maxPlayers: number;
}

export interface UpdateMatchRequest extends CreateMatchRequest {
  status: MatchStatus;
}
