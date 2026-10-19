// ПУТЬ В ПРОЕКТЕ: src/app/map/[name]/layout.tsx  (НОВЫЙ файл, рядом с page.tsx и MapClient.tsx)
import type { ReactNode } from "react";

import { hasMapAccess } from "@/app/lib/map-access";
import MapPasswordGate from "./MapPasswordGate";

// Проверка выполняется при каждом открытии карты (зависит от cookie посетителя)
export const dynamic = "force-dynamic";

/**
 * Если у карты задан пароль, а у посетителя нет действующего пропуска, вместо карты
 * показывается форма ввода пароля. У карт без пароля ничего не меняется.
 */
export default async function MapLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const resourceId = Number(name);

  if (Number.isInteger(resourceId) && resourceId > 0) {
    try {
      if (!(await hasMapAccess(resourceId))) {
        return <MapPasswordGate resourceId={resourceId} />;
      }
    } catch (error) {
      // При сбое базы карты открываются как раньше, чтобы не «положить» весь сайт.
      // Для строгого режима (закрывать карту при сбое) замените на return <MapPasswordGate ... />.
      console.error(`Не удалось проверить пароль карты ${resourceId}:`, error);
    }
  }

  return children;
}
