/** Новость. date — строка «ГГГГ-ММ-ДД» (так её отдаёт база и принимает <input type="date">). */
export interface NewsItem {
  id: number;
  title: string;
  date: string;
  body: string;
  published: boolean;
}

/** «2026-08-07» → «07.08.2026» */
export function formatNewsDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
}
