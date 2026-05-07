import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getAuthorizeUrl } from '../api/auth';
import { Button } from './ui';

interface Props {
  error?: string | null;
}

export function Login({ error }: Props) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const url = await getAuthorizeUrl();
      window.location.href = url;
    } catch (e) {
      alert(String(e));
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-10"
      style={{
        background:
          'radial-gradient(circle at 25% 15%, rgba(26,26,46,0.06), transparent 50%), ' +
          'radial-gradient(circle at 80% 85%, rgba(31,122,58,0.08), transparent 50%), ' +
          'var(--color-page)',
      }}
    >
      <div className="w-full max-w-[400px] bg-card rounded-[32px] border border-line p-9 shadow-[0_30px_80px_-30px_rgba(31,44,65,0.25)]">
        {/* Логотип-плитка */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-[20px] bg-ink-3 text-white flex items-center justify-center text-[28px] shadow-[0_8px_24px_-6px_rgba(26,26,46,0.5)]">
            ⚽
          </div>
        </div>

        {/* Заголовок */}
        <div className="mt-6 text-center">
          <h1 className="text-[28px] font-bold tracking-tight text-ink leading-none">VSMatch</h1>
          <p className="mt-2 text-[14px] text-muted">
            Коробки Москвы, матчи, рейтинг
          </p>
        </div>

        {error && (
          <div className="mt-6 px-4 py-3 rounded-[14px] bg-danger-bg border border-danger-line text-danger text-[13px] leading-relaxed break-words">
            {error}
          </div>
        )}

        {/* Кнопка */}
        <div className="mt-8">
          <Button
            block
            size="lg"
            disabled={loading}
            onClick={handleLogin}
            iconRight={<ArrowRight size={18} />}
          >
            {loading ? 'Загружаем…' : 'Войти через VK ID'}
          </Button>
        </div>

        {/* Подпись */}
        <div className="mt-6 flex items-start gap-2.5 text-[12.5px] text-muted leading-relaxed">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted-2" />
          <span>Используется VK ID. Личные данные не сохраняются.</span>
        </div>
      </div>
    </div>
  );
}
