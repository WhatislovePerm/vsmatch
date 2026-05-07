import { type FormEvent, useState } from 'react';
import type { Court, Match } from '../types';

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
  onCancelMatch: (match: Match) => Promise<void>;
  onStartMatch: (match: Match) => Promise<void>;
}

export function CourtCard({
  court,
  matches,
  onClose,
  onCreateMatch,
  onCancelMatch,
  onStartMatch,
}: Props) {
  const [title, setTitle] = useState('Матч');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [busy, setBusy] = useState(false);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);
  const activeMatches = matches.filter((m) => m.status === 'Scheduled' || m.status === 'Ready' || m.status === 'InProgress');
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
    <div className="court-card">
      <button className="court-card__close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      <h2 className="court-card__title">{court.name}</h2>
      <div className={`court-card__availability ${court.isFree ? 'is-free' : 'is-busy'}`}>
        {hasActiveMatch ? 'На площадке уже играют' : 'Свободно'}
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
        {activeMatches.length === 0 ? (
          <p className="court-card__empty">Матчей пока нет</p>
        ) : (
          <div className="matches">
            {activeMatches.map((match) => (
              <article className="match-row" key={match.id}>
                <div>
                  <strong>{match.title}</strong>
                  <span>{match.currentPlayers}/{match.maxPlayers} игроков</span>
                  {match.players.length > 0 && (
                    <ul className="match-row__players">
                      <li className="match-row__players-title">Игроки</li>
                      {match.players.map((player) => (
                        <li key={player.userId}>{player.displayName}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    className="match-row__invite"
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(`${window.location.origin}${match.inviteUrl}`);
                      setCopiedMatchId(match.id);
                    }}
                  >
                    <span>{copiedMatchId === match.id ? 'Скопировано' : 'Скопировать ссылку'}</span>
                    <span className="match-row__copy-icon" aria-hidden="true">⧉</span>
                  </button>
                </div>
                <div className="match-row__actions">
                  {match.currentPlayers < 2 ? (
                    <button className="match-row__danger" type="button" onClick={() => onCancelMatch(match)}>
                      Отменить матч
                    </button>
                  ) : match.status !== 'InProgress' ? (
                    <button className="match-row__primary" type="button" onClick={() => onStartMatch(match)}>
                      Начать матч
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
        {activeMatches.length > 0 && (
          <p className="court-card__hint">Активный матч делает площадку занятой.</p>
        )}
      </section>

      {!hasActiveMatch && (
        <form className="match-form" onSubmit={submit}>
          <h3>Создать матч</h3>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" />
          <input
            type="number"
            min={2}
            max={50}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
          />
          <button disabled={busy}>{busy ? 'Создаём…' : 'Создать'}</button>
        </form>
      )}
    </div>
  );
}
