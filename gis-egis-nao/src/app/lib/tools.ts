/**
 * 
 * 
Список инструментов карты. Используется и страницей администратора,
и API (для проверки данных). Идентификаторы совпадают с ToolId в MapClient.tsx.
 */
export const TOOL_IDS = [
  "measureTool",
  "fishTool",
  "settlTool",
  "zsoTool",
  "ccfTool",
  "ecomonTool",
  "coordTool",
  "coordFromMapTool",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];
export const TOOL_TITLES: Record<ToolId, string> = {
  measureTool: "Измерения",
  fishTool: "Рыболовные участки",
  settlTool: "Населённые пункты",
  zsoTool: "Зоны санитарной охраны",
  ccfTool: "Капитальное строительство",
  ecomonTool: "Экомониторинг",
  coordTool: "Объекты по координатам",
  coordFromMapTool: "Координаты по клику",
};
export function isToolId(value: unknown): value is ToolId {
  return (
    typeof value === "string" && (TOOL_IDS as readonly string[]).includes(value)
  );
}
