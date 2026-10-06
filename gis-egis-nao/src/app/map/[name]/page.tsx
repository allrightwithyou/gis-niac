import { sectionData } from "@/app/main/data";
import MapClient from "./MapClient";

interface MapPageProps {
  params: Promise<{ name: string }>;
}

export default async function MapPage({ params }: MapPageProps) {
  const { name } = await params;

  // Проверяем, что name — это корректный ID
  const resourceId = +name; // Преобразуем в число

  if (isNaN(resourceId)) {
    return <div className="p-4 text-red-500">Некорректный ID</div>;
  }

  // Ищем секцию, где resourceIds содержит этот ID
  const section = sectionData.find((item) =>
    item.resourceIds.includes(resourceId),
  );

  if (!section) {
    console.error("Не найден раздел с ID:", resourceId);
    return <div className="p-4 text-red-500">Раздел не найден</div>;
  }

  return <MapClient section={section} resourceId={resourceId} />;
}
