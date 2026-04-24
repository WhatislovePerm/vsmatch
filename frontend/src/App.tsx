import { useCallback, useEffect, useState } from 'react';
import { fetchCourts } from './api/courts';
import { getMe, type Me } from './api/auth';
import { clearToken, loadToken } from './auth/storage';
import { CourtMap } from './components/CourtMap';
import { CourtCard } from './components/CourtCard';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
import type { Court } from './types';

type View = 'callback' | 'login' | 'app' | 'loading';

function detectInitialView(): View {
  if (window.location.pathname === '/auth/callback') return 'callback';
  return loadToken() ? 'loading' : 'login';
}

export default function App() {
  const [view, setView] = useState<View>(detectInitialView);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selected, setSelected] = useState<Court | null>(null);

  const loadUserAndCourts = useCallback(async () => {
    try {
      const [meRes, courtsRes] = await Promise.all([getMe(), fetchCourts()]);
      setMe(meRes);
      setCourts(courtsRes);
      setView('app');
    } catch (e) {
      clearToken();
      setLoginError(String(e));
      setView('login');
    }
  }, []);

  /*const loadUserAndCourts = useCallback(async () => {
  try {
    const courtsRes = await fetchCourts();
    setCourts(courtsRes);

    const meRes = await getMe().catch(() => null);
    setMe(meRes);

    setView('app');
  } catch (e) {
    setCourts([]);
    setView('app'); // 👈 не выкидываем в login
  }
}, []);*/


  useEffect(() => {
    if (view === 'loading') loadUserAndCourts();
  }, [view, loadUserAndCourts]);

  const handleLogout = () => {
    clearToken();
    setMe(null);
    setCourts([]);
    setSelected(null);
    setView('login');
  };

  if (view === 'callback') {
    return (
      <AuthCallback
        onError={(err) => {
          setLoginError(err);
          setView('login');
        }}
        onSuccess={() => setView('loading')}
      />
    );
  }

  if (view === 'login') return <Login error={loginError} />;

  if (view === 'loading') {
    return (
      <div className="login">
        <div className="login__card">
          <div className="login__logo">⚽</div>
          <p className="login__subtitle">Загружаем…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo">⚽</span>
          <span>VSMatch</span>
        </div>
        <div className="app__header-right">
          <span className="app__stat">{courts.length} коробок</span>
          {me && <span className="app__user">{me.name}</span>}
          <button className="app__logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>

      <main className="app__main">
        <CourtMap
          courts={courts}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
        {selected && (
          <CourtCard court={selected} onClose={() => setSelected(null)} />
        )}
      </main>
    </div>
  );
}
