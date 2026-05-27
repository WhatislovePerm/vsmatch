import { CircleCheck, History } from 'lucide-react';
import type { Match, MatchPlayer } from '../types';
import { Badge } from './ui';

interface Props {
  matches: Match[];
  currentUserId: string | null;
}

export function HistoryView({ matches, currentUserId }: Props) {
  const completedCount = matches.filter((m) => m.status === 'Completed').length;

  if (matches.length === 0) {
    return (
      <div className="rounded-[20px] bg-subtle border border-line p-5 text-center">
        <div className="mx-auto w-10 h-10 rounded-[14px] bg-white border border-line flex items-center justify-center text-muted">
          <History size={18} />
        </div>
        <h3 className="mt-3 text-[14px] font-bold text-ink">Истории пока нет</h3>
        <p className="mt-1 text-[12.5px] text-muted leading-relaxed">
          Завершённые и отменённые матчи появятся здесь после участия.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">
          История матчей
        </h3>
        <div className="flex items-center gap-1.5">
          <Badge tone="neutral">{matches.length}</Badge>
          <Badge tone="success">{completedCount} завершено</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {matches.map((match) => (
          <HistoryCard
            key={match.id}
            match={match}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryCard({
  match,
  currentUserId,
}: {
  match: Match;
  currentUserId: string | null;
}) {
  const me = match.players.find((p) => p.userId === currentUserId);
  const playerA = match.players.find((p) => p.team === 'TeamA');
  const playerB = match.players.find((p) => p.team === 'TeamB');
  const completed = match.status === 'Completed';
  const finishedAt = match.resultSubmittedAt ?? match.updatedAt ?? match.createdAt;

  return (
    <article className="bg-white border border-line rounded-[20px] p-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-ink truncate">{match.title}</div>
          <div className="mt-0.5 text-[12px] text-muted truncate">
            {match.courtName} · {new Date(finishedAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <Badge
          tone={completed ? 'success' : 'neutral'}
          iconLeft={completed ? <CircleCheck size={12} /> : undefined}
        >
          {completed ? 'Завершён' : 'Отменён'}
        </Badge>
      </div>

      {completed && (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[14px] bg-subtle border border-line p-2.5">
          <div className="text-[12px] font-semibold text-muted text-right truncate">
            {playerA?.displayName ?? 'Игрок 1'}
          </div>
          <div className="text-[18px] font-bold text-ink tabular-nums">
            {match.teamAScore ?? 0}:{match.teamBScore ?? 0}
          </div>
          <div className="text-[12px] font-semibold text-muted truncate">
            {playerB?.displayName ?? 'Игрок 2'}
          </div>
        </div>
      )}

      {me && completed && (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <Stat label="Голы" value={me.goals} />
          <Stat label="Пасы" value={me.assists} />
          <Stat
            label="Рейтинг"
            value={`${me.ratingDelta > 0 ? '+' : ''}${Math.round(me.ratingDelta)}`}
            tone={me.ratingDelta >= 0 ? 'positive' : 'negative'}
          />
        </div>
      )}

      <PlayersBrief players={match.players} currentUserId={currentUserId} />
    </article>
  );
}

function Stat({
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
    <div className="rounded-[12px] bg-subtle border border-line p-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-0.5 text-[15px] font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function PlayersBrief({
  players,
  currentUserId,
}: {
  players: MatchPlayer[];
  currentUserId: string | null;
}) {
  if (players.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-col gap-1">
      {players.map((p) => {
        const isMe = p.userId === currentUserId;
        return (
          <div
            key={p.userId}
            className={[
              'flex items-center justify-between gap-2 text-[12px]',
              isMe ? 'font-bold text-ink' : 'text-ink-2',
            ].join(' ')}
          >
            <span className="truncate">{p.displayName}</span>
            <span className="shrink-0 text-muted tabular-nums">
              {p.goals}г {p.assists}п
            </span>
          </div>
        );
      })}
    </div>
  );
}
