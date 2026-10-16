import { pool } from "./db";
import { isToolId, type ToolId } from "./tools";
/** Раздел главной страницы — та же структура, что была в data.ts. */
export interface SectionData {
  id: number;
  name: string;
  shortName: string;
  category: string;
  statistic: string;
  img: string;
  shadowColor: string;
  resourceIds: number[];
}
interface SectionRow {
  id: number;
  name: string;
  short_name: string;
  category: string;
  statistic: string;
  img: string;
  shadow_color: string;
  resource_ids: number[];
}
/**
 * 
Видимые разделы в заданном порядке — замена импорта `sectionData` из data.ts.
 * 
Вызывать из серверных компонентов (на страницах поставьте
 * `export const dynamic = "force-dynamic"`, чтобы данные не «замораживались» при сборке).
 */
export async function getSections(): Promise<SectionData[]> {
  const { rows } = await pool.query<SectionRow>(`
    select s.id, s.name, s.short_name, s.category, s.statistic, s.img, s.shadow_color,
           coalesce(
             array_agg(m.resource_id order by m.position) filter (where m.resource_id is not null),
             '{}'
           ) as resource_ids
    from sections s
    left join section_maps m on m.section_id = s.id
    where s.visible
    group by s.id
    order by s.position, s.id
  `);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    category: row.category,
    statistic: row.statistic,
    img: row.img,
    shadowColor: row.shadow_color,
    resourceIds: row.resource_ids,
  }));
}
/** Инструменты, включённые на карте с данным ID (веб-карта NGW). */
export async function getMapTools(resourceId: number): Promise<ToolId[]> {
  const { rows } = await pool.query<{ tool_id: string }>(
    "select tool_id from map_tools where resource_id = $1 order by tool_id",
    [resourceId],
  );
  return rows.map((row) => row.tool_id).filter(isToolId);
}