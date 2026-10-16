-- Таблица новостей. Для УЖЕ созданной базы выполните один раз:
--   podman exec -i gis-pg psql -U postgres -d gis_portal -v ON_ERROR_STOP=1 < db/news.sql
-- (для новой пустой базы она создаётся автоматически из schema.sql)

create table if not exists news (
  id           serial primary key,
  title        text    not null,
  published_at date    not null,
  body         text    not null,            -- текст в Markdown
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists news_published_at_idx on news (published_at desc, id desc);
