export interface RatingTier {
  key: string;
  label: string;
  emoji: string;
  /** background + text + ring (Tailwind/inline-friendly). */
  className: string;
}

const TIERS: Array<{ min: number; tier: RatingTier }> = [
  {
    min: 0,
    tier: {
      key: 'rookie',
      label: 'Новичок',
      emoji: '🥚',
      className:
        'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 border border-slate-300',
    },
  },
  {
    min: 700,
    tier: {
      key: 'bronze',
      label: 'Бронза',
      emoji: '🥉',
      className:
        'bg-gradient-to-r from-amber-200 to-orange-300 text-orange-900 border border-orange-300',
    },
  },
  {
    min: 850,
    tier: {
      key: 'silver',
      label: 'Серебро',
      emoji: '🥈',
      className:
        'bg-gradient-to-r from-slate-100 to-slate-300 text-slate-700 border border-slate-400',
    },
  },
  {
    min: 950,
    tier: {
      key: 'gold',
      label: 'Золото',
      emoji: '🥇',
      className:
        'bg-gradient-to-r from-yellow-200 to-amber-400 text-yellow-900 border border-amber-400',
    },
  },
  {
    min: 1050,
    tier: {
      key: 'platinum',
      label: 'Платина',
      emoji: '💠',
      className:
        'bg-gradient-to-r from-cyan-100 to-sky-300 text-sky-900 border border-sky-400',
    },
  },
  {
    min: 1200,
    tier: {
      key: 'diamond',
      label: 'Алмаз',
      emoji: '💎',
      className:
        'bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300 text-indigo-900 border border-indigo-400',
    },
  },
  {
    min: 1400,
    tier: {
      key: 'master',
      label: 'Мастер',
      emoji: '🛡️',
      className:
        'bg-gradient-to-r from-violet-300 to-purple-400 text-white border border-purple-500 shadow-[0_2px_10px_-2px_rgba(168,85,247,0.4)]',
    },
  },
  {
    min: 1600,
    tier: {
      key: 'champion',
      label: 'Чемпион',
      emoji: '👑',
      className:
        'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white border border-fuchsia-500 shadow-[0_2px_14px_-2px_rgba(217,70,239,0.5)]',
    },
  },
  {
    min: 1850,
    tier: {
      key: 'grandmaster',
      label: 'Гроссмейстер',
      emoji: '🏆',
      className:
        'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white border border-amber-400 shadow-[0_2px_16px_-2px_rgba(244,63,94,0.55)]',
    },
  },
  {
    min: 2100,
    tier: {
      key: 'legend',
      label: 'Легенда',
      emoji: '🔥',
      className:
        'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 text-white border border-yellow-300 shadow-[0_2px_18px_-2px_rgba(220,38,38,0.6)]',
    },
  },
];

export function getRatingTier(rating: number): RatingTier {
  let found = TIERS[0].tier;
  for (const { min, tier } of TIERS) {
    if (rating >= min) found = tier;
  }
  return found;
}
