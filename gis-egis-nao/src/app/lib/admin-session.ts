import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionToken } from "./auth";

/**
 * Проверка администратора в серверных компонентах и route handlers.
 * Middleware тоже защищает /admin и /api/admin, но каждый обработчик перепроверяет сам —
 * чтобы сработавшая «дыра» в одном месте не открыла изменение данных.
 */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
