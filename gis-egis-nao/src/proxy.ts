import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./app/lib/auth";
// Файл называется proxy.ts, а функция proxy — если у вас Next.js 16 (старое имя пока работает
/**
 * 1) /ngw-proxy/*  — прокси на NGW с сохранением «/» в конце пути (как раньше).
 * 2) /admin/* и /api/admin/* — доступ только с действующей сессией администратора
 *    (кроме страницы и API входа).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/ngw-proxy")) {
    const target = process.env.NGW_BASE_URL?.replace(/\/$/, "");
    if (!target) {
      return new NextResponse("NGW_BASE_URL не задан", { status: 500 });
    }
    return NextResponse.rewrite(
      new URL(target + pathname.replace(/^\/ngw-proxy/, "") + search),
    );
  }
  const isLogin =
    pathname === "/admin/login" || pathname === "/api/admin/login";
  if (!isLogin) {
    const authorized = await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    if (!authorized) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/ngw-proxy/:path*", "/admin/:path*", "/api/admin/:path*"],
};
