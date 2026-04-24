import { useState } from 'react';
import { getAuthorizeUrl } from '../api/auth';

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
    <div className="login">
      <div className="login__card">
        <div className="login__logo">⚽</div>
        <h1 className="login__title">VSMatch</h1>
        <p className="login__subtitle">
          Коробки Москвы, матчи, рейтинг
        </p>

        {error && <div className="login__error">{error}</div>}

        <button
          className="login__button"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Загружаем…' : 'Войти через VK ID'}
        </button>

        <p className="login__hint">
          Для входа используется VK ID. Личные данные не сохраняются.
        </p>
      </div>
    </div>
  );
}
