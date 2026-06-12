import { authFetch } from './client';
import { saveToken } from '../auth/storage';
import type { SportKind } from '../types';

export interface Me {
  userId: string;
  name: string;
  vkUserId: string;
  email: string | null;
  isAdmin: boolean;
  ratings: Record<SportKind, number>;
}

interface AuthResponse {
  accessToken: string;
  expiresAt: string;
}

export async function getAuthorizeUrl(invite?: string | null): Promise<string> {
  const qs = invite ? `?invite=${encodeURIComponent(invite)}` : '';
  const res = await fetch(`/api/auth/vkid/url${qs}`);
  if (!res.ok) throw new Error(`Failed to get VK authorize URL: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export async function getMe(): Promise<Me> {
  const res = await authFetch('/api/auth/me');
  if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`);
  return res.json();
}

export async function updateProfile(displayName: string): Promise<AuthResponse> {
  const res = await authFetch('/api/auth/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
  const auth = await res.json() as AuthResponse;
  saveToken({ token: auth.accessToken, expiresAt: auth.expiresAt });
  return auth;
}
