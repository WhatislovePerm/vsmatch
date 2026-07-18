export type Theme = 'light' | 'dark';

const THEME_KEY = 'toploc.theme';

/** Дефолт — светлая: тема меняется только вручную тумблером в профиле. */
export function loadTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

/** Вызывается один раз при старте приложения. */
export function initTheme() {
  applyTheme(loadTheme());
}
