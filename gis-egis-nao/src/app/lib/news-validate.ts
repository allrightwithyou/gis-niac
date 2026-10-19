// Проверка данных новости при создании и изменении (общая для обоих API-маршрутов).

export interface NewsInput {
  category: string;
  date: string;
  body: string;
  published: boolean;
}

/** Проверка тела запроса (общая для создания и изменения). Возвращает данные или текст ошибки. */
export function parseNewsInput(body: unknown): NewsInput | string {
  if (typeof body !== "object" || body === null) return "Неверный формат данных";

  const raw = body as Record<string, unknown>;
  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  const text = typeof raw.body === "string" ? raw.body.trim() : "";
  const date = typeof raw.date === "string" ? raw.date : "";

  if (!category) return "Укажите категорию";
  if (category.length > 100) return "Категория слишком длинная (не более 100 символов)";
  if (!text) return "Введите текст новости";
  if (text.length > 5000) return "Текст слишком длинный (не более 5000 символов)";

  // Дата «ГГГГ-ММ-ДД»; отсекаем несуществующие, например 2026-02-31
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return "Укажите корректную дату";
  }

  return { category, date, body: text, published: raw.published !== false };
}