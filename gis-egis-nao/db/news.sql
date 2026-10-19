-- Таблица новостей: категория, дата, текст (допустимы HTML-ссылки, как в прежнем файле).
-- Для УЖЕ созданной базы выполните один раз:
--   podman exec -i gis-pg psql -U postgres -d gis_portal -v ON_ERROR_STOP=1 < db/news.sql
-- (для новой пустой базы таблица создаётся автоматически из schema.sql)

create table if not exists news (
  id           serial primary key,
  category     text    not null,            -- плашка в карточке: «Новое приложение», «Обновление данных»…
  published_at date    not null,
  body         text    not null,            -- текст новости; можно <a href="...">ссылка</a>
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Если таблица уже была создана раньше с колонкой title — переименовываем её в category
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'news' and column_name = 'title'
  ) then
    alter table news rename column title to category;
  end if;
end $$;

create index if not exists news_published_at_idx on news (published_at desc, id desc);
