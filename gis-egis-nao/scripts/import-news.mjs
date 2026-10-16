// Переносит новости из текстового файла (geoportal.news) в базу.
// Формат строки:  Заголовок | дд.мм.гггг | Текст (можно с HTML-ссылками <a href="...">...</a>)
// HTML-ссылки и простое оформление превращаются в Markdown. Печатает SQL в стандартный вывод,
// предупреждения — в стандартный вывод ошибок. Повторный запуск безопасен: уже перенесённые
// новости (тот же заголовок и дата) не дублируются.
//
// Запуск в одноразовом контейнере Node (на ВМ Node ставить не нужно) — см. инструкцию.

import { readFile } from "node:fs/promises";

const file = process.env.NEWS_FILE ?? "/news.txt";
const raw = (await readFile(file, "utf8")).replace(/^\uFEFF/, "");

const q = (value) => "'" + String(value).replace(/'/g, "''") + "'";
const warn = (message) => console.error("ВНИМАНИЕ: " + message);

/** Простое HTML-оформление из файла → Markdown. */
function htmlToMarkdown(html) {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "")
    // ссылки: <a href="..." target="...">текст</a> → [текст](адрес)
    .replace(/<a\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const clean = label.replace(/<[^>]+>/g, "").trim() || href;
      return `[${clean}](${href.replace(/\)/g, "%29").replace(/\s/g, "%20")})`;
    })
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, "*$2*");

  const leftover = text.match(/<\/?[a-z][^>]*>/gi);
  if (leftover) warn(`остались HTML-теги: ${[...new Set(leftover)].join(" ")}`);

  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

const items = [];

raw.split(/\r?\n/).forEach((line, index) => {
  if (!line.trim() || line.trim().startsWith("#")) return;

  const parts = line.split("|");
  const title = parts[0]?.trim() ?? "";
  const dateText = parts[1]?.trim() ?? "";
  const body = parts.slice(2).join("|").trim();
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dateText);

  if (!title || !match || !body) {
    warn(`строка ${index + 1} пропущена (нужно «Заголовок | дд.мм.гггг | Текст»): ${line.slice(0, 80)}`);
    return;
  }

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(`${iso}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    warn(`строка ${index + 1}: некорректная дата ${dateText}`);
    return;
  }

  items.push({ title, iso, body: htmlToMarkdown(body) });
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
    `insert into news (title, published_at, body) select ${q(item.title)}, ${q(item.iso)}, ${q(item.body)} ` +
      `where not exists (select 1 from news where title = ${q(item.title)} and published_at = ${q(item.iso)});`,
  );
}

lines.push("commit;", "");
console.log(lines.join("\n"));
console.error(`Готово: подготовлено новостей — ${items.length}`);
