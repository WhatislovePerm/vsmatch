# Deploy to VPS (Ubuntu 24.04)

## 1. Подготовка VPS

```bash
ssh root@141.98.191.147

# Обновить пакеты
apt update && apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com | sh

# Опционально: firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## 2. Код на сервер

```bash
# На VPS
mkdir -p /opt/vsmatch && cd /opt/vsmatch
git clone <URL_репозитория> .
```

## 3. Секреты

```bash
cd /opt/vsmatch
cp .env.example .env

# Сгенерировать сильные секреты:
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" 
echo "JWT_KEY=$(openssl rand -base64 48)"

# Открыть .env и вписать:
#  - POSTGRES_PASSWORD (из команды выше)
#  - JWT_KEY (из команды выше)
#  - VKID_CLIENT_SECRET (из дашборда VK ID)
nano .env
```

## 4. Запуск

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy автоматически получит HTTPS-сертификат от Let's Encrypt для `vsmatch.ru` при первом старте (нужно чтобы DNS уже указывал на IP сервера — у тебя уже указан).

## 5. Проверка

```bash
# Контейнеры
docker compose -f docker-compose.prod.yml ps

# Логи API (миграции должны применяться, вкл. SeedCourts → 111 записей)
docker compose -f docker-compose.prod.yml logs -f api

# Проверить БД
docker exec -it vsmatch-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c 'SELECT COUNT(*) FROM "Courts";'
```

Открой в браузере: **https://vsmatch.ru**

## 6. Обновление кода

```bash
cd /opt/vsmatch
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Миграции применятся автоматически при старте API.

## 7. Бэкапы БД

```bash
# Дамп
docker exec vsmatch-postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%F).sql

# Восстановление
cat backup.sql | docker exec -i vsmatch-postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

## Типовые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| Caddy не может получить сертификат | DNS не обновился / порт 80 занят | `dig vsmatch.ru` — должно вернуть 141.98.191.147; `lsof -i :80` — никто не должен занимать |
| API падает на старте | Postgres ещё не готов | `depends_on: condition: service_healthy` должно помочь; если нет — `docker compose restart api` |
| VK ID: "invalid redirect_uri" | RedirectUri не совпадает с зарегистрированным в VK ID | В дашборде VK ID добавить `https://vsmatch.ru/api/auth/vkid/callback` |
| 502 от Caddy на /api/* | API упал | `docker compose logs api` |
