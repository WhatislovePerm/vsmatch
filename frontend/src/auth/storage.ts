const TOKEN_KEY = 'vsmatch.token';
const EXPIRES_KEY = 'vsmatch.expiresAt';

export interface StoredToken {
  token: string;
  expiresAt: string;
}

export function saveToken(t: StoredToken) {
  localStorage.setItem(TOKEN_KEY, t.token);
  localStorage.setItem(EXPIRES_KEY, t.expiresAt);
}

export function loadToken(): StoredToken | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_KEY);
  if (!token || !expiresAt) return null;
  if (new Date(expiresAt).getTime() <= Date.now()) {
    clearToken();
    return null;
  }
  return { token, expiresAt };
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}
