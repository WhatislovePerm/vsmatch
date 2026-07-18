import { type FormEvent, useState } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import { loadTheme, setTheme, type Theme } from '../theme';
import type { Me } from '../api/auth';
import type { Match } from '../types';
import { Button, IconButton, Input } from './ui';
import { HistoryView } from './HistoryView';
import { AdminFeedbackView } from './AdminFeedbackView';
import { AdminStatsView } from './AdminStatsView';
import { RatingBadge } from './RatingBadge';
import { getTierProgress } from '../sport/ratingTiers';
import { useSport } from '../sport/SportContext';
import { SPORTS } from '../types';

interface Props {
  me: Me;
  history: Match[];
  onClose: () => void;
  onSave: (displayName: string) => Promise<void>;
}

export function ProfilePanel({ me, history, onClose, onSave }: Props) {
  const { sport } = useSport();
  const [displayName, setDisplayName] = useState(me.name ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const rating = me.ratings?.[sport] ?? 500;
  const tierProgress = getTierProgress(rating);
  const sportLabel = SPORTS.find((s) => s.kind === sport)?.label ?? sport;
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  const switchTheme = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await onSave(displayName);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[1200] bg-ink/10 backdrop-blur-[2px] flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <section className="w-full max-w-[460px] bg-card border border-line rounded-[28px] shadow-[0_24px_70px_-22px_rgba(31,44,65,0.32)] overflow-hidden my-auto">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight text-ink">Профиль</h2>
            <p className="mt-1 text-[13px] text-muted">Это имя видно в списке игроков матча.</p>
          </div>
          <IconButton onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </IconButton>
        </div>

        {/* Текущий тир + прогресс до следующего */}
        <div className="px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Рейтинг · {sportLabel}
            </div>
            <RatingBadge rating={rating} className="rating-shimmer" />
          </div>
          {tierProgress.next ? (
            <>
              <div className="h-1.5 rounded-full bg-subtle-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${Math.round(tierProgress.progress * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[12px] text-muted">
                До «{tierProgress.next.label}» осталось{' '}
                <span className="font-semibold text-ink-2 tabular-nums">{tierProgress.pointsToNext}</span> очков
              </div>
            </>
          ) : (
            <div className="text-[12px] text-muted">Максимальный тир. Ты — Абсолют. 🔥</div>
          )}

          {/* Тема оформления */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Тема</div>
            <nav className="inline-flex items-center gap-0.5 p-0.5 rounded-[12px] bg-subtle border border-line">
              <button
                type="button"
                onClick={() => switchTheme('light')}
                className={[
                  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[9px] text-[12.5px] font-semibold transition-colors',
                  theme === 'light' ? 'bg-card shadow-sm text-ink' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                <Sun size={14} /> Светлая
              </button>
              <button
                type="button"
                onClick={() => switchTheme('dark')}
                className={[
                  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[9px] text-[12.5px] font-semibold transition-colors',
                  theme === 'dark' ? 'bg-card shadow-sm text-ink' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                <Moon size={14} /> Тёмная
              </button>
            </nav>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4 border-b border-line">
          <Input
            label="Логин"
            value={displayName}
            maxLength={64}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
            placeholder="Например: striker77"
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-muted truncate">VK ID: {me.vkUserId}</span>
            {saved && <span className="text-[12px] font-semibold text-success">Сохранено</span>}
          </div>

          <Button block type="submit" disabled={busy || displayName.trim().length === 0}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </form>

        <div className="p-6">
          <HistoryView matches={history} currentUserId={me.userId} />
        </div>

        {me.isAdmin && (
          <div className="px-6 pb-6 pt-5 border-t border-line flex flex-col gap-5">
            <AdminStatsView />
            <AdminFeedbackView />
          </div>
        )}
      </section>
    </div>
  );
}
