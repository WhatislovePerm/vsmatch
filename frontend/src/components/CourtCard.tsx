import { type FormEvent, useState } from 'react';
import {
  Check,
  CircleCheck,
  Copy,
  History,
  MapPin,
  Play,
  Shuffle,
  Star,
  Trophy,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type { Court, Match, MatchPlayer, MatchTeam, SubmitMatchResultRequest } from '../types';
import { Badge, Button, IconButton, Input } from './ui';

interface Props {
  court: Court;
  matches: Match[];
  currentUserId: string | null;
  onClose: () => void;
  onCreateMatch: (input: {
    title: string;
    description: string | null;
    startsAtUtc: string;
    durationMinutes: number;
    maxPlayers: number;
  }) => Promise<void>;
  onJoinMatch: (match: Match, team: MatchTeam) => Promise<void>;
  onShuffleTeams: (match: Match) => Promise<void>;
  onCancelMatch: (match: Match) => Promise<void>;
  onStartMatch: (match: Match) => Promise<void>;
  onSubmitResult: (match: Match, result: SubmitMatchResultRequest) => Promise<void>;
}

export function CourtCard({
  court,
  matches,
  currentUserId,
  onClose,
  onCreateMatch,
  onJoinMatch,
  onShuffleTeams,
  onCancelMatch,
  onStartMatch,
  onSubmitResult,
}: Props) {
  const [title, setTitle] = useState('Матч');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [busy, setBusy] = useState(false);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);

  const activeMatches = matches.filter(
    (m) => m.status === 'Scheduled' || m.status === 'Ready' || m.status === 'InProgress',
  );
  const historyMatches = matches
    .filter((m) => m.status === 'Completed' || m.status === 'Cancelled')
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
  const hasActiveMatch = activeMatches.length > 0;
  const [tab, setTab] = useState<'current' | 'history'>('current');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreateMatch({
        title,
        description: null,
        startsAtUtc: new Date().toISOString(),
        durationMinutes: 90,
        maxPlayers,
      });
      setTitle('Матч');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside
      className={[
        'absolute z-[1000] anim-panel',
        // desktop: справа панель
        'sm:top-5 sm:right-5 sm:w-[min(430px,calc(100vw-40px))] sm:max-h-[calc(100vh-40px)]',
        // mobile: bottom sheet (от низа)
        'left-0 right-0 bottom-0 max-h-[80vh] sm:left-auto',
        'bg-white border border-line',
        'sm:rounded-[32px] rounded-t-[32px] sm:rounded-b-[32px] rounded-b-none',
        'shadow-[0_20px_60px_-20px_rgba(31,44,65,0.25)]',
        'flex flex-col overflow-hidden',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-5 sm:pt-6 pb-3">
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="text-[18px] font-bold tracking-tight text-ink leading-tight pr-2 break-words">
            {court.name}
          </h2>
          <Badge tone={hasActiveMatch ? 'danger' : 'success'}>
            {hasActiveMatch ? 'Идёт матч' : 'Свободно'}
          </Badge>
        </div>
        <IconButton onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </IconButton>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto thin-scroll px-4 sm:px-6 pb-6 flex-1">
        {/* Метаданные */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px] mt-2">
          {court.sport && (
            <>
              <dt className="text-muted font-medium">Вид</dt>
              <dd className="text-ink-2">{court.sport}</dd>
            </>
          )}
          {court.surface && (
            <>
              <dt className="text-muted font-medium">Покрытие</dt>
              <dd className="text-ink-2">{court.surface}</dd>
            </>
          )}
          <dt className="text-muted font-medium flex items-center gap-1.5">
            <MapPin size={13} /> Координаты
          </dt>
          <dd className="text-ink-2 tabular-nums">
            {court.lat.toFixed(5)}, {court.lon.toFixed(5)}
          </dd>
          <dt className="text-muted font-medium flex items-center gap-1.5">
            <Star size={13} /> Рейтинг
          </dt>
          <dd className="text-ink-2">
            {court.rating != null ? court.rating.toFixed(1) : '—'}
          </dd>
        </dl>

        {court.description && (
          <p className="mt-4 pt-4 border-t border-line text-[13px] text-muted leading-relaxed">
            {court.description}
          </p>
        )}

        {/* Матчи */}
        <section className="mt-5 pt-5 border-t border-line">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">
              Матчи
            </h3>
            <div className="inline-grid grid-cols-2 rounded-[14px] bg-subtle border border-line p-0.5">
              <button
                type="button"
                onClick={() => setTab('current')}
                className={[
                  'h-8 px-3 rounded-[11px] text-[12px] font-semibold transition-colors',
                  tab === 'current' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                Сейчас
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={[
                  'h-8 px-3 rounded-[11px] text-[12px] font-semibold transition-colors',
                  tab === 'history' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                История
              </button>
            </div>
          </div>

          {tab === 'current' && activeMatches.length === 0 ? (
            <p className="text-[13px] text-muted">Матчей пока нет</p>
          ) : tab === 'current' ? (
            <div className="flex flex-col gap-2.5">
              {activeMatches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  copied={copiedMatchId === match.id}
                  onCopy={async () => {
                    await navigator.clipboard?.writeText(
                      `${window.location.origin}${match.inviteUrl}`,
                    );
                    setCopiedMatchId(match.id);
                  }}
                  onCancel={() => onCancelMatch(match)}
                  onStart={() => onStartMatch(match)}
                  onJoin={(team) => onJoinMatch(match, team)}
                  onShuffle={() => onShuffleTeams(match)}
                  onOpenResult={() => setResultMatchId(match.id)}
                  onCloseResult={() => setResultMatchId(null)}
                  onSubmitResult={async (result) => {
                    await onSubmitResult(match, result);
                    setResultMatchId(null);
                  }}
                  canManage={match.createdByUserId === currentUserId}
                  currentUserId={currentUserId}
                  showResultForm={resultMatchId === match.id}
                />
              ))}
              <p className="text-[12px] text-muted mt-1">
                Активный матч делает площадку занятой.
              </p>
            </div>
          ) : historyMatches.length === 0 ? (
            <p className="text-[13px] text-muted">Истории пока нет</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {historyMatches.map((match) => (
                <HistoryMatchRow key={match.id} match={match} />
              ))}
            </div>
          )}
        </section>

        {/* Создать матч */}
        {!hasActiveMatch && tab === 'current' && (
          <form
            onSubmit={submit}
            className="mt-5 pt-5 border-t border-line flex flex-col gap-3"
          >
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">
              Создать матч
            </h3>
            <Input
              label="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Вечерний матч"
            />
            <Input
              label="Игроков"
              type="number"
              min={2}
              max={50}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            />
            <Button block disabled={busy} type="submit">
              {busy ? 'Создаём…' : 'Создать матч'}
            </Button>
          </form>
        )}
      </div>
    </aside>
  );
}

/* ───── MatchRow ───── */

function MatchRow({
  match,
  copied,
  onCopy,
  onCancel,
  onStart,
  onJoin,
  onShuffle,
  onOpenResult,
  onCloseResult,
  onSubmitResult,
  canManage,
  currentUserId,
  showResultForm,
}: {
  match: Match;
  copied: boolean;
  onCopy: () => void;
  onCancel: () => void;
  onStart: () => void;
  onJoin: (team: MatchTeam) => void;
  onShuffle: () => void;
  onOpenResult: () => void;
  onCloseResult: () => void;
  onSubmitResult: (result: SubmitMatchResultRequest) => Promise<void>;
  canManage: boolean;
  currentUserId: string | null;
  showResultForm: boolean;
}) {
  const teamA = match.players.filter((p) => p.team === 'TeamA');
  const teamB = match.players.filter((p) => p.team === 'TeamB');
  const currentUserIsPlayer = match.players.some((p) => p.userId === currentUserId);
  const canJoin = !currentUserIsPlayer
    && match.currentPlayers < match.maxPlayers
    && (match.status === 'Scheduled' || match.status === 'Ready');
  const canShuffle = canManage && match.currentPlayers >= 2 && match.status !== 'InProgress';
  const canStart = canManage && match.currentPlayers >= 2 && match.status !== 'InProgress';
  const canComplete = canManage && match.status === 'InProgress';

  return (
    <article className="bg-subtle border border-line rounded-[20px] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[14px] text-ink truncate">
            {match.title}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            <Users size={13} /> {match.currentPlayers}/{match.maxPlayers} игроков
          </div>
        </div>
        {match.status === 'InProgress' && (
          <Badge tone="warn">Идёт</Badge>
        )}
        {match.status === 'Ready' && (
          <Badge tone="info">Готов</Badge>
        )}
      </div>

      {match.players.length > 0 && (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
          <TeamPlayers title="Команда A" players={teamA} />
          <TeamPlayers title="Команда B" players={teamB} />
        </div>
      )}

      {canJoin && (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => onJoin('TeamA')}>
            Войти в A
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onJoin('TeamB')}>
            Войти в B
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 min-[360px]:flex min-[360px]:flex-wrap gap-2 mt-1">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={onCopy}
        >
          {copied ? 'Скопировано' : 'Копировать ссылку'}
        </Button>
        {canShuffle && (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Shuffle size={14} />}
            onClick={onShuffle}
          >
            Тасовать
          </Button>
        )}
        {canManage && match.currentPlayers < 2 ? (
          <Button
            variant="danger"
            size="sm"
            iconLeft={<XCircle size={14} />}
            onClick={onCancel}
          >
            Отменить
          </Button>
        ) : canStart ? (
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Play size={14} />}
            onClick={onStart}
          >
            Начать
          </Button>
        ) : canComplete ? (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Trophy size={14} />}
            onClick={onOpenResult}
          >
            Завершить
          </Button>
        ) : null}
      </div>

      {showResultForm && (
        <ResultForm
          match={match}
          onSubmit={onSubmitResult}
          onCancel={onCloseResult}
        />
      )}
    </article>
  );
}

function TeamPlayers({
  title,
  players,
  showStats = false,
}: {
  title: string;
  players: MatchPlayer[];
  showStats?: boolean;
}) {
  return (
    <div className="bg-white border border-line rounded-[16px] p-2.5 min-h-[74px]">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-2 mb-1.5">
        {title}
      </div>
      {players.length === 0 ? (
        <div className="text-[12px] text-muted">Пусто</div>
      ) : (
        <div className="flex flex-col gap-1">
          {players.map((p) => (
            <div key={p.userId} className="text-[12px] text-ink-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{p.displayName}</span>
                <span className="shrink-0 text-muted tabular-nums">{Math.round(p.rating)}</span>
              </div>
              {showStats && (
                <div className="mt-0.5 text-[11px] text-muted tabular-nums">
                  {p.goals} г · {p.assists} п · {p.ratingDelta > 0 ? '+' : ''}{Math.round(p.ratingDelta)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultForm({
  match,
  onSubmit,
  onCancel,
}: {
  match: Match;
  onSubmit: (result: SubmitMatchResultRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [stats, setStats] = useState<Record<string, { goals: number; assists: number }>>(
    () => Object.fromEntries(match.players.map((p) => [p.userId, { goals: 0, assists: 0 }])),
  );
  const [busy, setBusy] = useState(false);

  const setPlayerStat = (userId: string, key: 'goals' | 'assists', value: number) => {
    setStats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: Math.max(0, value),
      },
    }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        teamAScore,
        teamBScore,
        players: match.players.map((p) => ({
          userId: p.userId,
          goals: stats[p.userId]?.goals ?? 0,
          assists: stats[p.userId]?.assists ?? 0,
        })),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-2 pt-3 border-t border-line flex flex-col gap-3">
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
        <Input
          label="Счёт A"
          type="number"
          min={0}
          value={teamAScore}
          onChange={(e) => setTeamAScore(Math.max(0, Number(e.target.value)))}
        />
        <Input
          label="Счёт B"
          type="number"
          min={0}
          value={teamBScore}
          onChange={(e) => setTeamBScore(Math.max(0, Number(e.target.value)))}
        />
      </div>

      <div className="flex flex-col gap-2">
        {match.players.map((p) => (
          <div key={p.userId} className="grid grid-cols-2 min-[390px]:grid-cols-[minmax(0,1fr)_72px_72px] gap-2 items-end">
            <div className="min-w-0 col-span-2 min-[390px]:col-span-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {p.team === 'TeamA' ? 'A' : 'B'}
              </div>
              <div className="text-[13px] font-semibold text-ink truncate">{p.displayName}</div>
            </div>
            <Input
              label="Голы"
              type="number"
              min={0}
              value={stats[p.userId]?.goals ?? 0}
              onChange={(e) => setPlayerStat(p.userId, 'goals', Number(e.target.value))}
            />
            <Input
              label="Пасы"
              type="number"
              min={0}
              value={stats[p.userId]?.assists ?? 0}
              onChange={(e) => setPlayerStat(p.userId, 'assists', Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Назад
        </Button>
        <Button type="submit" size="sm" disabled={busy} iconLeft={<Check size={14} />}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}

function HistoryMatchRow({ match }: { match: Match }) {
  const teamA = match.players.filter((p) => p.team === 'TeamA');
  const teamB = match.players.filter((p) => p.team === 'TeamB');
  const finishedAt = match.resultSubmittedAt ?? match.updatedAt ?? match.createdAt;
  const completed = match.status === 'Completed';

  return (
    <article className="bg-subtle border border-line rounded-[20px] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[14px] text-ink truncate">{match.title}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            <History size={13} /> {new Date(finishedAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <Badge tone={completed ? 'success' : 'neutral'} iconLeft={completed ? <CircleCheck size={13} /> : undefined}>
          {completed ? 'Завершён' : 'Отменён'}
        </Badge>
      </div>

      {completed && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[16px] bg-white border border-line p-3">
          <div className="text-[12px] font-semibold text-muted text-right">Команда A</div>
          <div className="text-[20px] font-bold text-ink tabular-nums">
            {match.teamAScore ?? 0}:{match.teamBScore ?? 0}
          </div>
          <div className="text-[12px] font-semibold text-muted">Команда B</div>
        </div>
      )}

      {match.players.length > 0 && (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
          <TeamPlayers title="Команда A" players={teamA} showStats />
          <TeamPlayers title="Команда B" players={teamB} showStats />
        </div>
      )}
    </article>
  );
}
