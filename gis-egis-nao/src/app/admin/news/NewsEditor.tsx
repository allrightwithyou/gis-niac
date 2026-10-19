"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import NewsCard from "@/app/main/components/NewsCard";
import { formatNewsDate, type NewsItem } from "@/app/lib/news-format";

const inputClass =
  "w-full rounded-[8px] border border-black/10 bg-white px-[10px] py-[6px] text-[13px] outline-none focus:border-accent";
const buttonClass =
  "rounded-[8px] border border-black/10 bg-white px-[10px] py-[4px] text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-40";

interface FormState {
  id: number | null; // null — новая новость
  category: string;
  date: string;
  body: string;
  published: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  id: null,
  category: "",
  date: today(),
  body: "",
  published: true,
});

const toForm = (item: NewsItem): FormState => ({
  id: item.id,
  category: item.category,
  date: item.date,
  body: item.body,
  published: item.published,
});

/** Текст без HTML-тегов — для краткого вида в списке. */
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export default function NewsEditor() {
  const router = useRouter();

  const [items, setItems] = useState<NewsItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/news", { cache: "no-store" });

        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }

        // Ответ читаем как текст: если это не список новостей, покажем, что именно пришло
        const text = await response.text();
        let data: unknown = null;

        try {
          data = JSON.parse(text);
        } catch {
          // не JSON — подробности покажем ниже
        }

        if (!response.ok || !Array.isArray(data)) {
          const apiError =
            typeof data === "object" && data !== null && "error" in data
              ? String((data as { error: unknown }).error)
              : null;

          const details =
            apiError ??
            `ответ ${response.status}, ${response.headers.get("content-type") ?? "без типа"}: ${text
              .slice(0, 120)
              .replace(/\s+/g, " ")}`;

          if (!cancelled)
            setMessage({
              text: `Не удалось загрузить новости: ${details}`,
              error: true,
            });
          return;
        }

        if (!cancelled) {
          const list = data as NewsItem[];
          setItems(list);
          if (list[0]) setForm(toForm(list[0]));
        }
      } catch {
        if (!cancelled)
          setMessage({ text: "Нет связи с сервером", error: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function edit(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
    setMessage(null);
  }

  function select(item: NewsItem | null) {
    if (
      dirty &&
      !window.confirm("Есть несохранённые изменения. Перейти без сохранения?")
    )
      return;

    setForm(item ? toForm(item) : emptyForm());
    setDirty(false);
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const isNew = form.id === null;
      const response = await fetch(
        isNew ? "/api/admin/news" : `/api/admin/news/${form.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: form.category,
            date: form.date,
            body: form.body,
            published: form.published,
          }),
        },
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | (NewsItem & { error?: string })
        | null;

      if (!response.ok || !data || data.error) {
        setMessage({
          text: data?.error ?? "Не удалось сохранить",
          error: true,
        });
        return;
      }

      // Список пересобираем в том же порядке, что и на сайте: сначала новые
      setItems((current) =>
        [...current.filter((item) => item.id !== data.id), data].sort(
          (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
        ),
      );
      setForm(toForm(data));
      setDirty(false);
      setMessage({
        text: isNew ? "Новость добавлена" : "Сохранено",
        error: false,
      });
    } catch {
      setMessage({ text: "Нет связи с сервером", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (form.id === null || !window.confirm("Удалить эту новость?")) return;

    const response = await fetch(`/api/admin/news/${form.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage({ text: "Не удалось удалить", error: true });
      return;
    }

    const rest = items.filter((item) => item.id !== form.id);
    setItems(rest);
    setForm(rest[0] ? toForm(rest[0]) : emptyForm());
    setDirty(false);
    setMessage({ text: "Новость удалена", error: false });
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="p-[24px] text-[14px] text-gray-500">Загрузка…</main>
    );
  }

  // Подсказки категорий: уже использованные
  const categories = [...new Set(items.map((item) => item.category))];

  // Предпросмотр рисует настоящий NewsCard (тот же вид, что на сайте); он ждёт дату «дд.мм.гггг»
  const dateValid =
    /^\d{4}-\d{2}-\d{2}$/.test(form.date) &&
    !Number.isNaN(Date.parse(form.date));
  const previewNews = {
    id: form.id ?? items.length + 1,
    category: form.category || "Категория",
    date: formatNewsDate(form.date),
    title: form.body || "Текст новости…",
  } as unknown as React.ComponentProps<typeof NewsCard>["news"];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-[12px] border-b border-gray-200 bg-white px-[24px] py-[12px]">
        <div className="flex items-center gap-[16px]">
          <h1 className="text-[16px] font-semibold">Новости</h1>
          <Link href="/admin" className={buttonClass}>
            ← Разделы
          </Link>
        </div>

        <div className="flex items-center gap-[12px]">
          {message && (
            <span
              className={`text-[13px] ${message.error ? "text-red-600" : "text-green-600"}`}
            >
              {message.text}
            </span>
          )}
          {dirty && !message && (
            <span className="text-[13px] text-gray-500">
              Есть несохранённые изменения
            </span>
          )}

          <button
            onClick={() => void save()}
            disabled={!dirty || saving}
            className="rounded-[8px] bg-accent px-[16px] py-[6px] text-[13px] font-medium text-white disabled:opacity-50"
          >
            {saving
              ? "Сохраняем…"
              : form.id === null
                ? "Добавить"
                : "Сохранить"}
          </button>
          <button onClick={() => void logout()} className={buttonClass}>
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] grid-cols-[320px_1fr] gap-[24px] p-[24px]">
        {/* Список новостей */}
        <aside className="flex flex-col gap-[8px]">
          <button
            onClick={() => select(null)}
            className={`${buttonClass} py-[8px]`}
          >
            + Новая новость
          </button>

          {items.length === 0 && (
            <p className="text-[13px] text-gray-500">Новостей пока нет.</p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => select(item)}
              className={`cursor-pointer rounded-[12px] border-[2px] bg-white p-[10px] ${
                item.id === form.id ? "border-accent/40" : "border-black/10"
              }`}
            >
              <div className="text-[11px] text-gray-500">
                {formatNewsDate(item.date)} · {item.category}
                {!item.published && (
                  <span className="ml-[6px] text-amber-600">скрыта</span>
                )}
              </div>
              <div
                className={`line-clamp-2 text-[13px] ${item.published ? "" : "text-gray-400"}`}
              >
                {plain(item.body)}
              </div>
            </div>
          ))}
        </aside>

        {/* Форма */}
        <section className="flex flex-col gap-[16px] rounded-[12px] border-[2px] border-black/10 bg-white p-[20px]">
          <div className="grid grid-cols-[1fr_180px] gap-[12px]">
            <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
              Категория (плашка в карточке)
              <input
                className={inputClass}
                list="news-categories"
                placeholder="Например: Новое приложение"
                value={form.category}
                onChange={(e) => edit({ category: e.target.value })}
              />
              <datalist id="news-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
              Дата
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => edit({ date: e.target.value })}
              />
            </label>
          </div>

          <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
            Текст новости
            <textarea
              rows={6}
              className={`${inputClass} font-mono`}
              value={form.body}
              onChange={(e) => edit({ body: e.target.value })}
            />
            <span className="text-[11px] text-gray-400">
              Ссылка, как в прежнем файле:{" "}
              {`<a href="https://адрес" target="_self">ссылка</a>`}
            </span>
          </label>

          <label className="flex items-center gap-[8px] text-[13px]">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => edit({ published: e.target.checked })}
            />
            Показывать на сайте
          </label>

          <div>
            <div className="mb-[6px] text-[12px] text-gray-500">
              Предпросмотр (так карточка выглядит на сайте)
            </div>
            {dateValid ? (
              <NewsCard news={previewNews} />
            ) : (
              <p className="text-[12px] text-amber-600">
                Укажите корректную дату, чтобы увидеть предпросмотр.
              </p>
            )}
          </div>

          {form.id !== null && (
            <div>
              <button
                onClick={() => void remove()}
                className="text-[12px] text-red-600 hover:underline"
              >
                Удалить новость
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
