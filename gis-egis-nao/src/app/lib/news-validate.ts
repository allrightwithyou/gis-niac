// Проверка данных новости при создании и изменении (общая для обоих API-маршрутов).

export interface NewsInput {
  title: string;
  date: string;
  body: string;
  published: boolean;
}

/** Проверка тела запроса (общая для создания и изменения). Возвращает данные или текст ошибки. */
export function parseNewsInput(body: unknown): NewsInput | string {
  if (typeof body !== "object" || body === null) return "Неверный формат данных";

  const raw = body as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const text = typeof raw.body === "string" ? raw.body.trim() : "";
  const date = typeof raw.date === "string" ? raw.date : "";

  if (!title) return "Укажите заголовок";
  if (title.length > 300) return "Заголовок слишком длинный (не более 300 символов)";
  if (!text) return "Введите текст новости";
  if (text.length > 20000) return "Текст слишком длинный (не более 20 000 символов)";

  // Дата «ГГГГ-ММ-ДД»; отсекаем несуществующие, например 2026-02-31
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return "Укажите корректную дату";
  }

  return { title, date, body: text, published: raw.published !== false };
}
