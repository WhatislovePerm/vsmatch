import { clsx } from 'clsx';
import { getRatingTier } from '../sport/ratingTiers';

interface Props {
  rating: number;
  /** md — для хедера, sm — для строк в списках */
  size?: 'sm' | 'md';
  /** Показывать ли название уровня. По умолчанию да на md, нет на sm. */
  showLabel?: boolean;
  className?: string;
}

export function RatingBadge({ rating, size = 'md', showLabel, className }: Props) {
  const tier = getRatingTier(rating);
  const withLabel = showLabel ?? size === 'md';

  return (
    <span
      title={`${tier.label} · ${Math.round(rating)}`}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap tabular-nums',
        size === 'md' ? 'px-2.5 py-1 text-[12px]' : 'px-2 py-0.5 text-[11px]',
        tier.className,
        className,
      )}
    >
      <span className={size === 'md' ? 'text-[13px] leading-none' : 'text-[12px] leading-none'}>
        {tier.emoji}
      </span>
      {withLabel && <span>{tier.label}</span>}
      <span className={withLabel ? 'opacity-80' : ''}>{Math.round(rating)}</span>
    </span>
  );
}
