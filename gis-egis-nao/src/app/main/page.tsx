// ПУТЬ В ПРОЕКТЕ: src/app/main/page.tsx (заменяет прежний файл)
import Hero from "@/app/main/components/Hero";
import { getWebMaps } from "@/app/lib/ngw";
import { sectionData } from "@/app/main/data";
import { getSections, type SectionData } from "@/app/lib/sections";
import type { WebMap } from "@/app/main/components/Card";

// Страница читает данные при каждом запросе, а не один раз при сборке образа
export const dynamic = "force-dynamic";

export default async function MainPage() {
  let webMaps: WebMap[] = [];
  let sections: SectionData[] = [];

  try {
    webMaps = await getWebMaps();
  } catch (error) {
    console.error("getWebMaps failed:", error);
  }

  try {
    // Разделы из базы (их редактирует администратор в /admin)
    sections = await getSections();
  } catch (error) {
    // Запасной вариант, чтобы главная не оставалась пустой при сбое базы.
    // Правки из админки при этом не видны — смотрите сообщение в логах.
    console.error("getSections failed, используются данные из data.ts:", error);
    sections = sectionData;
  }

  return (
    <div className="">
      <div className="py-[80px]">
        <Hero webMaps={webMaps} sections={sections} />
      </div>
    </div>
  );
}
