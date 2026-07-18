import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleCheck, History } from 'lucide-react';
import type { Match } from '../types';
import { Badge, IconButton } from './ui';
import { cleanCourtName } from '../courts/display';

interface Props {
  matches: Match[];
  currentUserId: string | null;
}

export function HistoryView({ matches, currentUserId }: Props) {
  const pageSize = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const completedCount = matches.filter((m) => m.status === 'Completed').length;
  const pageItems = useMemo(
    () => matches.slice((safePage - 1) * pageSize, safePage * pageSize),
    [matches, safePage],
  );

  if (matches.length === 0) {
    return (
      <div className="rounded-[20px] bg-subtle border border-line p-5 text-center">
        <div className="mx-auto w-10 h-10 rounded-[14px] bg-card border border-line flex items-center justify-center text-muted">
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
        {pageItems.map((match) => (
          <HistoryCard
            key={match.id}
            match={match}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <IconButton
            aria-label="Предыдущая страница истории"
            variant="subtle"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            <ChevronLeft size={16} />
          </IconButton>
          <span className="text-[12px] font-semibold text-muted tabular-nums">
            {safePage} / {totalPages}
          </span>
          <IconButton
            aria-label="Следующая страница истории"
            variant="subtle"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            <ChevronRight size={16} />
          </IconButton>
        </div>
      )}
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
  const ratingDelta = me?.ratingDelta ?? 0;

  return (
    <article className="bg-card border border-line rounded-[20px] p-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-ink truncate">{match.title}</div>
          <div
            className="mt-0.5 text-[12px] text-muted leading-snug break-words"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {cleanCourtName(match.courtName)} · {new Date(finishedAt).toLocaleDateString('ru-RU')}
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
        <div className="mt-2.5 rounded-[12px] bg-subtle border border-line px-3 py-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Рейтинг
          </span>
          <span className={[
            'text-[16px] font-bold tabular-nums',
            ratingDelta >= 0 ? 'text-success' : 'text-danger',
          ].join(' ')}>
            {ratingDelta > 0 ? '+' : ''}{Math.round(ratingDelta)}
          </span>
        </div>
      )}
    </article>
  );
}
