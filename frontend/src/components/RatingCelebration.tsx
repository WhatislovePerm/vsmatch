import { useMemo } from 'react';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import { Button, IconButton } from './ui';
import { RatingBadge } from './RatingBadge';
import { getRatingTier, getTierProgress } from '../sport/ratingTiers';

export interface CelebrationData {
  delta: number;
  newRating: number;
}

interface Props {
  data: CelebrationData;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#D09742', '#73BAE1', '#75C062', '#C133B3', '#C95C5C', '#4542AF'];

/** Модалка после ввода результата: дельта, новый тир, прогресс — момент, который хочется заскринить. */
export function RatingCelebration({ data, onClose }: Props) {
  const win = data.delta >= 0;
  const tier = getRatingTier(data.newRating);
  const prevTier = getRatingTier(data.newRating - data.delta);
  const tierChanged = tier.key !== prevTier.key;
  const progress = getTierProgress(data.newRating);

  const confetti = useMemo(
    () =>
      win
        ? Array.from({ length: 18 }, (_, i) => ({
            left: `${6 + (i * 5.2) % 88}%`,
            delay: `${(i % 6) * 0.12}s`,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }))
        : [],
    [win],
  );

  return (
    <div className="absolute inset-0 z-[1400] bg-ink/30 backdrop-blur-[3px] flex items-center justify-center p-4">
      <div className="relative w-full max-w-[360px] bg-card border border-line rounded-[28px] shadow-[0_24px_70px_-22px_rgba(0,0,0,0.45)] p-6 text-center anim-pop overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{ left: c.left, top: '-6px', background: c.color, animationDelay: c.delay }}
          />
        ))}

        <div className="absolute top-3 right-3">
          <IconButton onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </IconButton>
        </div>

        <div
          className={[
            'mx-auto w-14 h-14 rounded-[20px] flex items-center justify-center border',
            win ? 'bg-success-bg border-success-line text-success' : 'bg-danger-bg border-danger-line text-danger',
          ].join(' ')}
        >
          {win ? <TrendingUp size={26} /> : <TrendingDown size={26} />}
        </div>

        <div className={`mt-4 text-[36px] font-bold leading-none tabular-nums ${win ? 'text-success' : 'text-danger'}`}>
          {data.delta > 0 ? '+' : ''}{Math.round(data.delta)}
        </div>
        <div className="mt-1 text-[13px] text-muted">
          {win ? 'Рейтинг растёт!' : 'В следующий раз повезёт больше'}
        </div>

        <div className="mt-4 flex justify-center">
          <RatingBadge rating={data.newRating} className="rating-shimmer" />
        </div>

        {tierChanged && win && (
          <div className="mt-3 text-[14px] font-semibold text-ink">
            Новый тир: {tier.label} 🎉
          </div>
        )}

        {progress.next && (
          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-subtle-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-ink-3 transition-all duration-700"
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 text-[12px] text-muted">
              До «{progress.next.label}» — <span className="font-semibold tabular-nums">{progress.pointsToNext}</span> очков
            </div>
          </div>
        )}

        <div className="mt-5">
          <Button block onClick={onClose}>Продолжить</Button>
        </div>
      </div>
    </div>
  );
}
