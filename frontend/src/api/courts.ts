import type { Court } from '../types';
import { authFetch } from './client';

export async function fetchCourts(): Promise<Court[]> {
  const res = await authFetch('/api/courts');
  if (!res.ok) throw new Error(`Failed to load courts: ${res.status}`);
  return res.json();
}
