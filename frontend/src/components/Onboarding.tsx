import { useState } from 'react';
import { ArrowRight, MapPin, Swords, Trophy, ShieldCheck, ChevronLeft } from 'lucide-react';
import { getAuthorizeUrl } from '../api/auth';
import { PENDING_INVITE_KEY } from '../auth/storage';
import { Button } from './ui';
import { Logo } from './icons/Logo';

interface Props {
  error?: string | null;
}

type Step = 0 | 1 | 2;

export function Onboarding({ error }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setLoading(true);
    try {
      const invite = localStorage.getItem(PENDING_INVITE_KEY);
      const url = await getAuthorizeUrl(invite);
      window.location.href = url;
    } catch (e) {
      alert(String(e));
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-5 py-8"
      style={{
        background:
          'radial-gradient(circle at 22% 12%, rgba(26,26,46,0.06), transparent 50%), ' +
          'radial-gradient(circle at 82% 88%, rgba(31,122,58,0.08), transparent 50%), ' +
          'var(--color-page)',
      }}
    >
      <div className="w-full max-w-[440px] bg-card rounded-[32px] border border-line p-7 sm:p-9 shadow-[0_30px_80px_-30px_rgba(31,44,65,0.25)]">
        {/* Шапка-навигация */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[12px] bg-ink-3 text-white flex items-center justify-center">
              <Logo size={22} />
            </span>
            <span className="font-bold text-[16px] tracking-tight text-ink">TopLoc</span>
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink transition-colors"
            >
              <ChevronLeft size={15} /> Назад
            </button>
          )}
        </div>

        {/* Прогресс */}
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={[
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-ink-3' : 'bg-line',
              ].join(' ')}
            />
          ))}
        </div>

        {step === 0 && <Screen1 />}
        {step === 1 && <Screen2 />}
        {step === 2 && <Screen3 />}

        {error && (
          <div className="mt-5 px-4 py-3 rounded-[14px] bg-danger-bg border border-danger-line text-danger text-[13px] leading-relaxed break-words">
            {error}
          </div>
        )}

        <div className="mt-7">
          {step === 0 && (
            <Button block size="lg" iconRight={<ArrowRight size={18} />} onClick={() => setStep(1)}>
              Как это работает?
            </Button>
          )}
          {step === 1 && (
            <Button block size="lg" iconRight={<ArrowRight size={18} />} onClick={() => setStep(2)}>
              Как работает рейтинг
            </Button>
          )}
          {step === 2 && (
            <Button block size="lg" disabled={loading} iconRight={<ArrowRight size={18} />} onClick={register}>
              {loading ? 'Загружаем…' : 'Зарегистрироваться'}
            </Button>
          )}
        </div>

        {step < 2 && (
          <button
            type="button"
            onClick={register}
            disabled={loading}
            className="mt-3 w-full text-center text-[13px] text-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            Уже с нами — войти
          </button>
        )}
      </div>
    </div>
  );
}

function Screen1() {
  return (
    <div className="text-center">
      <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-ink leading-tight">
        Найди соперника рядом и поднимайся в рейтинге
      </h1>
      <p className="mt-3 text-[14px] text-muted leading-relaxed">
        Играй в футбол, баскетбол, настольный теннис и другие виды спорта.
        Договаривайся о матчах, подтверждай результат и становись топом своей локации.
      </p>
    </div>
  );
}

function Screen2() {
  const items = [
    {
      icon: <MapPin size={18} />,
      title: 'Найди соперника рядом',
      text: 'Выбери вид спорта, район или площадку и найди, с кем сыграть.',
    },
    {
      icon: <Swords size={18} />,
      title: 'Создай матч или откликнись на другие',
      text: 'Договорись о времени, месте и формате игры.',
    },
    {
      icon: <Trophy size={18} />,
      title: 'Получи рейтинг',
      text: 'После матча результат подтверждается, а ты получаешь очки и растёшь в таблице.',
    },
  ];
  return (
    <div>
      <h1 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-ink leading-tight mb-5">
        Как это работает
      </h1>
      <ol className="flex flex-col gap-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3 bg-subtle border border-line rounded-[18px] p-3.5">
            <span className="w-9 h-9 rounded-[12px] bg-ink-3 text-white flex items-center justify-center shrink-0">
              {it.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink">{i + 1}. {it.title}</div>
              <div className="mt-0.5 text-[12.5px] text-muted leading-snug">{it.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Screen3() {
  return (
    <div>
      <div className="flex justify-center mb-4">
        <span className="w-14 h-14 rounded-[20px] bg-success-bg border border-success-line text-success flex items-center justify-center">
          <ShieldCheck size={26} />
        </span>
      </div>
      <h1 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-ink leading-tight text-center">
        Честный рейтинг
      </h1>
      <p className="mt-3 text-[14px] text-muted leading-relaxed text-center">
        Результат матча подтверждают участники. Если данные не совпадают, матч уходит на проверку.
        Так рейтинг остаётся честным и ценным.
      </p>
    </div>
  );
}
