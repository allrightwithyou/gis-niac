/**
 * Новость в базе. date — строка «ГГГГ-ММ-ДД» (так её отдаёт база и принимает <input type="date">).
 * body — текст новости; допустимы HTML-ссылки (на сайте он очищается вашим NewsCard через DOMPurify).
 */
export interface NewsItem {
  id: number;
  category: string;
  date: string;
  body: string;
  published: boolean;
}

/** «2026-08-07» → «07.08.2026» (в таком виде дата хранилась в файле и ждёт её NewsCard) */
export function formatNewsDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}