import { Pool } from "pg";

/**
 * Единый пул подключений к PostgreSQL.
 * Строка подключения — DATABASE_URL, например:
 *   postgres://user:password@localhost:5432/gis_portal
 * Для облачных баз добавьте ?sslmode=require.
 *
 * В dev-режиме Next.js перезагружает модули, поэтому пул кладём в globalThis,
 * иначе при каждой правке кода открывалась бы новая пачка соединений.
 */
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

/** Переводит типичные ошибки PostgreSQL в понятную подсказку для администратора. */
export function describeDbError(error: unknown): string {
  if (!process.env.DATABASE_URL) {
    return "Не задан DATABASE_URL в .env (после правки пересоздайте контейнер: podman-compose up -d)";
  }

  // Ошибка подключения может прийти как AggregateError (IPv4 + IPv6)
  const candidates = [error, ...(((error as { errors?: unknown[] })?.errors) ?? [])];

  for (const candidate of candidates) {
    const code = (candidate as { code?: string } | null)?.code;

    switch (code) {
      case "42P01":
        return "Таблицы не созданы — выполните db/schema.sql и db/news.sql (см. инструкцию)";
      case "ECONNREFUSED":
        return "PostgreSQL не отвечает: проверьте, что сервер запущен и верны хост и порт в DATABASE_URL";
      case "28P01":
      case "28000":
        return "PostgreSQL отклонил логин или пароль из DATABASE_URL";
      case "3D000":
        return "Базы данных из DATABASE_URL нет — создайте её (CREATE DATABASE …)";
      case "ENOTFOUND":
        return "Не найден хост базы данных из DATABASE_URL";
    }
  }

  return error instanceof Error ? error.message : "Неизвестная ошибка базы данных";
}