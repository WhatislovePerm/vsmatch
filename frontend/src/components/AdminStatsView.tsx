import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, CalendarCheck, MapPin, MessageSquareWarning, Users } from 'lucide-react';
import { fetchAdminStats, type AdminStats } from '../api/admin';
import { RatingBadge } from './RatingBadge';
import type { SportKind } from '../types';
import { SPORTS } from '../types';

export function AdminStatsView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topSport, setTopSport] = useState<SportKind>('Football');

  useEffect(() => {
    let alive = true;
    fetchAdminStats()
      .then((res) => {
        if (alive) setStats(res);
      })
      .catch((err) => {
        if (alive) setError((err as Error)?.message ?? 'Не удалось загрузить статистику');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <section className="rounded-[18px] border border-danger-line bg-danger-bg p-4 text-[13px] text-danger">
        {error}
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="rounded-[18px] border border-line bg-subtle p-4 text-[13px] text-muted">
        Загружаем статистику…
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">
          Статистика
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric icon={<Users size={15} />} label="Игроки" value={stats.users} />
        <Metric icon={<MapPin size={15} />} label="Площадки" value={stats.courts} />
        <Metric icon={<Activity size={15} />} label="Активные" value={stats.activeMatches} />
        <Metric icon={<CalendarCheck size={15} />} label="Завершено" value={stats.completedMatches} />
        <Metric icon={<CalendarCheck size={15} />} label="Всего матчей" value={stats.matches} />
        <Metric icon={<MessageSquareWarning size={15} />} label="Новые обращения" value={stats.newFeedback} />
      </div>

      {stats.topPlayers.length > 0 && (
        <div className="rounded-[18px] bg-subtle border border-line p-3">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Топ рейтинга
            </div>
            <nav className="inline-flex items-center gap-0.5 p-0.5 rounded-[10px] bg-card border border-line">
              {SPORTS.map((s) => (
                <button
                  key={s.kind}
                  type="button"
                  onClick={() => setTopSport(s.kind)}
                  className={[
                    'px-2.5 h-7 rounded-[8px] text-[11.5px] font-semibold transition-colors whitespace-nowrap',
                    topSport === s.kind ? 'bg-ink-3 text-white' : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>

          {(() => {
            const players = stats.topPlayers.filter((p) => p.sport === topSport);
            if (players.length === 0) {
              return <div className="text-[12.5px] text-muted py-1.5">По этому спорту ещё никто не играл</div>;
            }
            return (
              <div className="flex flex-col gap-2">
                {players.map((player, idx) => (
                  <div key={`${player.userId}-${player.sport}`} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-[12px] font-bold text-muted-2 tabular-nums shrink-0">{idx + 1}</span>
                      <div className="text-[13px] font-semibold text-ink truncate">{player.displayName}</div>
                    </div>
                    <RatingBadge rating={player.rating} size="sm" showLabel={false} className="shrink-0" />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[16px] bg-subtle border border-line p-3">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="mt-1 text-[20px] font-bold text-ink tabular-nums">{value}</div>
    </div>
  );
}
