import { pool } from "./db";
import type { NewsItem } from "./news-format";

interface NewsRow {
  id: number;
  title: string;
  date: string;
  body: string;
  published: boolean;
}

// to_char — чтобы дата приходила строкой «ГГГГ-ММ-ДД», без сдвига часовых поясов
const SELECT = `
  select id, title, to_char(published_at, 'YYYY-MM-DD') as date, body, published
  from news
`;

const ORDER = "order by published_at desc, id desc";

const toItem = (row: NewsRow): NewsItem => ({
  id: row.id,
  title: row.title,
  date: row.date,
  body: row.body,
  published: row.published,
});

/** Опубликованные новости, новые сверху — для страницы «Новости». */
export async function getPublishedNews(): Promise<NewsItem[]> {
  const { rows } = await pool.query<NewsRow>(`${SELECT} where published ${ORDER}`);
  return rows.map(toItem);
}

/** Все новости, включая скрытые, — для админки. */
export async function getAllNews(): Promise<NewsItem[]> {
  const { rows } = await pool.query<NewsRow>(`${SELECT} ${ORDER}`);
  return rows.map(toItem);
}

export async function getNewsById(id: number): Promise<NewsItem | null> {
  const { rows } = await pool.query<NewsRow>(`${SELECT} where id = $1`, [id]);
  return rows[0] ? toItem(rows[0]) : null;
}
