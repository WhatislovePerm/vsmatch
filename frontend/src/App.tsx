import { useCallback, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { fetchCourts } from './api/courts';
import { createMatch, fetchMatches, joinMatchByInvite, updateMatch } from './api/matches';
import { getMe, type Me } from './api/auth';
import { clearToken, loadToken } from './auth/storage';
import { CourtMap } from './components/CourtMap';
import { CourtCard } from './components/CourtCard';
import { Login } from './components/Login';
import { AuthCallback, FullScreenLoader } from './components/AuthCallback';
import { Badge, IconButton } from './components/ui';
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

  const reloadCourtsAndMatches = useCallback(async () => {
    const [courtsRes, matchesRes] = await Promise.all([fetchCourts(), fetchMatches()]);
    setCourts(courtsRes);
    setMatches(matchesRes);
  }, []);

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
  }, [view, reloadCourtsAndMatches]);

  const handleLogout = () => {
    clearToken();
    setMe(null);
    setCourts([]);
    setMatches([]);
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
  if (view === 'loading') return <FullScreenLoader />;

  const freeCount = courts.filter((c) => c.isFree).length;

  return (
    <div className="h-screen flex flex-col bg-[--color-page]">
      <header className="flex items-center justify-between px-5 sm:px-7 py-3.5 bg-[--color-card]/90 backdrop-blur-md border-b border-[--color-line] z-[1100] shadow-[0_1px_0_rgba(31,44,65,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[14px] bg-[--color-ink-3] text-white flex items-center justify-center text-[18px]">
            ⚽
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-[15px] tracking-tight text-[--color-ink]">VSMatch</span>
            <span className="text-[11px] text-[--color-muted] hidden sm:block">Москва · САО</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge tone="neutral" className="hidden sm:inline-flex">
            {courts.length} коробок
          </Badge>
          <Badge tone={freeCount > 0 ? 'success' : 'neutral'}>
            {freeCount} свободно
          </Badge>
          {me && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--color-subtle] border border-[--color-line]">
              <div className="w-6 h-6 rounded-full bg-[--color-ink-3] text-white flex items-center justify-center text-[11px] font-semibold">
                {(me.name?.[0] ?? '?').toUpperCase()}
              </div>
              <span className="text-[13px] font-medium text-[--color-ink-2] max-w-[140px] truncate">
                {me.name}
              </span>
            </div>
          )}
          <IconButton onClick={handleLogout} aria-label="Выйти" variant="subtle">
            <LogOut size={16} />
          </IconButton>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
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
