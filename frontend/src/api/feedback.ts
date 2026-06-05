import { authFetch, throwApiError } from './client';

export type FeedbackStatus = 'New' | 'InProgress' | 'Resolved';

export interface FeedbackItem {
  id: string;
  userId: string;
  authorName: string;
  authorVkUserId: string | null;
  message: string;
  status: FeedbackStatus;
  reply: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export async function createFeedback(message: string): Promise<FeedbackItem> {
  const res = await authFetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось отправить обращение');
  return res.json();
}

export async function fetchAllFeedback(): Promise<FeedbackItem[]> {
  const res = await authFetch('/api/admin/feedback?pageSize=100');
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить обращения');
  return res.json();
}

export async function updateFeedback(id: string, status: FeedbackStatus, reply: string | null): Promise<FeedbackItem> {
  const res = await authFetch(`/api/admin/feedback/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reply }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось обновить обращение');
  return res.json();
}
