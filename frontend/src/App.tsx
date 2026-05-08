import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, History, LogOut, Map } from 'lucide-react';
import { fetchCourts } from './api/courts';
import {
  createMatch,
  fetchMatchByInvite,
  fetchMatches,
  fetchMyMatchHistory,
  joinMatch,
  joinMatchByInvite,
  shuffleTeams,
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
import type { Court, Match, MatchPlayer, MatchTeam, SubmitMatchResultRequest } from './types';

type View = 'callback' | 'login' | 'app' | 'loading';
type AppTab = 'map' | 'history';
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
  const [appTab, setAppTab] = useState<AppTab>('map');

  const reloadCourtsAndMatches = useCallback(async () => {
    const [courtsRes, matchesRes, historyRes] = await Promise.all([
      fetchCourts(),
      fetchMatches(),
      fetchMyMatchHistory(),
    ]);
    setCourts(courtsRes);
    setMatches(matchesRes);
    setMyMatchHistory(historyRes);
  }, []);

  const loadUserAndCourts = useCallback(async () => {
    try {
      const [meRes, courtsRes, matchesRes, historyRes] = await Promise.all([
        getMe(),
        fetchCourts(),
        fetchMatches(),
        fetchMyMatchHistory(),
      ]);
      setMe(meRes);
      setCourts(courtsRes);
      setMatches(matchesRes);
      setMyMatchHistory(historyRes);
      const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
      if (pendingInvite) {
        const invited = await fetchMatchByInvite(pendingInvite);
        window.history.replaceState(null, '', '/');
        setPendingInviteMatch(invited);
        const court = courtsRes.find((c) => c.id === invited.courtId);
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
    setMyMatchHistory([]);
    setSelected(null);
    setAppTab('map');
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

  const freeCount = courts.filter((c) => c.isFree).length;
  return (
    <div className="h-screen flex flex-col bg-page">
      <header className="flex items-center justify-between gap-3 px-3 sm:px-7 py-2.5 sm:py-3.5 bg-white/90 backdrop-blur-md border-b border-line z-[1100] shadow-[0_1px_0_rgba(31,44,65,0.02)]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[14px] bg-ink-3 text-white flex items-center justify-center text-[18px] shrink-0">
            ⚽
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-[15px] tracking-tight text-ink">VSMatch</span>
            <span className="text-[11px] text-muted hidden sm:block">Москва · САО</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-3 min-w-0">
          <nav className="inline-grid grid-cols-2 rounded-[14px] bg-subtle border border-line p-0.5">
            <button
              type="button"
              onClick={() => {
                setAppTab('map');
              }}
              className={[
                'h-8 px-2.5 sm:px-3 rounded-[11px] text-[12px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5',
                appTab === 'map' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              <Map size={13} />
              <span className="hidden min-[420px]:inline">Карта</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setAppTab('history');
              }}
              className={[
                'h-8 px-2.5 sm:px-3 rounded-[11px] text-[12px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5',
                appTab === 'history' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              <History size={13} />
              <span className="hidden min-[420px]:inline">История</span>
            </button>
          </nav>
          <Badge tone="neutral" className="hidden sm:inline-flex">
            {courts.length} коробок
          </Badge>
          <Badge tone={freeCount > 0 ? 'success' : 'neutral'} className="hidden min-[380px]:inline-flex">
            {freeCount} свободно
          </Badge>
          {me && (
            <>
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-subtle border border-line hover:bg-line/60 transition-colors min-w-0"
              >
                <div className="w-6 h-6 rounded-full bg-ink-3 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {(me.name?.[0] ?? '?').toUpperCase()}
                </div>
                <span className="text-[13px] font-medium text-ink-2 max-w-[140px] truncate">
                  {me.name}
                </span>
              </button>
              <IconButton
                onClick={() => setProfileOpen(true)}
                aria-label="Профиль"
                variant="subtle"
                className="md:hidden"
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
      </header>

      <main className="flex-1 relative overflow-hidden">
        {appTab === 'map' ? (
          <CourtMap
            courts={courts}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        ) : (
          <PlayerHistoryView
            matches={myMatchHistory}
            currentUserId={me?.userId ?? null}
          />
        )}
        {appTab === 'map' && selected && (
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
            onShuffleTeams={async (match) => {
              await shuffleTeams(match.id);
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
            onSubmitResult={async (match, result: SubmitMatchResultRequest) => {
              await submitMatchResult(match.id, result);
              await reloadCourtsAndMatches();
            }}
          />
        )}
        {profileOpen && me && (
          <ProfilePanel
            me={me}
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

function PlayerHistoryView({
  matches,
  currentUserId,
}: {
  matches: Match[];
  currentUserId: string | null;
}) {
  const completedCount = matches.filter((match) => match.status === 'Completed').length;

  return (
    <section className="h-full overflow-y-auto thin-scroll bg-page px-3 sm:px-7 py-4 sm:py-7">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-wider text-muted">
              Личная история
            </div>
            <h1 className="mt-1 text-[24px] sm:text-[30px] font-bold tracking-tight text-ink">
              Матчи игрока
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Badge tone="neutral">{matches.length} всего</Badge>
            <Badge tone="success">{completedCount} завершено</Badge>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white border border-line rounded-[28px] p-6 sm:p-8 text-center shadow-[0_4px_20px_-8px_rgba(31,44,65,0.08)]">
            <div className="mx-auto w-11 h-11 rounded-[16px] bg-subtle flex items-center justify-center text-muted">
              <History size={22} />
            </div>
            <h2 className="mt-4 text-[18px] font-bold text-ink">Истории пока нет</h2>
            <p className="mt-1 text-[13px] text-muted">
              Завершенные и отмененные матчи появятся здесь после участия.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {matches.map((match) => (
              <PlayerHistoryCard
                key={match.id}
                match={match}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PlayerHistoryCard({
  match,
  currentUserId,
}: {
  match: Match;
  currentUserId: string | null;
}) {
  const me = match.players.find((player) => player.userId === currentUserId);
  const teamA = match.players.filter((player) => player.team === 'TeamA');
  const teamB = match.players.filter((player) => player.team === 'TeamB');
  const completed = match.status === 'Completed';
  const finishedAt = match.resultSubmittedAt ?? match.updatedAt ?? match.createdAt;

  return (
    <article className="bg-white border border-line rounded-[24px] p-4 sm:p-5 shadow-[0_4px_20px_-8px_rgba(31,44,65,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-ink truncate">{match.title}</div>
          <div className="mt-1 text-[12.5px] text-muted truncate">
            {match.courtName} · {new Date(finishedAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <Badge tone={completed ? 'success' : 'neutral'} iconLeft={completed ? <CircleCheck size={13} /> : undefined}>
          {completed ? 'Завершён' : 'Отменён'}
        </Badge>
      </div>

      {completed && (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[16px] bg-subtle border border-line p-3">
          <div className="text-[12px] font-semibold text-muted text-right">Команда A</div>
          <div className="text-[22px] font-bold text-ink tabular-nums">
            {match.teamAScore ?? 0}:{match.teamBScore ?? 0}
          </div>
          <div className="text-[12px] font-semibold text-muted">Команда B</div>
        </div>
      )}

      {me && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <HistoryStat label="Голы" value={me.goals} />
          <HistoryStat label="Пасы" value={me.assists} />
          <HistoryStat
            label="Рейтинг"
            value={`${me.ratingDelta > 0 ? '+' : ''}${Math.round(me.ratingDelta)}`}
            tone={me.ratingDelta >= 0 ? 'positive' : 'negative'}
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 min-[440px]:grid-cols-2 gap-2">
        <HistoryTeam title="Команда A" players={teamA} currentUserId={currentUserId} />
        <HistoryTeam title="Команда B" players={teamB} currentUserId={currentUserId} />
      </div>
    </article>
  );
}

function HistoryStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const valueClass = tone === 'positive'
    ? 'text-success'
    : tone === 'negative' ? 'text-danger' : 'text-ink';

  return (
    <div className="rounded-[16px] bg-subtle border border-line p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-[18px] font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function HistoryTeam({
  title,
  players,
  currentUserId,
}: {
  title: string;
  players: MatchPlayer[];
  currentUserId: string | null;
}) {
  return (
    <div className="rounded-[16px] bg-subtle border border-line p-3 min-h-[86px]">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
        {title}
      </div>
      {players.length === 0 ? (
        <div className="text-[12px] text-muted">Пусто</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {players.map((player) => {
            const isMe = player.userId === currentUserId;
            return (
              <div
                key={player.userId}
                className={[
                  'flex items-center justify-between gap-2 text-[12px]',
                  isMe ? 'font-bold text-ink' : 'text-ink-2',
                ].join(' ')}
              >
                <span className="truncate">{player.displayName}</span>
                <span className="shrink-0 text-muted tabular-nums">
                  {player.goals}г {player.assists}п
                </span>
              </div>
            );
          })}
        </div>
      )}
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
              Выбери команду, за которую хочешь присоединиться.
            </p>
          </div>
          <IconButton onClick={onClose} aria-label="Закрыть">×</IconButton>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={() => onJoin('TeamA')}>
            Команда A
          </Button>
          <Button disabled={busy} variant="secondary" onClick={() => onJoin('TeamB')}>
            Команда B
          </Button>
        </div>
      </div>
    </div>
  );
}
