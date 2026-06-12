export interface RatingTier {
  key: string;
  label: string;
  /** Базовый цвет плитки из дизайн-макета. */
  base: string;
  /** Цвет текста поверх плитки. */
  text: string;
  /** Плоская заливка без глянца (только «Новичок»). */
  flat?: boolean;
}

/** Тиры и цвета — из Figma-макета (плитки 200×200, rx 20). */
const TIERS: Array<{ min: number; tier: RatingTier }> = [
  { min: 0,    tier: { key: 'rookie',      label: 'Новичок',     base: '#1F2C41', text: '#FFFFFF', flat: true } },
  { min: 700,  tier: { key: 'bronze',      label: 'Бронза',      base: '#D09742', text: '#3A2A0E' } },
  { min: 850,  tier: { key: 'silver',      label: 'Серебро',     base: '#CDC9C2', text: '#3D3A35' } },
  { min: 950,  tier: { key: 'gold',        label: 'Золото',      base: '#C1A875', text: '#3A2F1A' } },
  { min: 1050, tier: { key: 'platinum',    label: 'Платина',     base: '#73BAE1', text: '#11364C' } },
  { min: 1200, tier: { key: 'emerald',     label: 'Изумруд',     base: '#75C062', text: '#15330E' } },
  { min: 1400, tier: { key: 'champion',    label: 'Чемпион',     base: '#4542AF', text: '#FFFFFF' } },
  { min: 1600, tier: { key: 'master',      label: 'Мастер',      base: '#7F42AF', text: '#FFFFFF' } },
  { min: 1850, tier: { key: 'grandmaster', label: 'Грандмастер', base: '#C133B3', text: '#FFFFFF' } },
  { min: 2100, tier: { key: 'legend',      label: 'Легенда',     base: '#C95C5C', text: '#FFFFFF' } },
];

export function getRatingTier(rating: number): RatingTier {
  let found = TIERS[0].tier;
  for (const { min, tier } of TIERS) {
    if (rating >= min) found = tier;
  }
  return found;
}
