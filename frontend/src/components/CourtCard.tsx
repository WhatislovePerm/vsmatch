import type { Court } from '../types';

interface Props {
  court: Court;
  onClose: () => void;
}

export function CourtCard({ court, onClose }: Props) {
  return (
    <div className="court-card">
      <button className="court-card__close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      <h2 className="court-card__title">{court.name}</h2>

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
    </div>
  );
}
