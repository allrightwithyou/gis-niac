// GET /api/admin/maps — общий список веб-карт NGW (только админ)
import { NextResponse } from "next/server";
import { getWebMaps } from "@/app/lib/ngw";
import { isAdmin } from "@/app/lib/admin-session";
export const dynamic = "force-dynamic";
/**
 * 
Общий список веб-карт NGW (id + название) — для выбора карт в разделах.
 * 
Использует ту же функцию getWebMaps, что и главная страница: с теми же адресом NGW
 * (NGW_BASE_URL) и логином/паролем (NGW_LOGIN, NGW_PASSWORD).
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  try {
    const maps = await getWebMaps();
    return NextResponse.json(
      maps
        .map((map) => ({ id: map.id, name: map.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "ru")),
    );
  } catch (error) {
    console.error("Не удалось получить список карт NGW:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось получить список карт NGW",
      },
      { status: 502 },
    );
  }
}
