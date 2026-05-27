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

/** Кидает ошибку с человеческим сообщением из тела { error: { message } }. */
export async function throwApiError(res: Response, fallback: string): Promise<never> {
  let message: string | undefined;
  try {
    const body = await res.json() as { error?: { message?: string } | string };
    if (typeof body?.error === 'string') message = body.error;
    else if (body?.error && typeof body.error === 'object') message = body.error.message;
  } catch {
    /* ignore — тело может быть пустым или не JSON */
  }
  throw new Error(message || fallback);
}
