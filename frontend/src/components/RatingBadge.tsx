import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { getRatingTier, type RatingTier } from '../sport/ratingTiers';

interface Props {
  rating: number;
  /** md — для хедера, sm — для строк в списках */
  size?: 'sm' | 'md';
  /** Показывать ли название уровня. По умолчанию да на md, нет на sm. */
  showLabel?: boolean;
  className?: string;
}

/** Глянцевая «плитка» как в макете: вертикальный блик + диагональный металлик-градиент. */
function tileStyle(tier: RatingTier): CSSProperties {
  const light = `color-mix(in srgb, ${tier.base} 55%, white)`;
  const dark = `color-mix(in srgb, ${tier.base} 75%, black)`;
  return {
    background: [
      'linear-gradient(180deg, rgba(255,255,255,.38) 0%, rgba(255,255,255,0) 42%)',
      `linear-gradient(115deg, ${light} 0%, ${tier.base} 48%, ${dark} 100%)`,
    ].join(', '),
    color: tier.text,
    textShadow: tier.text === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,.25)' : 'none',
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,.25), 0 2px 8px -2px color-mix(in srgb, ${tier.base} 60%, transparent)`,
  };
}

export function RatingBadge({ rating, size = 'md', showLabel, className }: Props) {
  const tier = getRatingTier(rating);
  const withLabel = showLabel ?? size === 'md';

  return (
    <span
      title={`${tier.label} · ${Math.round(rating)}`}
      style={tileStyle(tier)}
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold whitespace-nowrap tabular-nums',
        size === 'md' ? 'px-3 py-1.5 text-[12px] rounded-[10px]' : 'px-2 py-0.5 text-[11px] rounded-[8px]',
        className,
      )}
    >
      {withLabel && <span className="hidden min-[480px]:inline">{tier.label}</span>}
      <span className={withLabel ? 'opacity-85' : ''}>{Math.round(rating)}</span>
    </span>
  );
}
