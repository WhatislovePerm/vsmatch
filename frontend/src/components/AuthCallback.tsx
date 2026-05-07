import { useEffect } from 'react';
import { saveToken } from '../auth/storage';

interface Props {
  onError: (err: string) => void;
  onSuccess: () => void;
}

export function AuthCallback({ onError, onSuccess }: Props) {
  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const error = params.get('error');
    if (error) {
      window.history.replaceState(null, '', '/');
      onError(error);
      return;
    }

    const token = params.get('token');
    const expiresAt = params.get('expiresAt');
    if (!token || !expiresAt) {
      window.history.replaceState(null, '', '/');
      onError('Не получен токен от VK ID.');
      return;
    }

    saveToken({ token, expiresAt });
    window.history.replaceState(null, '', '/');
    onSuccess();
  }, [onError, onSuccess]);

  return <FullScreenLoader label="Завершаем вход…" />;
}

export function FullScreenLoader({ label = 'Загружаем…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-page]">
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-full border-[3px] border-[--color-line] border-t-[--color-ink-3] animate-spin" />
        <p className="text-[14px] text-[--color-muted]">{label}</p>
      </div>
    </div>
  );
}
