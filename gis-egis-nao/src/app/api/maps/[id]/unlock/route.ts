// ПУТЬ В ПРОЕКТЕ: src/app/api/maps/[id]/unlock/route.ts  (папка именно [id])
// POST /api/maps/<id>/unlock — проверка пароля карты; при верном пароле ставит cookie-пропуск.
import { NextResponse } from "next/server";

import { MAP_ACCESS_TTL_SECONDS, mapAccessCookieName, tryUnlock } from "@/app/lib/map-access";

export const dynamic = "force-dynamic";

// Подбор пароля: 5 неудачных попыток с одного адреса на карту за 15 минут.
// Счётчик хранится в памяти процесса (при нескольких экземплярах он «мягкий»).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const resourceId = Number(id);

  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    return NextResponse.json({ error: "Неверный номер карты" }, { status: 400 });
  }

  const clientId = `${request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"}:${resourceId}`;
  const now = Date.now();
  const record = attempts.get(clientId);

  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Слишком много попыток. Повторите позже." }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const password =
    typeof (body as { password?: unknown })?.password === "string"
      ? (body as { password: string }).password.slice(0, 200)
      : "";

  const result = await tryUnlock(resourceId, password);

  if (result.status === "wrong") {
    attempts.set(clientId, {
      count: record && record.resetAt > now ? record.count + 1 : 1,
      resetAt: record && record.resetAt > now ? record.resetAt : now + WINDOW_MS,
    });

    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  attempts.delete(clientId);

  const response = NextResponse.json({ ok: true });

  if (result.status === "ok") {
    // secure только по https: тестовый сайт на http иначе не получил бы cookie
    const isHttps =
      new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";

    response.cookies.set(mapAccessCookieName(resourceId), result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: MAP_ACCESS_TTL_SECONDS,
    });
  }

  return response;
}
