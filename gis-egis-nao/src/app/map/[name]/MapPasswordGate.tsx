"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Форма ввода пароля вместо карты. После верного пароля страница перезагружается и открывает карту. */
export default function MapPasswordGate({ resourceId }: { resourceId: number }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/maps/${resourceId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.refresh(); // сервер заново проверит доступ уже с пропуском и покажет карту
        return;
      }

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Не удалось проверить пароль");
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-[16px]">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[360px] flex-col gap-[12px] rounded-[12px] border-[2px] border-black/10 bg-white p-[24px] shadow"
      >
        <h1 className="text-[18px] font-semibold text-gray-900">Карта защищена паролем</h1>
        <p className="text-[13px] text-gray-500">Введите пароль, чтобы открыть карту.</p>

        <input
          autoFocus
          type="password"
          autoComplete="off"
          placeholder="Пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-[8px] border border-black/10 px-[12px] py-[8px] text-[14px] outline-none focus:border-accent"
        />

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="rounded-[8px] bg-accent px-[12px] py-[8px] text-[14px] font-medium text-white disabled:opacity-50"
        >
          {loading ? "Проверяем…" : "Открыть"}
        </button>

        <Link href="/main" className="text-center text-[13px] text-gray-500 hover:text-accent">
          ← На главную
        </Link>
      </form>
    </main>
  );
}
