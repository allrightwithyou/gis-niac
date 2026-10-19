// GET/PUT /api/admin/sections — разделы, карты и инструменты (только админ)

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isAdmin } from "@/app/lib/admin-session";
import { pool } from "@/app/lib/db";
import { listProtectedMaps } from "@/app/lib/map-access";
import { TOOL_IDS, isToolId, type ToolId } from "@/app/lib/tools";

export const dynamic = "force-dynamic";

interface SectionInput {
  id?: number;
  name: string;
  shortName: string;
  category: string;
  statistic: string;
  img: string;
  shadowColor: string;
  visible: boolean;
  maps: number[];
}

interface Payload {
  sections: SectionInput[];
  tools: Array<[number, ToolId]>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** Проверка тела запроса вручную (без внешних библиотек). Возвращает данные или текст ошибки. */
function parsePayload(body: unknown): Payload | string {
  if (!isRecord(body) || !Array.isArray(body.sections) || !isRecord(body.tools)) {
    return "Неверный формат данных";
  }

  const sections: SectionInput[] = [];

  for (const raw of body.sections) {
    if (!isRecord(raw)) return "Неверный формат раздела";

    const text = (value: unknown, max: number) =>
      typeof value === "string" && value.length <= max ? value.trim() : null;

    const name = text(raw.name, 200);
    const shortName = text(raw.shortName, 100);
    const category = text(raw.category, 200);
    const statistic = text(raw.statistic, 200);
    const img = text(raw.img, 300);
    const shadowColor = text(raw.shadowColor, 9);

    if (!name || !shortName || !category) {
      return "У раздела должны быть название, краткое название и категория";
    }

    if (statistic === null || img === null || shadowColor === null) {
      return "Неверные поля раздела";
    }

    if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(shadowColor)) {
      return `Неверный цвет тени: ${shadowColor}`;
    }

    if (!Array.isArray(raw.maps) || !raw.maps.every(isPositiveInt)) {
      return `Неверный список карт у раздела «${name}»`;
    }

    sections.push({
      id: isPositiveInt(raw.id) ? raw.id : undefined,
      name,
      shortName,
      category,
      statistic,
      img,
      shadowColor,
      visible: raw.visible !== false,
      maps: [...new Set(raw.maps)],
    });
  }

  const tools: Array<[number, ToolId]> = [];

  for (const [key, value] of Object.entries(body.tools)) {
    const resourceId = Number(key);

    if (!isPositiveInt(resourceId) || !Array.isArray(value)) {
      return `Неверные инструменты у карты «${key}»: ${JSON.stringify(value)}`;
    }

    // Неизвестные названия не отклоняют всё сохранение: пропускаем их и пишем в журнал
    const known = value.filter(isToolId);
    const unknown = value.filter((tool) => !isToolId(tool));

    if (unknown.length > 0) {
      console.warn(
        `Карта ${key}: пропущены неизвестные инструменты ${JSON.stringify(unknown)}. Допустимые: ${TOOL_IDS.join(", ")}`,
      );
    }

    for (const tool of new Set(known)) tools.push([resourceId, tool]);
  }

  return { sections, tools };
}

interface SectionRow {
  id: number;
  name: string;
  short_name: string;
  category: string;
  statistic: string;
  img: string;
  shadow_color: string;
  visible: boolean;
}

/** Все разделы (и скрытые) + карты и инструменты — для редактора. */
async function loadAdminData() {
  const [sections, maps, tools, protectedMaps] = await Promise.all([
    pool.query<SectionRow>(
      `select id, name, short_name, category, statistic, img, shadow_color, visible
       from sections order by position, id`,
    ),
    pool.query<{ section_id: number; resource_id: number }>(
      "select section_id, resource_id from section_maps order by section_id, position",
    ),
    pool.query<{ resource_id: number; tool_id: string }>(
      "select resource_id, tool_id from map_tools order by resource_id, tool_id",
    ),
    // Если таблицу паролей ещё не создали, админка продолжает работать, просто без паролей
    listProtectedMaps().catch(() => [] as number[]),
  ]);

  const toolsByMap: Record<number, string[]> = {};
  for (const row of tools.rows) {
    (toolsByMap[row.resource_id] ??= []).push(row.tool_id);
  }

  return {
    sections: sections.rows.map((row) => ({
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      category: row.category,
      statistic: row.statistic,
      img: row.img,
      shadowColor: row.shadow_color,
      visible: row.visible,
      maps: maps.rows.filter((m) => m.section_id === row.id).map((m) => m.resource_id),
    })),
    tools: toolsByMap,
    protectedMaps,
  };
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  try {
    return NextResponse.json(await loadAdminData());
  } catch (error) {
    console.error("Не удалось прочитать данные админки:", error);
    return NextResponse.json( { status: 500 });
  }
}

/** Сохраняет всё состояние редактора одной транзакцией: порядок разделов, карты и инструменты. */
export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const parsed = parsePayload(await request.json().catch(() => null));

  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("begin");

    const keepIds: number[] = [];

    for (const [index, section] of parsed.sections.entries()) {
      const values = [
        section.name,
        section.shortName,
        section.category,
        section.statistic,
        section.img,
        section.shadowColor,
        index,
        section.visible,
      ];

      let id: number | undefined;

      if (section.id) {
        const updated = await client.query<{ id: number }>(
          `update sections set name = $2, short_name = $3, category = $4, statistic = $5,
                  img = $6, shadow_color = $7, position = $8, visible = $9
           where id = $1 returning id`,
          [section.id, ...values],
        );
        id = updated.rows[0]?.id;
      }

      if (id === undefined) {
        const inserted = await client.query<{ id: number }>(
          `insert into sections (name, short_name, category, statistic, img, shadow_color, position, visible)
           values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
          values,
        );
        id = inserted.rows[0].id;
      }

      keepIds.push(id);

      await client.query("delete from section_maps where section_id = $1", [id]);

      for (const [position, resourceId] of section.maps.entries()) {
        await client.query(
          "insert into section_maps (section_id, resource_id, position) values ($1, $2, $3)",
          [id, resourceId, position],
        );
      }
    }

    // Разделы, которых нет в присланном списке, удалены в редакторе
    await client.query("delete from sections where not (id = any($1::int[]))", [keepIds]);

    await client.query("delete from map_tools");

    for (const [resourceId, tool] of parsed.tools) {
      await client.query("insert into map_tools (resource_id, tool_id) values ($1, $2)", [
        resourceId,
        tool,
      ]);
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    console.error("Не удалось сохранить разделы:", error);
    return NextResponse.json( { status: 500 });
  } finally {
    client.release();
  }

  // Главная страница и страницы карт должны сразу показать новые данные
  revalidatePath("/", "layout");

  return NextResponse.json(await loadAdminData());
}
