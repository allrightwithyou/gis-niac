-- Пароли карт. Для УЖЕ созданной базы выполните один раз:
--   podman exec -i gis-pg psql -U postgres -d gis_portal -v ON_ERROR_STOP=1 < db/map-passwords.sql
-- (для новой пустой базы таблица создаётся автоматически из schema.sql)
-- Хранится только хеш пароля (scrypt), сам пароль восстановить нельзя.

create table if not exists map_passwords (
  resource_id   integer primary key,          -- ID веб-карты NGW
  password_hash text    not null,
  updated_at    timestamptz not null default now()
);
