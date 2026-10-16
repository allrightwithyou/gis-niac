// ПУТЬ В ПРОЕКТЕ: src/app/api/admin/news/route.ts
// GET /api/admin/news — все новости; POST /api/admin/news — создать (только админ)
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isAdmin } from "@/app/lib/admin-session";
import { describeDbError, pool } from "@/app/lib/db";
import { getAllNews, getNewsById } from "@/app/lib/news-db";
import { parseNewsInput } from "@/app/lib/news-validate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getAllNews());
  } catch (error) {
    console.error("Не удалось прочитать новости:", error);
    return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const parsed = parseNewsInput(await request.json().catch(() => null));

  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  try {
    const { rows } = await pool.query<{ id: number }>(
      `insert into news (title, published_at, body, published)
       values ($1, $2, $3, $4) returning id`,
      [parsed.title, parsed.date, parsed.body, parsed.published],
    );

    revalidatePath("/main/news");

    return NextResponse.json(await getNewsById(rows[0].id), { status: 201 });
  } catch (error) {
    console.error("Не удалось создать новость:", error);
    return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  }
}
