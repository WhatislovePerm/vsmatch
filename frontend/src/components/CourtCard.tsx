import { type FormEvent, useState } from 'react';
import {
  Check,
  Copy,
  MapPin,
  Play,
  Star,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type { Court, Match } from '../types';
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
  onCancelMatch: (match: Match) => Promise<void>;
  onStartMatch: (match: Match) => Promise<void>;
  onCompleteMatch: (match: Match) => Promise<void>;
}

export function CourtCard({
  court,
  matches,
  currentUserId,
  onClose,
  onCreateMatch,
  onCancelMatch,
  onStartMatch,
  onCompleteMatch,
}: Props) {
  const [title, setTitle] = useState('Матч');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [busy, setBusy] = useState(false);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);

  const activeMatches = matches.filter(
    (m) => m.status === 'Scheduled' || m.status === 'Ready' || m.status === 'InProgress',
  );
  const hasActiveMatch = activeMatches.length > 0;

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
        'sm:top-5 sm:right-5 sm:w-[400px] sm:max-h-[calc(100vh-40px)]',
        // mobile: bottom sheet (от низа)
        'left-0 right-0 bottom-0 max-h-[80vh] sm:left-auto',
        'bg-white border border-line',
        'sm:rounded-[32px] rounded-t-[32px] sm:rounded-b-[32px] rounded-b-none',
        'shadow-[0_20px_60px_-20px_rgba(31,44,65,0.25)]',
        'flex flex-col overflow-hidden',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
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
      <div className="overflow-y-auto thin-scroll px-6 pb-6 flex-1">
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
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3">
            Матчи
          </h3>

          {activeMatches.length === 0 ? (
            <p className="text-[13px] text-muted">Матчей пока нет</p>
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
                  onStart={() => onStartMatch(match)}
                  onComplete={() => onCompleteMatch(match)}
                  canManage={match.createdByUserId === currentUserId}
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
  onComplete,
  canManage,
}: {
  match: Match;
  copied: boolean;
  onCopy: () => void;
  onCancel: () => void;
  onStart: () => void;
  onComplete: () => void;
  canManage: boolean;
}) {
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
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-2 mb-1.5">
            Игроки
          </div>
          <div className="flex flex-wrap gap-1.5">
            {match.players.map((p) => (
              <span
                key={p.userId}
                className="text-[12px] bg-white border border-line rounded-full px-2.5 py-0.5 text-ink-2"
              >
                {p.displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-1">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={onCopy}
        >
          {copied ? 'Скопировано' : 'Копировать ссылку'}
        </Button>
        {canManage && match.currentPlayers < 2 ? (
          <Button
            variant="danger"
            size="sm"
            iconLeft={<XCircle size={14} />}
            onClick={onCancel}
          >
            Отменить
          </Button>
        ) : canManage && match.status !== 'InProgress' ? (
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Play size={14} />}
            onClick={onStart}
          >
            Начать
          </Button>
        ) : canManage ? (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Check size={14} />}
            onClick={onComplete}
          >
            Завершить
          </Button>
        ) : null}
      </div>
    </article>
  );
}
