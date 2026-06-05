import { type FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import type { Me } from '../api/auth';
import type { Match } from '../types';
import { Button, IconButton, Input } from './ui';
import { HistoryView } from './HistoryView';
import { AdminFeedbackView } from './AdminFeedbackView';

interface Props {
  me: Me;
  history: Match[];
  onClose: () => void;
  onSave: (displayName: string) => Promise<void>;
}

export function ProfilePanel({ me, history, onClose, onSave }: Props) {
  const [displayName, setDisplayName] = useState(me.name ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <section className="w-full max-w-[460px] bg-white border border-line rounded-[28px] shadow-[0_24px_70px_-22px_rgba(31,44,65,0.32)] overflow-hidden my-auto">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight text-ink">Профиль</h2>
            <p className="mt-1 text-[13px] text-muted">Это имя видно в списке игроков матча.</p>
          </div>
          <IconButton onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </IconButton>
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
          <div className="px-6 pb-6 pt-2 border-t border-line">
            <AdminFeedbackView />
          </div>
        )}
      </section>
    </div>
  );
}
