import { useCallback, useEffect, useRef, useState } from 'react';
import { HelpCircle, LogOut } from 'lucide-react';
import { fetchCourts } from './api/courts';
import {
  createMatch,
  fetchMatches,
  fetchMyMatchHistory,
  joinMatch,
  joinMatchByInvite,
  leaveMatch,
  submitMatchResult,
  updateMatch,
} from './api/matches';
import { getMe, updateProfile, type Me } from './api/auth';
import { clearToken, loadToken, PENDING_INVITE_KEY } from './auth/storage';
import { CourtMap } from './components/CourtMap';
import { CourtCard } from './components/CourtCard';
import { Login } from './components/Login';
import { AuthCallback, FullScreenLoader } from './components/AuthCallback';
import { IconButton } from './components/ui';
import { ProfilePanel } from './components/ProfilePanel';
import { SportSwitcher } from './components/SportSwitcher';
import { FeedbackModal } from './components/FeedbackModal';
import { RatingBadge } from './components/RatingBadge';
import { Logo } from './components/icons/Logo';
import { useSport } from './sport/SportContext';
import type { Court, Match, SubmitMatchResultRequest } from './types';

type View = 'callback' | 'login' | 'app' | 'loading';

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
  const { sport, setSport } = useSport();
  const [view, setView] = useState<View>(detectInitialView);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [myMatchHistory, setMyMatchHistory] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Court | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // id матча, карточку которого юзер закрыл вручную — не реоткрываем его автоматически
  const dismissedMatchIdRef = useRef<string | null>(null);

  const loadHistorySafely = useCallback(async () => {
    try {
      return await fetchMyMatchHistory(sport);
    } catch {
      return [];
    }
  }, [sport]);

  const reloadCourtsAndMatches = useCallback(async () => {
    const [courtsRes, matchesRes] = await Promise.all([
      fetchCourts(sport),
      fetchMatches(sport),
    ]);
    setCourts(courtsRes);
    setMatches(matchesRes);
    const historyRes = await loadHistorySafely();
    setMyMatchHistory(historyRes);
  }, [loadHistorySafely, sport]);

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
    try {
      const [c, m] = await Promise.all([fetchCourts(sport), fetchMatches(sport)]);
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

    // Шаг 3: pending invite — сразу присоединяем (перешёл по ссылке = хочет играть).
    // Если юзер уже в этом матче (например, сам создатель) — бэкенд вернёт матч без ошибки.
    const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
    if (pendingInvite) {
      localStorage.removeItem(PENDING_INVITE_KEY);
      window.history.replaceState(null, '', '/');
      try {
        const joined = await joinMatchByInvite(pendingInvite, 'TeamB');
        if (joined.sport !== sport) {
          // Матч по другому спорту — переключаем, авто-открытие подхватит корт.
          setSport(joined.sport);
        } else {
          const [c, m] = await Promise.all([fetchCourts(sport), fetchMatches(sport)]);
          setCourts(c);
          setMatches(m);
          const court = c.find((x) => x.id === joined.courtId);
          if (court) setSelected(court);
        }
      } catch (e) {
        setInviteError((e as Error)?.message ?? 'Не удалось присоединиться к матчу');
      }
    }

    setView('app');
  }, [loadHistorySafely, sport, setSport]);

  useEffect(() => {
    if (!selected) return;
    const nextSelected = courts.find((court) => court.id === selected.id);
    if (nextSelected) setSelected(nextSelected);
    else setSelected(null);   // если переключили спорт — площадка стала недоступной
  }, [courts, selected]);

  useEffect(() => {
    if (view === 'loading') loadUserAndCourts();
  }, [view, loadUserAndCourts]);

  // При смене спорта перезагружаем данные (и сбрасываем выбранную площадку).
  useEffect(() => {
    if (view !== 'app') return;
    setSelected(null);
    reloadCourtsAndMatches().catch(() => undefined);
  }, [sport, view, reloadCourtsAndMatches]);

  useEffect(() => {
    if (view !== 'app') return;
    const stored = loadToken();
    if (!stored) return;

    let reloadTimer: number | undefined;
    let events: EventSource | null = null;
    let disposed = false;

    const scheduleReload = () => {
      if (reloadTimer !== undefined) return;
      reloadTimer = window.setTimeout(() => {
        reloadTimer = undefined;
        reloadCourtsAndMatches().catch(() => undefined);
      }, 150);
    };

    const connect = () => {
      if (disposed) return;
      events?.close();
      events = new EventSource(`/api/matches/events?access_token=${encodeURIComponent(stored.token)}`);
      events.addEventListener('matches-changed', scheduleReload);
      events.onerror = () => {
        // Никогда не выкидываем юзера в логин из-за SSE — это всего лишь live-обновления.
        // EventSource сам реконнектится; при стойком CLOSED переподключимся на visibilitychange.
        if (events?.readyState === EventSource.CLOSED) events.close();
      };
    };

    // Свёрнутый браузер (особенно мобильный) убивает SSE-соединение.
    // При возврате вкладки: тянем свежие данные и пересоздаём стрим, если он умер.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleReload();
      if (!events || events.readyState === EventSource.CLOSED) connect();
    };

    connect();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (reloadTimer !== undefined) window.clearTimeout(reloadTimer);
      events?.close();
    };
  }, [view, reloadCourtsAndMatches]);

  // Если у юзера есть активный матч — авто-открываем карточку его площадки,
  // чтобы не искать её на карте. Ручное закрытие запоминаем per-match.
  useEffect(() => {
    if (view !== 'app' || !me) return;
    const myActive = matches.find(
      (m) =>
        (m.status === 'Scheduled' || m.status === 'Ready' || m.status === 'InProgress') &&
        m.players.some((p) => p.userId === me.userId),
    );
    if (!myActive || dismissedMatchIdRef.current === myActive.id) return;
    if (selected?.id === myActive.courtId) return;

    const court = courts.find((c) => c.id === myActive.courtId);
    if (court) setSelected(court);
  }, [view, me, matches, courts, selected]);

  const handleCloseCourtCard = () => {
    if (selected && me) {
      const myActiveHere = matches.find(
        (m) =>
          m.courtId === selected.id &&
          (m.status === 'Scheduled' || m.status === 'Ready' || m.status === 'InProgress') &&
          m.players.some((p) => p.userId === me.userId),
      );
      if (myActiveHere) dismissedMatchIdRef.current = myActiveHere.id;
    }
    setSelected(null);
  };

  const handleLogout = () => {
    clearToken();
    setMe(null);
    setCourts([]);
    setMatches([]);
    setMyMatchHistory([]);
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

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-page">
      <header className="shrink-0 bg-white/90 backdrop-blur-md border-b border-line z-[1100] shadow-[0_1px_0_rgba(31,44,65,0.02)]">
        <div className="px-3 sm:px-7 py-2.5 sm:py-3.5">
          <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[12px] sm:rounded-[14px] bg-ink-3 text-white flex items-center justify-center shrink-0">
                <Logo size={23} />
              </div>
              <div className="hidden sm:flex flex-col leading-tight min-w-0">
                <span className="font-bold text-[15px] sm:text-[17px] tracking-tight text-ink truncate">
                  TopLoc
                </span>
                <span className="text-[11px] text-muted">Москва · САО</span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <SportSwitcher />
              {me && (
                <RatingBadge rating={me.ratings?.[sport] ?? 750} className="shrink-0" />
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
              <IconButton onClick={() => setFeedbackOpen(true)} aria-label="Обратная связь" variant="subtle">
                <HelpCircle size={16} />
              </IconButton>
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
            onClose={handleCloseCourtCard}
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
        {feedbackOpen && (
          <FeedbackModal onClose={() => setFeedbackOpen(false)} />
        )}
        {inviteError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1300] max-w-md px-4 py-3 rounded-[14px] bg-danger-bg border border-danger-line text-danger text-[13px] shadow-md flex items-start gap-2">
            <span className="break-words">{inviteError}</span>
            <button
              type="button"
              className="shrink-0 font-bold opacity-70 hover:opacity-100"
              onClick={() => setInviteError(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
