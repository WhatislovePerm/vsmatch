import { SPORTS } from '../types';
import { useSport } from '../sport/SportContext';
import { SportIcon } from './icons/SportIcon';

export function SportSwitcher() {
  const { sport, setSport } = useSport();

  return (
    <nav className="inline-flex items-center gap-0.5 p-0.5 rounded-[14px] bg-subtle border border-line shrink-0">
      {SPORTS.map((s) => {
        const active = s.kind === sport;
        return (
          <button
            key={s.kind}
            type="button"
            onClick={() => setSport(s.kind)}
            title={s.label}
            aria-label={s.label}
            className={[
              'inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-[11px] transition-colors',
              active ? 'bg-card shadow-sm text-ink-3' : 'text-muted hover:bg-card/60 hover:text-ink-2',
            ].join(' ')}
          >
            <SportIcon kind={s.kind} size={20} />
          </button>
        );
      })}
    </nav>
  );
}
