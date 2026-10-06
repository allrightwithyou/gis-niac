// app/map/[name]/page.tsx (Это СЕРВЕРНЫЙ компонент, НЕ пишем "use client")
import { sectionData } from "@/app/main/data";
import MapClient from "./MapClient"; // Импортируем клиентскую часть

interface MapPageProps {
  params: Promise<{ name: string }>;
}

export default async function MapPage({ params }: MapPageProps) {
  const { name } = await params;
  const currentPath = `/map/${name}`;
  
  // Логика поиска данных выполняется на СЕРВЕРЕ
  const section = sectionData.find((item) => item.link === currentPath);

  if (!section) {
    return <div className="p-4 text-red-500">Раздел не найден</div>;
  }

  // Передаем данные в клиентский компонент
  return <MapClient section={section} />;
}
