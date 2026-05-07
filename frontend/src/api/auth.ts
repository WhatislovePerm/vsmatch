import { authFetch } from './client';
import { saveToken } from '../auth/storage';

export interface Me {
  userId: string;
  name: string;
  vkUserId: string;
  email: string | null;
}

interface AuthResponse {
  accessToken: string;
  expiresAt: string;
}

export async function getAuthorizeUrl(): Promise<string> {
  const res = await fetch('/api/auth/vkid/url');
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
