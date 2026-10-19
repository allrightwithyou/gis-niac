"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      if (response.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Не удалось войти");
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
        <h1 className="text-[18px] font-semibold text-gray-900">Вход для администратора</h1>

        <input
          autoFocus
          autoComplete="username"
          placeholder="Логин"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          className="rounded-[8px] border border-black/10 px-[12px] py-[8px] text-[14px] text-hero outline-none focus:border-accent"
        />

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-[8px] border border-black/10 px-[12px] py-[8px] text-[14px] text-hero outline-none focus:border-accent"
        />

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !login || !password}
          className="rounded-[8px] bg-accent px-[12px] py-[8px] text-[14px] font-medium text-white disabled:opacity-50"
        >
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
