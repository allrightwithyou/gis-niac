import type { ReactNode } from "react";

/**
 * Небольшой безопасный вывод Markdown без внешних пакетов.
 * Поддерживается: абзацы, заголовки (#, ##, ###), списки («- », «* », «1. »),
 * **жирный**, *курсив*, [текст](ссылка). Любой HTML в тексте выводится как обычный текст.
 * Ссылки разрешены только http(s), mailto и относительные (/..., #...).
 */

const SAFE_URL = /^(https?:\/\/|mailto:|\/|#)/i;
const INTERNAL_HOST = "geoportal.adm-nao.ru";

function renderLink(url: string, label: ReactNode[], key: string): ReactNode {
  // Чужие сайты открываем в новой вкладке, свои и относительные — в этой же
  const external = /^https?:\/\//i.test(url) && !url.includes(INTERNAL_HOST);

  return (
    <a
      key={key}
      href={url}
      className="text-accent underline underline-offset-2 hover:opacity-80"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));

    const key = `${keyPrefix}-${index++}`;

    if (match[1] !== undefined) {
      nodes.push(<strong key={key}>{renderInline(match[1], key)}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={key}>{renderInline(match[2], key)}</em>);
    } else if (SAFE_URL.test(match[4])) {
      nodes.push(renderLink(match[4], renderInline(match[3], key), key));
    } else {
      nodes.push(match[3]); // небезопасная ссылка (например, javascript:) — только текст
    }

    last = pattern.lastIndex;
  }

  if (last < text.length) nodes.push(text.slice(last));

  return nodes;
}

/** Строки абзаца с переносами: одиночный перенос строки = <br>. */
function renderLines(lines: string[], keyPrefix: string): ReactNode[] {
  return lines.flatMap((line, i) => [
    ...(i > 0 ? [<br key={`${keyPrefix}-br${i}`} />] : []),
    ...renderInline(line, `${keyPrefix}-l${i}`),
  ]);
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let blockIndex = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const key = `p${blockIndex++}`;
    blocks.push(
      <p key={key} className="mb-[8px] last:mb-0">
        {renderLines(paragraph, key)}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const key = `ul${blockIndex++}`;
    const items = list.items.map((item, i) => (
      <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={key} className="mb-[8px] ml-[20px] list-decimal">
          {items}
        </ol>
      ) : (
        <ul key={key} className="mb-[8px] ml-[20px] list-disc">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);

    if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const key = `h${blockIndex++}`;
      const size = ["text-[18px]", "text-[16px]", "text-[15px]"][heading[1].length - 1];
      blocks.push(
        <h3 key={key} className={`${size} mb-[6px] mt-[8px] font-semibold`}>
          {renderInline(heading[2], key)}
        </h3>,
      );
    } else if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();

  return <div className={className}>{blocks}</div>;
}
