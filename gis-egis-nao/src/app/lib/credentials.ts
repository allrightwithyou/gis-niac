import { createHash, timingSafeEqual } from "node:crypto";
/**
 * 
Проверка логина и пароля администратора из .env (ADMIN_LOGIN, ADMIN_PASSWORD).
 * 
 * 
 * 
Сравнение за постоянное время: оба значения сначала приводятся к SHA-256,
чтобы длины совпадали и по времени ответа нельзя было подобрать пароль.
Только для Node-окружения (route handlers), не для middleware.
 */
const digest = (value: string) => createHash("sha256").update(value).digest();
export function checkCredentials(login: string, password: string): boolean {
  const expectedLogin = process.env.ADMIN_LOGIN ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedLogin || !expectedPassword) return false;
  const loginOk = timingSafeEqual(digest(login), digest(expectedLogin));
  const passwordOk = timingSafeEqual(
    digest(password),
    digest(expectedPassword),
  );
  return loginOk && passwordOk;
}
