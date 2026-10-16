// ПУТЬ В ПРОЕКТЕ: src/app/main/news/page.tsx (заменяет прежний файл, который читал gisnao.news)
import Image from "next/image";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getPublishedNews } from "@/app/lib/news-db";
import { formatNewsDate } from "@/app/lib/news-format";
// Прежний способ (файл gisnao.news) — только как запасной вариант, если база недоступна
import { parseNewsFile, type NewsItem as CardNews } from "@/app/lib/news";
import NewsCard from "../components/NewsCard";

// Новости читаются из базы при каждом запросе, а не один раз при сборке образа
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  let news: CardNews[] = [];
  let failed = false;

  try {
    const rows = await getPublishedNews();

    // Приводим к виду, который ждёт NewsCard: нумерация 01, 02… сверху вниз, дата «дд.мм.гггг»,
    // категория — плашка, текст (с HTML-ссылками) — в поле title
    news = rows.map(
      (row, index) =>
        ({
          id: index + 1,
          category: row.category,
          date: formatNewsDate(row.date),
          title: row.body,
        }) as unknown as CardNews,
    );
  } catch (error) {
    console.error("getPublishedNews failed, используется файл gisnao.news:", error);

    try {
      const fileContents = await readFile(path.join(process.cwd(), "gisnao.news"), "utf8");
      news = parseNewsFile(fileContents);
    } catch (fileError) {
      failed = true;
      console.error("Не удалось прочитать и gisnao.news:", fileError);
    }
  }

  return (
    <div className="justify-center flex px-[24px] py-[40px]">
      <div className="max-w-[1400px] w-full flex flex-col gap-[34px]">
        <Link
          href="/main/"
          className="flex gap-[6px] pr-[12px] flex-row items-center border-r-[1px] border-margin "
        >
          <Image
            className="block"
            src="/back.svg"
            alt="Назад"
            width={16}
            height={16}
          />{" "}
          <span className="text-hero hover:text-accent transition-colors text-[14px]">
            На главную
          </span>
        </Link>

        <div>
          <span className="shadow-md  uppercase text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
            Пресс-центр
          </span>
        </div>

        <div className="flex flex-col gap-[15px]">
          <h1 className="text-3xl sm:text-4xl md:text-5xl">Новости системы</h1>
          <p className="text-balance text-hero text-sm sm:text-base">
            Обновления геопортала, новые наборы данных и важные события цифровой
            инфраструктуры округа.
          </p>
        </div>

        <div className="flex flex-col gap-[18px]">
          {failed ? (
            <p className="text-footer">Не удалось загрузить новости. Попробуйте позже.</p>
          ) : news.length === 0 ? (
            <p className="text-footer">Новостей пока нет.</p>
          ) : (
            news.map((item) => <NewsCard key={item.id} news={item} />)
          )}
        </div>
      </div>
    </div>
  );
}
