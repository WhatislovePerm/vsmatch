import { clearToken, loadToken } from '../auth/storage';

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const stored = loadToken();
  const headers = new Headers(init.headers);
  if (stored) headers.set('Authorization', `Bearer ${stored.token}`);

  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/';
  }
  return res;
}
