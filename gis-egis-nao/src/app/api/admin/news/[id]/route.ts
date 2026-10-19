// PUT /api/admin/news/<id> — изменить; DELETE /api/admin/news/<id> — удалить (только админ)
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isAdmin } from "@/app/lib/admin-session";
import { pool } from "@/app/lib/db";
import { getNewsById } from "@/app/lib/news-db";
import { parseNewsInput } from "@/app/lib/news-validate";

export const dynamic = "force-dynamic";

async function readId(context: { params: Promise<{ id: string }> }): Promise<number | null> {
  const { id } = await context.params;
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "Неверный номер новости" }, { status: 400 });

  const parsed = parseNewsInput(await request.json().catch(() => null));

  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `update news set category = $2, published_at = $3, body = $4, published = $5 where id = $1`,
      [id, parsed.category, parsed.date, parsed.body, parsed.published],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Новость не найдена" }, { status: 404 });
    }

    revalidatePath("/main/news");

    return NextResponse.json(await getNewsById(id));
  } catch (error) {
    console.error("Не удалось изменить новость:", error);
    return NextResponse.json( { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "Неверный номер новости" }, { status: 400 });

  try {
    await pool.query("delete from news where id = $1", [id]);
    revalidatePath("/main/news");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Не удалось удалить новость:", error);
    return NextResponse.json( { status: 500 });
  }
}