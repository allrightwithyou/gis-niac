-- Схема портала: разделы главной страницы, карты разделов и инструменты карт.
-- Безопасно запускать повторно (create ... if not exists).

create table if not exists sections (
  id           serial primary key,
  name         text    not null,
  short_name   text    not null,
  category     text    not null,
  statistic    text    not null default '',
  img          text    not null default '',
  shadow_color text    not null default '#00000040',
  position     integer not null default 0,
  visible      boolean not null default true
);

-- Какие карты NGW (веб-карты) входят в раздел и в каком порядке
create table if not exists section_maps (
  section_id  integer not null references sections(id) on delete cascade,
  resource_id integer not null,
  position    integer not null default 0,
  primary key (section_id, resource_id)
);

-- Какие инструменты включены на карте (по ID веб-карты NGW)
create table if not exists map_tools (
  resource_id integer not null,
  tool_id     text    not null,
  primary key (resource_id, tool_id)
);

-- Новости (текст в Markdown)
create table if not exists news (
  id           serial primary key,
  title        text    not null,
  published_at date    not null,
  body         text    not null,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists news_published_at_idx on news (published_at desc, id desc);
