import { Pool } from "pg";
/**
 * 
Единый пул подключений к PostgreSQL.
 * 
Строка подключения — DATABASE_URL, например:
 *   postgres://user:password@localhost:5432/gis_portal
 * 
Для облачных баз добавьте ?sslmode=require.
 *
 * 
 * 
В dev-режиме Next.js перезагружает модули, поэтому пул кладём в globalThis,
иначе при каждой правке кода открывалась бы новая пачка соединений.
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