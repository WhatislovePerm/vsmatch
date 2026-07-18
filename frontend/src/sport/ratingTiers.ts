export interface RatingTier {
  key: string;
  label: string;
  /** Базовый цвет плитки. */
  base: string;
  /** Цвет текста поверх плитки. */
  text: string;
}

/** 25 уровней. Подуровни I/II/III внутри семейства делят цвет. */
const TIERS: Array<{ min: number; tier: RatingTier }> = [
  { min: 0,    tier: { key: 'bronze-1',  label: 'Бронза',        base: '#D09742', text: '#3A2A0E' } },
  { min: 501,  tier: { key: 'bronze-2',  label: 'Бронза II',     base: '#D09742', text: '#3A2A0E' } },
  { min: 600,  tier: { key: 'bronze-3',  label: 'Бронза III',    base: '#D09742', text: '#3A2A0E' } },
  { min: 700,  tier: { key: 'silver-1',  label: 'Серебро I',     base: '#CDC9C2', text: '#3D3A35' } },
  { min: 800,  tier: { key: 'silver-2',  label: 'Серебро II',    base: '#CDC9C2', text: '#3D3A35' } },
  { min: 900,  tier: { key: 'silver-3',  label: 'Серебро III',   base: '#CDC9C2', text: '#3D3A35' } },
  { min: 1000, tier: { key: 'gold-1',    label: 'Золото I',      base: '#C1A875', text: '#3A2F1A' } },
  { min: 1100, tier: { key: 'gold-2',    label: 'Золото II',     base: '#C1A875', text: '#3A2F1A' } },
  { min: 1200, tier: { key: 'gold-3',    label: 'Золото III',    base: '#C1A875', text: '#3A2F1A' } },
  { min: 1300, tier: { key: 'plat-1',    label: 'Платина I',     base: '#73BAE1', text: '#11364C' } },
  { min: 1400, tier: { key: 'plat-2',    label: 'Платина II',    base: '#73BAE1', text: '#11364C' } },
  { min: 1500, tier: { key: 'plat-3',    label: 'Платина III',   base: '#73BAE1', text: '#11364C' } },
  { min: 1600, tier: { key: 'diam-1',    label: 'Алмаз I',       base: '#5AD1E6', text: '#0E3A45' } },
  { min: 1700, tier: { key: 'diam-2',    label: 'Алмаз II',      base: '#5AD1E6', text: '#0E3A45' } },
  { min: 1800, tier: { key: 'diam-3',    label: 'Алмаз III',     base: '#5AD1E6', text: '#0E3A45' } },
  { min: 1900, tier: { key: 'master-1',  label: 'Мастер I',      base: '#7F42AF', text: '#FFFFFF' } },
  { min: 2000, tier: { key: 'master-2',  label: 'Мастер II',     base: '#7F42AF', text: '#FFFFFF' } },
  { min: 2100, tier: { key: 'master-3',  label: 'Мастер III',    base: '#7F42AF', text: '#FFFFFF' } },
  { min: 2200, tier: { key: 'gm-1',      label: 'Грандмастер I', base: '#C133B3', text: '#FFFFFF' } },
  { min: 2300, tier: { key: 'gm-2',      label: 'Грандмастер II',base: '#C133B3', text: '#FFFFFF' } },
  { min: 2400, tier: { key: 'gm-3',      label: 'Грандмастер III',base: '#C133B3', text: '#FFFFFF' } },
  { min: 2500, tier: { key: 'legend',    label: 'Легенда',       base: '#C95C5C', text: '#FFFFFF' } },
  { min: 2700, tier: { key: 'immortal',  label: 'Бессмертный',   base: '#8B1E3F', text: '#FFFFFF' } },
  { min: 3000, tier: { key: 'god',       label: 'Бог площадки',  base: '#E8732A', text: '#FFFFFF' } },
  { min: 3500, tier: { key: 'absolute',  label: 'Абсолют',       base: '#7C3AED', text: '#FFFFFF' } },
];

export function getRatingTier(rating: number): RatingTier {
  let found = TIERS[0].tier;
  for (const { min, tier } of TIERS) {
    if (rating >= min) found = tier;
  }
  return found;
}

/** Полная таблица уровней — для экрана «как работает рейтинг». */
export const RATING_TIERS = TIERS.map(({ min, tier }) => ({ min, ...tier }));

export interface TierProgress {
  current: RatingTier;
  /** null — уже максимальный тир («Абсолют»). */
  next: RatingTier | null;
  /** Сколько очков осталось до следующего тира. */
  pointsToNext: number;
  /** 0..1 — прогресс внутри текущего тира. */
  progress: number;
}

/** Прогресс до следующего тира — для профиля и празднования. */
export function getTierProgress(rating: number): TierProgress {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (rating >= TIERS[i].min) idx = i;
  }
  const current = TIERS[idx].tier;
  const currentMin = TIERS[idx].min;
  const nextEntry = TIERS[idx + 1] ?? null;

  if (!nextEntry) {
    return { current, next: null, pointsToNext: 0, progress: 1 };
  }
  const span = nextEntry.min - currentMin;
  return {
    current,
    next: nextEntry.tier,
    pointsToNext: Math.max(0, Math.ceil(nextEntry.min - rating)),
    progress: Math.min(1, Math.max(0, (rating - currentMin) / span)),
  };
}
