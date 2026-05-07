import { useCallback, useEffect, useState } from 'react';
import { fetchCourts } from './api/courts';
import { createMatch, fetchMatches, joinMatchByInvite, updateMatch } from './api/matches';
import { getMe, type Me } from './api/auth';
import { clearToken, loadToken } from './auth/storage';
import { CourtMap } from './components/CourtMap';
import { CourtCard } from './components/CourtCard';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
import type { Court, Match } from './types';

type View = 'callback' | 'login' | 'app' | 'loading';
const PENDING_INVITE_KEY = 'vsmatch.pendingInvite';

function detectInitialView(): View {
  if (window.location.pathname === '/auth/callback') return 'callback';
  const inviteCode = getInviteCodeFromPath();
  if (inviteCode) localStorage.setItem(PENDING_INVITE_KEY, inviteCode);
  return loadToken() ? 'loading' : 'login';
}

function getInviteCodeFromPath(): string | null {
  const match = window.location.pathname.match(/^\/matches\/join\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  const [view, setView] = useState<View>(detectInitialView);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Court | null>(null);

  const loadUserAndCourts = useCallback(async () => {
    try {
      const [meRes, courtsRes, matchesRes] = await Promise.all([getMe(), fetchCourts(), fetchMatches()]);
      setMe(meRes);
      setCourts(courtsRes);
      setMatches(matchesRes);
      const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
      if (pendingInvite) {
        const joined = await joinMatchByInvite(pendingInvite);
        localStorage.removeItem(PENDING_INVITE_KEY);
        window.history.replaceState(null, '', '/');
        const [freshCourts, freshMatches] = await Promise.all([fetchCourts(), fetchMatches()]);
        setCourts(freshCourts);
        setMatches(freshMatches);
        const court = freshCourts.find((c) => c.id === joined.courtId);
        if (court) setSelected(court);
      }
      setView('app');
    } catch (e) {
      clearToken();
      setLoginError(String(e));
      setView('login');
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const nextSelected = courts.find((court) => court.id === selected.id);
    if (nextSelected) setSelected(nextSelected);
  }, [courts, selected]);

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

  useEffect(() => {
    if (view !== 'app') return;
    const events = new EventSource('/api/matches/events');
    events.addEventListener('matches-changed', () => {
      reloadCourtsAndMatches().catch(() => undefined);
    });
    return () => events.close();
  }, [view]);

  const handleLogout = () => {
    clearToken();
    setMe(null);
    setCourts([]);
    setMatches([]);
    setSelected(null);
    setView('login');
  };

  const reloadCourtsAndMatches = async () => {
    const [courtsRes, matchesRes] = await Promise.all([fetchCourts(), fetchMatches()]);
    setCourts(courtsRes);
    setMatches(matchesRes);
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
          <span className="app__stat">{courts.filter((c) => c.isFree).length} свободно</span>
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
          <CourtCard
            court={selected}
            matches={matches.filter((m) => m.courtId === selected.id)}
            onClose={() => setSelected(null)}
            onCreateMatch={async (input) => {
              await createMatch({ courtId: selected.id, ...input });
              await reloadCourtsAndMatches();
            }}
            onCancelMatch={async (match) => {
              await updateMatch(match.id, {
                courtId: match.courtId,
                title: match.title,
                description: match.description,
                startsAtUtc: match.startsAtUtc,
                durationMinutes: match.durationMinutes,
                maxPlayers: match.maxPlayers,
                status: 'Cancelled',
              });
              await reloadCourtsAndMatches();
            }}
            onStartMatch={async (match) => {
              await updateMatch(match.id, {
                courtId: match.courtId,
                title: match.title,
                description: match.description,
                startsAtUtc: match.startsAtUtc,
                durationMinutes: match.durationMinutes,
                maxPlayers: match.maxPlayers,
                status: 'InProgress',
              });
              await reloadCourtsAndMatches();
            }}
          />
        )}
      </main>
    </div>
  );
}
