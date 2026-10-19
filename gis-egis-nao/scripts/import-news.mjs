// Переносит новости из текстового файла (gisnao.news) в базу.
// Формат строки:  Категория | дд.мм.гггг | Текст (HTML-ссылки <a href="...">...</a> допустимы)
// Текст переносится как есть: на сайте его очищает ваш NewsCard (DOMPurify).
// Печатает SQL в стандартный вывод, предупреждения — в стандартный вывод ошибок.
// Повторный запуск безопасен: уже перенесённые новости (та же категория, дата и текст) не дублируются.
//
// Запуск в одноразовом контейнере Node (на сервере Node ставить не нужно) — см. README.

import { readFile } from "node:fs/promises";

const file = process.env.NEWS_FILE ?? "/news.txt";
const raw = (await readFile(file, "utf8")).replace(/^\uFEFF/, "");

const q = (value) => "'" + String(value).replace(/'/g, "''") + "'";
const warn = (message) => console.error("ВНИМАНИЕ: " + message);

const items = [];

raw.split(/\r?\n/).forEach((line, index) => {
  if (!line.trim() || line.trim().startsWith("#")) return;

  const parts = line.split("|");
  const category = parts[0]?.trim() ?? "";
  const dateText = parts[1]?.trim() ?? "";
  const body = parts.slice(2).join("|").trim(); // в тексте допустим символ «|»
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dateText);

  if (!category || !match || !body) {
    warn(`строка ${index + 1} пропущена (нужно «Категория | дд.мм.гггг | Текст»): ${line.slice(0, 80)}`);
    return;
  }

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(`${iso}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    warn(`строка ${index + 1}: некорректная дата ${dateText}`);
    return;
  }

  items.push({ category, iso, body });
});

// Если в файле новости идут от новых к старым, вставляем в обратном порядке:
// у новостей с одной датой так сохранится порядок из файла.
if (items.length > 1 && items[0].iso >= items[items.length - 1].iso) items.reverse();

const lines = [
  `-- Перенос новостей из файла: ${items.length} шт. Повторный запуск не создаёт дубликатов.`,
  "begin;",
];

for (const item of items) {
  lines.push(
    `insert into news (category, published_at, body) select ${q(item.category)}, ${q(item.iso)}, ${q(item.body)} ` +
      `where not exists (select 1 from news where category = ${q(item.category)} and published_at = ${q(item.iso)} and body = ${q(item.body)});`,
  );
}

lines.push("commit;", "");
console.log(lines.join("\n"));
console.error(`Готово: подготовлено новостей — ${items.length}`);
