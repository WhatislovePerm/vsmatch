import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { fetchTopPlayers, type TopPlayer } from '../api/courts';
import type { SportKind } from '../types';
import { RatingBadge } from './RatingBadge';

interface Props {
  courtId: string;
  sport: SportKind;
  /** Меняется при завершении матча на корте — триггерит рефетч топа. */
  refreshKey?: string | number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function CourtTopPlayers({ courtId, sport, refreshKey }: Props) {
  const [players, setPlayers] = useState<TopPlayer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPlayers(null);
    fetchTopPlayers(courtId, sport)
      .then((res) => { if (!cancelled) setPlayers(res); })
      .catch(() => { if (!cancelled) setPlayers([]); });
    return () => { cancelled = true; };
  }, [courtId, sport, refreshKey]);

  if (players === null) {
    return (
      <section className="mt-5 pt-5 border-t border-line">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
          <Trophy size={13} /> Топ игроков
        </h3>
        <p className="text-[12.5px] text-muted">Загружаем…</p>
      </section>
    );
  }

  if (players.length === 0) {
    return (
      <section className="mt-5 pt-5 border-t border-line">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
          <Trophy size={13} /> Топ игроков
        </h3>
        <p className="text-[12.5px] text-muted">Здесь ещё никто не играл</p>
      </section>
    );
  }

  return (
    <section className="mt-5 pt-5 border-t border-line">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
        <Trophy size={13} /> Топ игроков
      </h3>
      <ol className="flex flex-col gap-2">
        {players.map((p, idx) => (
          <li
            key={p.userId}
            className="bg-subtle border border-line rounded-[14px] px-3 py-2.5 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[18px] leading-none" aria-hidden="true">
                {MEDALS[idx] ?? '🏅'}
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-ink truncate">{p.displayName}</div>
                <div className="text-[11px] text-muted-2">
                  {p.matchCount} матч{plural(p.matchCount)} тут
                </div>
              </div>
            </div>
            <RatingBadge rating={p.rating} size="sm" showLabel={false} className="shrink-0" />
          </li>
        ))}
      </ol>
    </section>
  );
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а';
  return 'ей';
}
