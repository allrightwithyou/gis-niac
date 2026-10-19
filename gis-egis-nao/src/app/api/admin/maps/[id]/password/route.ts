// ПУТЬ В ПРОЕКТЕ: src/app/api/admin/maps/[id]/password/route.ts  (папка именно [id])
// PUT    /api/admin/maps/<id>/password — задать или сменить пароль карты (только админ)
// DELETE /api/admin/maps/<id>/password — снять пароль (только админ)
import { NextResponse } from "next/server";

import { isAdmin } from "@/app/lib/admin-session";
import { describeDbError } from "@/app/lib/db";
import { clearMapPassword, setMapPassword } from "@/app/lib/map-access";

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

  const resourceId = await readId(context);
  if (resourceId === null) return NextResponse.json({ error: "Неверный номер карты" }, { status: 400 });

  const body: unknown = await request.json().catch(() => null);
  const password = typeof (body as { password?: unknown })?.password === "string" ? (body as { password: string }).password : "";

  if (password.length < 4) return NextResponse.json({ error: "Пароль должен быть не короче 4 символов" }, { status: 400 });
  if (password.length > 100) return NextResponse.json({ error: "Пароль слишком длинный (не более 100 символов)" }, { status: 400 });

  try {
    await setMapPassword(resourceId, password);
    return NextResponse.json({ ok: true, protected: true });
  } catch (error) {
    console.error("Не удалось задать пароль карты:", error);
    return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const resourceId = await readId(context);
  if (resourceId === null) return NextResponse.json({ error: "Неверный номер карты" }, { status: 400 });

  try {
    await clearMapPassword(resourceId);
    return NextResponse.json({ ok: true, protected: false });
  } catch (error) {
    console.error("Не удалось снять пароль карты:", error);
    return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  }
}
