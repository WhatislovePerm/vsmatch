import { type FormEvent, useState } from 'react';
import { AlertTriangle, Check, MessageSquare, X } from 'lucide-react';
import { createFeedback } from '../api/feedback';
import { Button, IconButton } from './ui';

interface Props {
  onClose: () => void;
}

function extractErrorMessage(err: unknown): string | null {
  if (err instanceof Error && err.message) return err.message;
  return null;
}

export function FeedbackModal({ onClose }: Props) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createFeedback(message.trim());
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(extractErrorMessage(err) ?? 'Не удалось отправить');
    } finally {
      setBusy(false);
    }
  };

  return (
    // items-start на мобиле: при открытой клавиатуре модалка остаётся видимой сверху,
    // а не прячется за клавиатуру по центру экрана.
    <div className="absolute inset-0 z-[1300] bg-ink/20 backdrop-blur-[2px] flex items-start sm:items-center justify-center p-4 pt-6 sm:pt-4 overflow-y-auto">
      <section className="w-full max-w-[460px] bg-card border border-line rounded-[28px] shadow-[0_24px_70px_-22px_rgba(31,44,65,0.32)] overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-subtle border border-line flex items-center justify-center shrink-0">
              <MessageSquare size={18} className="text-ink-2" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-ink leading-tight">Обратная связь</h2>
              <p className="mt-1 text-[13px] text-muted">Расскажите что не работает или что добавить.</p>
            </div>
          </div>
          <IconButton onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </IconButton>
        </div>

        {sent ? (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-success">
              <div className="w-9 h-9 rounded-full bg-success-bg border border-success-line flex items-center justify-center">
                <Check size={18} />
              </div>
              <div className="text-[14px] font-semibold">Спасибо, обращение отправлено!</div>
            </div>
            <Button block onClick={onClose}>Закрыть</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 flex flex-col gap-4">
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setError(null); }}
              placeholder="Опишите проблему или идею…"
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 bg-subtle border border-line rounded-[14px] text-[14px] text-ink placeholder:text-muted-2 transition-colors focus:outline-none focus:border-ink-3/40 focus:bg-card resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Не публикуйте оскорбительный контент.</span>
              <span className="tabular-nums">{message.length}/2000</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-[12px] bg-danger-bg border border-danger-line text-danger text-[12.5px] leading-snug">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <Button block type="submit" disabled={busy || message.trim().length < 3}>
              {busy ? 'Отправляем…' : 'Отправить'}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
