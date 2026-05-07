import { type FormEvent, useState } from 'react';
import type { Court, Match, MatchStatus } from '../types';

interface Props {
  court: Court;
  matches: Match[];
  onClose: () => void;
  onCreateMatch: (input: {
    title: string;
    description: string | null;
    startsAtUtc: string;
    durationMinutes: number;
    maxPlayers: number;
  }) => Promise<void>;
  onChangeMatchStatus: (match: Match, status: MatchStatus) => Promise<void>;
  onDeleteMatch: (id: string) => Promise<void>;
  onJoinMatch: (id: string) => Promise<void>;
  onLeaveMatch: (id: string) => Promise<void>;
}

const statusLabels: Record<MatchStatus, string> = {
  Scheduled: 'Запланирован',
  Ready: 'Готов',
  InProgress: 'Идёт',
  Completed: 'Завершён',
  Cancelled: 'Отменён',
};

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function CourtCard({
  court,
  matches,
  onClose,
  onCreateMatch,
  onChangeMatchStatus,
  onDeleteMatch,
  onJoinMatch,
  onLeaveMatch,
}: Props) {
  const [title, setTitle] = useState('Матч');
  const [startsAt, setStartsAt] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60_000)));
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [busy, setBusy] = useState(false);
  const activeMatches = matches.filter((m) => m.status === 'Scheduled' || m.status === 'Ready' || m.status === 'InProgress');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreateMatch({
        title,
        description: null,
        startsAtUtc: new Date(startsAt).toISOString(),
        durationMinutes: 90,
        maxPlayers,
      });
      setTitle('Матч');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="court-card">
      <button className="court-card__close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      <h2 className="court-card__title">{court.name}</h2>
      <div className={`court-card__availability ${court.isFree ? 'is-free' : 'is-busy'}`}>
        IsFree: {court.isFree ? 'true · свободна' : 'false · занята'}
      </div>

      <dl className="court-card__meta">
        {court.sport && (
          <>
            <dt>Вид</dt>
            <dd>{court.sport}</dd>
          </>
        )}
        {court.surface && (
          <>
            <dt>Покрытие</dt>
            <dd>{court.surface}</dd>
          </>
        )}
        <dt>Координаты</dt>
        <dd>
          {court.lat.toFixed(5)}, {court.lon.toFixed(5)}
        </dd>
        <dt>Рейтинг</dt>
        <dd>{court.rating != null ? court.rating.toFixed(1) : '—'}</dd>
      </dl>

      {court.description && <p className="court-card__desc">{court.description}</p>}

      <section className="court-card__section">
        <h3>Матчи</h3>
        {matches.length === 0 ? (
          <p className="court-card__empty">Матчей пока нет</p>
        ) : (
          <div className="matches">
            {matches.map((match) => (
              <article className="match-row" key={match.id}>
                <div>
                  <strong>{match.title}</strong>
                  <span>
                    {new Date(match.startsAtUtc).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {match.currentPlayers}/{match.maxPlayers}
                  </span>
                  {match.players.length > 0 && (
                    <ul className="match-row__players">
                      {match.players.map((player) => (
                        <li key={player.userId}>{player.displayName}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    className="match-row__invite"
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${match.inviteUrl}`)}
                  >
                    Скопировать ссылку
                  </button>
                </div>
                <select
                  value={match.status}
                  onChange={(e) => onChangeMatchStatus(match, e.target.value as MatchStatus)}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <div className="match-row__actions">
                  <button type="button" onClick={() => onJoinMatch(match.id)}>+</button>
                  <button type="button" onClick={() => onLeaveMatch(match.id)}>−</button>
                  <button type="button" onClick={() => onDeleteMatch(match.id)}>×</button>
                </div>
              </article>
            ))}
          </div>
        )}
        {activeMatches.length > 0 && (
          <p className="court-card__hint">Активный матч делает площадку занятой.</p>
        )}
      </section>

      <form className="match-form" onSubmit={submit}>
        <h3>Создать матч</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" />
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <input
          type="number"
          min={2}
          max={50}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
        />
        <button disabled={busy}>{busy ? 'Создаём…' : 'Создать'}</button>
      </form>
    </div>
  );
}
