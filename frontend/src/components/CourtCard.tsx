import { type FormEvent, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Play,
  Trophy,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type { Court, Match, MatchPlayer, MatchTeam, SubmitMatchResultRequest } from '../types';
import { Badge, Button, IconButton, Input, NumberInput } from './ui';
import { CourtTopPlayers } from './CourtTopPlayers';
import { RatingBadge } from './RatingBadge';
import { courtAddressLine, courtTitle } from '../courts/display';

interface Props {
  court: Court;
  matches: Match[];
  currentUserId: string | null;
  onClose: () => void;
  onCreateMatch: (input: {
    title: string;
    description: string | null;
    teamAName: string | null;
    teamBName: string | null;
    startsAtUtc: string;
    durationMinutes: number;
    maxPlayers: number;
  }) => Promise<void>;
  onJoinMatch: (match: Match, team: MatchTeam) => Promise<void>;
  onLeaveMatch: (match: Match) => Promise<void>;
  onCancelMatch: (match: Match) => Promise<void>;
  onStartMatch: (match: Match) => Promise<void>;
  onSubmitResult: (match: Match, result: SubmitMatchResultRequest) => Promise<void>;
}

function extractErrorMessage(err: unknown): string | null {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  return null;
}

export function CourtCard({
  court,
  matches,
  currentUserId,
  onClose,
  onCreateMatch,
  onJoinMatch,
  onLeaveMatch,
  onCancelMatch,
  onStartMatch,
  onSubmitResult,
}: Props) {
  const [title, setTitle] = useState('Матч 1×1');
  const [busy, setBusy] = useState(false);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const activeMatches = matches.filter(
    (m) => m.status === 'Scheduled' || m.status === 'Ready' || m.status === 'InProgress',
  );
  const hasActiveMatch = activeMatches.length > 0;
  // «Идёт матч» — только когда игра реально началась; сбор игроков — отдельный статус.
  const hasLiveMatch = activeMatches.some((m) => m.status === 'InProgress');
  const titleText = courtTitle(court);
  const addressText = courtAddressLine(court);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setCreateError(null);
    try {
      await onCreateMatch({
        title,
        description: null,
        teamAName: null,
        teamBName: null,
        startsAtUtc: new Date().toISOString(),
        durationMinutes: 90,
        maxPlayers: 2,
      });
      setTitle('Матч 1×1');
    } catch (err) {
      setCreateError(extractErrorMessage(err) ?? 'Не удалось создать матч');
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
        'bg-card border border-line',
        'sm:rounded-[32px] rounded-t-[32px] sm:rounded-b-[32px] rounded-b-none',
        'shadow-[0_20px_60px_-20px_rgba(31,44,65,0.25)]',
        'flex flex-col overflow-hidden',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-5 sm:pt-6 pb-3">
        <div className="flex flex-col gap-2 min-w-0">
          <h2 className="text-[18px] font-bold tracking-tight text-ink leading-tight pr-2 break-words">
            {titleText}
          </h2>
          <Badge tone={hasLiveMatch ? 'danger' : hasActiveMatch ? 'warn' : 'success'}>
            {hasLiveMatch ? 'Идёт матч' : hasActiveMatch ? 'Собирается матч' : 'Свободно'}
          </Badge>
        </div>
        <IconButton onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </IconButton>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto thin-scroll px-4 sm:px-6 pb-6 flex-1">
        {addressText && (
          <p className="text-[13px] text-ink-2 leading-relaxed mt-2 whitespace-normal break-words max-w-[24rem]">
            {addressText}
          </p>
        )}

        {court.description && (
          <p className={`text-[13px] text-muted leading-relaxed ${addressText ? 'mt-3' : 'mt-2'}`}>
            {court.description}
          </p>
        )}

        {/* Матчи — главное действие, поэтому выше топа игроков */}
        <section className="mt-5 pt-5 border-t border-line">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">
              Матчи
            </h3>
          </div>

          {activeMatches.length === 0 ? (
            <p className="text-[13px] text-muted">
              Здесь пока пусто. Стань первым — создай матч ниже и забери до{' '}
              <span className="font-semibold text-ink-2 tabular-nums">+60</span> рейтинга за победу.
            </p>
          ) : (
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
                  onLeave={() => onLeaveMatch(match)}
                  onStart={() => onStartMatch(match)}
                  onJoin={(team) => onJoinMatch(match, team)}
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
          )}
        </section>

        {/* Создать матч */}
        {!hasActiveMatch && (
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
              onChange={(e) => {
                setTitle(e.target.value);
                setCreateError(null);
              }}
              placeholder="Например: Вечерний матч"
              maxLength={64}
            />
            <p className="text-[12px] text-muted">
              Формат 1×1: соперник присоединится по ссылке-приглашению.
            </p>

            {createError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-[12px] bg-danger-bg border border-danger-line text-danger text-[12.5px] leading-snug">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span className="break-words">{createError}</span>
              </div>
            )}

            <Button block disabled={busy} type="submit">
              {busy ? 'Создаём…' : 'Создать матч'}
            </Button>
          </form>
        )}

        {/* Топ игроков — справочная секция, ниже действий */}
        <CourtTopPlayers
          courtId={court.id}
          sport={court.sport}
          refreshKey={matches.filter((m) => m.status === 'Completed').length}
        />
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
  onLeave,
  onStart,
  onJoin,
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
  onLeave: () => void;
  onStart: () => void;
  onJoin: (team: MatchTeam) => void;
  onOpenResult: () => void;
  onCloseResult: () => void;
  onSubmitResult: (result: SubmitMatchResultRequest) => Promise<void>;
  canManage: boolean;
  currentUserId: string | null;
  showResultForm: boolean;
}) {
  const currentUserIsPlayer = match.players.some((p) => p.userId === currentUserId);
  const canLeave = currentUserIsPlayer
    && !canManage
    && (match.status === 'Scheduled' || match.status === 'Ready');
  const canJoin = !currentUserIsPlayer
    && match.currentPlayers < match.maxPlayers
    && (match.status === 'Scheduled' || match.status === 'Ready');
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
        <PlayersList players={match.players} />
      )}

      {canJoin && (
        <Button variant="secondary" size="sm" onClick={() => onJoin('TeamB')}>
          Войти в матч
        </Button>
      )}

      <div className="grid grid-cols-1 min-[360px]:flex min-[360px]:flex-wrap gap-2 mt-1">
        {/* Инвайт работает только до старта матча — после кнопка не нужна */}
        {match.status !== 'InProgress' && (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={onCopy}
          >
            {copied ? 'Скопировано' : 'Копировать ссылку'}
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
        ) : canLeave ? (
          <Button
            variant="danger"
            size="sm"
            iconLeft={<XCircle size={14} />}
            onClick={onLeave}
          >
            Выйти
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

function PlayersList({
  players,
  showStats = false,
}: {
  players: MatchPlayer[];
  showStats?: boolean;
}) {
  return (
    <div className="bg-card border border-line rounded-[16px] p-2.5 flex flex-col gap-1">
      {players.map((p) => (
        <div key={p.userId} className="text-[12.5px] text-ink-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{p.displayName}</span>
            <RatingBadge rating={p.rating} size="sm" showLabel={false} className="shrink-0" />
          </div>
          {showStats && (
            <div className="mt-0.5 text-[11px] text-muted tabular-nums">
              {p.goals} г · {p.assists} п · {p.ratingDelta > 0 ? '+' : ''}{Math.round(p.ratingDelta)}
            </div>
          )}
        </div>
      ))}
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // В 1×1 голы каждого игрока = счёт его команды. Пасов в форме нет.
      await onSubmit({
        teamAScore,
        teamBScore,
        players: match.players.map((p) => ({
          userId: p.userId,
          goals: p.team === 'TeamA' ? teamAScore : teamBScore,
          assists: 0,
        })),
      });
    } catch (err) {
      setError(extractErrorMessage(err) ?? 'Не удалось сохранить результат');
    } finally {
      setBusy(false);
    }
  };

  const playerA = match.players.find((p) => p.team === 'TeamA');
  const playerB = match.players.find((p) => p.team === 'TeamB');

  return (
    <form onSubmit={submit} className="mt-2 pt-3 border-t border-line flex flex-col gap-3">
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
        <NumberInput
          label={`Счёт · ${playerA?.displayName ?? 'Игрок 1'}`}
          min={0}
          value={teamAScore}
          onChange={setTeamAScore}
        />
        <NumberInput
          label={`Счёт · ${playerB?.displayName ?? 'Игрок 2'}`}
          min={0}
          value={teamBScore}
          onChange={setTeamBScore}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-[12px] bg-danger-bg border border-danger-line text-danger text-[12.5px] leading-snug">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

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
