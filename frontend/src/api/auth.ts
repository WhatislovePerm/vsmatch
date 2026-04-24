import { authFetch } from './client';

export interface Me {
  userId: string;
  name: string;
  vkUserId: string;
  email: string | null;
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
