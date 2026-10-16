import { NextResponse } from "next/server";
import { getMapTools } from "@/app/lib/sections";
export const dynamic = "force-dynamic";
/**
 * 
Инструменты, включённые на карте. Публичный (читает MapClient в браузере посетителя):
 * 
отдаёт только список идентификаторов инструментов, ничего секретного.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const resourceId = Number(id);
  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    return NextResponse.json({ tools: [] }, { status: 400 });
  }
  try {
    return NextResponse.json({ tools: await getMapTools(resourceId) });
  } catch (error) {
    console.error("Не удалось получить инструменты карты:", error);
    // 
//При сбое базы карта должна открыться — просто без инструментов
    return NextResponse.json({ tools: [] });
  }
}