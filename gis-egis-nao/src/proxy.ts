// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Проксирует /ngw-proxy/* на NGW, сохраняя путь как есть (включая «/» в конце)
export function middleware(request: NextRequest) {
  const target = process.env.NGW_BASE_URL?.replace(/\/$/, "");

  if (!target) {
    return new NextResponse("NGW_BASE_URL не задан", { status: 500 });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/ngw-proxy/, "");

  return NextResponse.rewrite(new URL(target + path + url.search));
}

export const config = {
  matcher: ["/ngw-proxy/:path*"],
};