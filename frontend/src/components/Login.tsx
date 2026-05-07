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
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-[--color-page]">
      <div className="w-full max-w-[420px] bg-[--color-card] rounded-[44px] border border-[--color-line] p-8 sm:p-10 shadow-[0_30px_80px_-30px_rgba(31,44,65,0.18)]">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-[22px] bg-[--color-ink-3] text-white flex items-center justify-center text-[32px] mb-5">
            ⚽
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-[--color-ink]">VSMatch</h1>
          <p className="mt-1.5 text-[14px] text-[--color-muted]">
            Коробки Москвы, матчи, рейтинг
          </p>
        </div>

        {error && (
          <div className="mt-6 px-4 py-3 rounded-[14px] bg-[#fdecec] border border-[#f8c9c9] text-[#b91c1c] text-[13px] leading-relaxed break-words">
            {error}
          </div>
        )}

        <div className="mt-7">
          <Button
            block
            disabled={loading}
            onClick={handleLogin}
            iconRight={<ArrowRight size={18} />}
          >
            {loading ? 'Загружаем…' : 'Войти через VK ID'}
          </Button>
        </div>

        <div className="mt-6 flex items-start gap-2.5 text-[12px] text-[--color-muted]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[--color-muted-2]" />
          <span>Используется VK ID. Личные данные не сохраняются.</span>
        </div>
      </div>
    </div>
  );
}
