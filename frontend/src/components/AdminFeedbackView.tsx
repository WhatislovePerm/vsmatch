import { useEffect, useState } from 'react';
import { Inbox, Loader } from 'lucide-react';
import { fetchAllFeedback, updateFeedback, type FeedbackItem, type FeedbackStatus } from '../api/feedback';
import { Badge, Button } from './ui';

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  New: 'Новое',
  InProgress: 'В работе',
  Resolved: 'Решено',
};

const STATUS_TONE: Record<FeedbackStatus, 'warn' | 'info' | 'success'> = {
  New: 'warn',
  InProgress: 'info',
  Resolved: 'success',
};

export function AdminFeedbackView() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetchAllFeedback();
      setItems(res);
    } catch (e) {
      setError((e as Error)?.message ?? 'Не удалось загрузить');
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (item: FeedbackItem, status: FeedbackStatus) => {
    setBusyId(item.id);
    try {
      const updated = await updateFeedback(item.id, status, item.reply);
      setItems((cur) => (cur ?? []).map((x) => (x.id === updated.id ? updated : x)));
    } finally {
      setBusyId(null);
    }
  };

  if (items === null) {
    return (
      <div className="flex items-center gap-2 text-muted text-[13px] py-3">
        <Loader size={14} className="animate-spin" /> Загружаем обращения…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center text-muted text-[13px] py-6 flex flex-col items-center gap-2">
        <Inbox size={20} className="text-muted-2" />
        Обращений пока нет
        {error && <div className="text-danger text-[12px] mt-1">{error}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted">Обращения</h3>
        <Badge tone="neutral">{items.length}</Badge>
      </div>
      {items.map((item) => (
        <article key={item.id} className="bg-subtle border border-line rounded-[16px] p-3.5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-ink truncate">
                {item.authorName}
                {item.authorVkUserId && (
                  <span className="ml-1.5 text-[11px] text-muted">vk_id={item.authorVkUserId}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-2 tabular-nums">
                {new Date(item.createdAt).toLocaleString('ru-RU')}
              </div>
            </div>
            <Badge tone={STATUS_TONE[item.status]} className="shrink-0">{STATUS_LABEL[item.status]}</Badge>
          </div>

          <p className="text-[13.5px] text-ink-2 whitespace-pre-wrap break-words">{item.message}</p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {(['New', 'InProgress', 'Resolved'] as FeedbackStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={item.status === s ? 'primary' : 'secondary'}
                onClick={() => setStatus(item, s)}
                disabled={busyId === item.id || item.status === s}
              >
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
