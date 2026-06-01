import { useCallback, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { fetchCourts } from './api/courts';
import {
  createMatch,
  fetchMatchByInvite,
  fetchMatches,
  fetchMyMatchHistory,
  joinMatch,
  joinMatchByInvite,
  leaveMatch,
  submitMatchResult,
  updateMatch,
} from './api/matches';
import { getMe, updateProfile, type Me } from './api/auth';
import { clearToken, loadToken } from './auth/storage';
import { CourtMap } from './components/CourtMap';
import { CourtCard } from './components/CourtCard';
import { Login } from './components/Login';
import { AuthCallback, FullScreenLoader } from './components/AuthCallback';
import { Badge, Button, IconButton } from './components/ui';
import { ProfilePanel } from './components/ProfilePanel';
import type { Court, Match, MatchTeam, SubmitMatchResultRequest } from './types';

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
  const [myMatchHistory, setMyMatchHistory] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Court | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingInviteMatch, setPendingInviteMatch] = useState<Match | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const loadHistorySafely = useCallback(async () => {
    try {
      return await fetchMyMatchHistory();
    } catch {
      return [];
    }
  }, []);

  const reloadCourtsAndMatches = useCallback(async () => {
    const [courtsRes, matchesRes] = await Promise.all([
      fetchCourts(),
      fetchMatches(),
    ]);
    setCourts(courtsRes);
    setMatches(matchesRes);
    const historyRes = await loadHistorySafely();
    setMyMatchHistory(historyRes);
  }, [loadHistorySafely]);

  const loadUserAndCourts = useCallback(async () => {
    // Шаг 1: проверка авторизации. Только её провал валит сессию.
    let meRes: Me;
    try {
      meRes = await getMe();
    } catch {
      clearToken();
      setLoginError(null);
      setView('login');
      return;
    }
    setMe(meRes);

    // Шаг 2: данные приложения. Ошибки тут НЕ должны логаутить юзера.
    let courtsRes: Court[] = [];
    try {
      const [c, m] = await Promise.all([fetchCourts(), fetchMatches()]);
      courtsRes = c;
      setCourts(c);
      setMatches(m);
    } catch (e) {
      console.warn('Не удалось загрузить площадки/матчи', e);
    }

    try {
      const historyRes = await loadHistorySafely();
      setMyMatchHistory(historyRes);
    } catch (e) {
      console.warn('Не удалось загрузить историю матчей', e);
    }

    // Шаг 3: pending invite — тоже не критично. Протухшую ссылку просто чистим.
    const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
    if (pendingInvite) {
      try {
        const invited = await fetchMatchByInvite(pendingInvite);
        window.history.replaceState(null, '', '/');
        setPendingInviteMatch(invited);
        const court = courtsRes.find((c) => c.id === invited.courtId);
        if (court) setSelected(court);
      } catch {
        localStorage.removeItem(PENDING_INVITE_KEY);
        window.history.replaceState(null, '', '/');
      }
    }

    setView('app');
  }, [loadHistorySafely]);

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
    const stored = loadToken();
    if (!stored) return;

    let reloadTimer: number | undefined;
    const scheduleReload = () => {
      if (reloadTimer !== undefined) return;
      reloadTimer = window.setTimeout(() => {
        reloadTimer = undefined;
        reloadCourtsAndMatches().catch(() => undefined);
      }, 150);
    };

    const events = new EventSource(`/api/matches/events?access_token=${encodeURIComponent(stored.token)}`);
    events.addEventListener('matches-changed', scheduleReload);
    events.onerror = () => {
      // Никогда не выкидываем юзера в логин из-за SSE — это всего лишь live-обновления.
      // EventSource сам попробует переподключиться; при стойком CLOSED просто отпускаем.
      if (events.readyState === EventSource.CLOSED) {
        events.close();
      }
    };
    return () => {
      if (reloadTimer !== undefined) window.clearTimeout(reloadTimer);
      events.close();
    };
  }, [view, reloadCourtsAndMatches]);

  const handleLogout = () => {
    clearToken();
    setMe(null);
    setCourts([]);
    setMatches([]);
    setMyMatchHistory([]);
    setSelected(null);
    setView('login');
  };

  const handleJoinInvite = async (team: MatchTeam) => {
    if (!pendingInviteMatch) return;
    setInviteBusy(true);
    try {
      const joined = await joinMatchByInvite(pendingInviteMatch.inviteCode, team);
      localStorage.removeItem(PENDING_INVITE_KEY);
      setPendingInviteMatch(null);
      await reloadCourtsAndMatches();
      const court = courts.find((c) => c.id === joined.courtId);
      if (court) setSelected(court);
    } finally {
      setInviteBusy(false);
    }
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

  return (
    <div className="h-screen flex flex-col bg-page">
      <header className="bg-white/90 backdrop-blur-md border-b border-line z-[1100] shadow-[0_1px_0_rgba(31,44,65,0.02)]">
        <div className="px-3 sm:px-7 py-2.5 sm:py-3.5">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[14px] bg-ink-3 text-white flex items-center justify-center text-[18px] shrink-0">
                ⚽
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-bold text-[15px] sm:text-[17px] tracking-tight text-ink truncate">
                  VSMatch
                </span>
                <span className="text-[11px] text-muted hidden sm:block">Москва · САО</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {me && (
                <Badge tone="info" className="shrink-0 whitespace-nowrap">
                  Рейтинг: {Math.round(me.rating)} 
                </Badge>
              )}
              {me && (
                <>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-subtle border border-line hover:bg-line/60 transition-colors min-w-0 max-w-[190px]"
                  >
                    <div className="w-6 h-6 rounded-full bg-ink-3 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {(me.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="text-[13px] font-medium text-ink-2 truncate">
                      {me.name}
                    </span>
                  </button>
                  <IconButton
                    onClick={() => setProfileOpen(true)}
                    aria-label="Профиль"
                    variant="subtle"
                    className="sm:hidden"
                  >
                    <span className="text-[12px] font-bold text-ink-2">
                      {(me.name?.[0] ?? '?').toUpperCase()}
                    </span>
                  </IconButton>
                </>
              )}
              <IconButton onClick={handleLogout} aria-label="Выйти" variant="subtle">
                <LogOut size={16} />
              </IconButton>
            </div>
          </div>
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
            currentUserId={me?.userId ?? null}
            onClose={() => setSelected(null)}
            onCreateMatch={async (input) => {
              await createMatch({ courtId: selected.id, ...input });
              await reloadCourtsAndMatches();
            }}
            onJoinMatch={async (match, team) => {
              await joinMatch(match.id, team);
              await reloadCourtsAndMatches();
            }}
            onLeaveMatch={async (match) => {
              await leaveMatch(match.id);
              await reloadCourtsAndMatches();
            }}
            onCancelMatch={async (match) => {
              await updateMatch(match.id, {
                courtId: match.courtId,
                title: match.title,
                description: match.description,
                teamAName: match.teamAName,
                teamBName: match.teamBName,
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
                teamAName: match.teamAName,
                teamBName: match.teamBName,
                startsAtUtc: match.startsAtUtc,
                durationMinutes: match.durationMinutes,
                maxPlayers: match.maxPlayers,
                status: 'InProgress',
              });
              await reloadCourtsAndMatches();
            }}
            onSubmitResult={async (match, result: SubmitMatchResultRequest) => {
              await submitMatchResult(match.id, result);
              await reloadCourtsAndMatches();
            }}
          />
        )}
        {profileOpen && me && (
          <ProfilePanel
            me={me}
            history={myMatchHistory}
            onClose={() => setProfileOpen(false)}
            onSave={async (displayName) => {
              await updateProfile(displayName);
              const freshMe = await getMe();
              setMe(freshMe);
              await reloadCourtsAndMatches();
            }}
          />
        )}
        {pendingInviteMatch && (
          <InviteJoinPanel
            match={pendingInviteMatch}
            busy={inviteBusy}
            onJoin={handleJoinInvite}
            onClose={() => {
              localStorage.removeItem(PENDING_INVITE_KEY);
              setPendingInviteMatch(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

function InviteJoinPanel({
  match,
  busy,
  onJoin,
  onClose,
}: {
  match: Match;
  busy: boolean;
  onJoin: (team: MatchTeam) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[1300] bg-ink/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] bg-white border border-line rounded-[28px] shadow-[0_20px_60px_-20px_rgba(31,44,65,0.35)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-wider text-muted">
              Приглашение
            </div>
            <h2 className="mt-1 text-[20px] font-bold text-ink">{match.title}</h2>
            <p className="mt-1 text-[13px] text-muted">
              Принять приглашение и присоединиться к матчу 1×1.
            </p>
          </div>
          <IconButton onClick={onClose} aria-label="Закрыть">×</IconButton>
        </div>
        <div className="mt-5">
          <Button block disabled={busy} onClick={() => onJoin('TeamB')}>
            Присоединиться
          </Button>
        </div>
      </div>
    </div>
  );
}
