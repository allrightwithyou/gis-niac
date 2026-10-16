import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/app/lib/auth";
import { checkCredentials } from "@/app/lib/credentials";
export const dynamic = "force-dynamic";
// Ограничение подбора пароля: 5 неудачных попыток с одного адреса за 15 минут.
// Счётчик хранится в памяти процесса: при нескольких экземплярах/serverless он «мягкий».
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();
function getClientId(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
export async function POST(request: Request) {
  const clientId = getClientId(request);
  const now = Date.now();
  const record = attempts.get(clientId);
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Слишком много попыток. Повторите позже." },
      { status: 429 },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const login = typeof (body as { login?: unknown })?.login === "string" ? (body as { login: string }).login : "";
  const password =
    typeof (body as { password?: unknown })?.password === "string" ? (body as { password: string }).password : "";
  if (!checkCredentials(login, password)) {
    attempts.set(clientId, {
      count: record && record.resetAt > now ? record.count + 1 : 1,
      resetAt: record && record.resetAt > now ? record.resetAt : now + WINDOW_MS,
    });
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  attempts.delete(clientId);
  const response = NextResponse.json({ ok: true });
  // secure только по https: тестовый сайт на http иначе не получил бы cookie
  const isHttps =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: isHttps,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}