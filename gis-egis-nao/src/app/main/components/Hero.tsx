"use client";

import Cards from "./Cards";
import Image from "next/image";
import { useState } from "react";
import type { SectionData } from "@/app/lib/sections";
import type { WebMap } from "./Card";

type HeroProps = {
  webMaps: WebMap[];
  /** Разделы из базы данных (редактируются в /admin) */
  sections: SectionData[];
};

export default function Hero({ webMaps, sections }: HeroProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [search, setText] = useState("");

  const section = sections.length;
  const dataUpdate = "29.09.2026";
  const objectMap = "4500+";
  const layersMap = "200+";

  const query = search.toLowerCase().trim();

  // Раздел подходит, если запрос есть в его названии или в названии любой его карты
  const filteredSections = sections.filter((section) => {
    if (!query) {
      return true;
    }

    const hasMatchingMap = webMaps.some(
      (map) =>
        section.resourceIds.includes(map.id) &&
        map.name.toLowerCase().includes(query),
    );

    return (
      section.name.toLowerCase().includes(query) ||
      section.shortName.toLowerCase().includes(query) ||
      hasMatchingMap
    );
  });

  return (
    <div className="px-[24px]">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Регион */}
        <div className="shadow-md flex gap-[6px] uppercase text-accent text-[12px] rounded-md py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
          <Image
            className="block"
            src="/compas.svg"
            alt="компас"
            width={12}
            height={12}
          />
          Ненецкий автономный округ
        </div>

        {/* Заголовок */}
        <div className="pt-[24px] text-3xl sm:text-4xl md:text-5xl">
          <h1 className="text-title">Единая геоинформационная</h1>

          <h1 className="text-accent">система НАО</h1>
        </div>

        {/* Описание */}
        <div className="max-w-[512px] pt-[16px] pb-[40px] text-balance text-hero text-sm sm:text-base">
          <span>
            Централизованная платформа пространственных данных Ненецкого
            автономного округа. Мониторинг, анализ и управление геоданными в
            режиме реального времени.
          </span>
        </div>

        {/* Поиск */}
        <div className="shadow-md bg-white flex gap-[5px] flex-row w-full max-w-[448px] py-[14px] pl-[44px] pr-[16px] border border-black/[12%] rounded-[12px] text-footer">
          <Image
            src="/search.svg"
            alt="Поиск"
            width={16}
            height={16}
            className={`block transition-opacity duration-200 ${
              isFocused ? "opacity-0" : ""
            }`}
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Поиск по разделам и картам..."
            className="text-[14px] w-full focus:border-none outline-none focus:outline-none input-focus"
            aria-label="Поиск по разделам и картам"
          />
        </div>

        {/* Статистика */}
        <div className="flex gap-[32px] pt-[32px] border-t mt-[32px] text-sm sm:text-base border-margin">
          <div className="text-hero flex flex-col items-start">
            <span className="text-title text-[18px] sm:text-[24px]">
              {section}
            </span>

            <span className="text-footer text-[10px] sm:text-[12px]">
              Разделов
            </span>
          </div>

          <div className="text-hero flex flex-col items-start">
            <span className="text-title text-[18px] sm:text-[24px] ">
              {objectMap}
            </span>

            <span className="text-footer text-[10px] sm:text-[12px]">
              Объектов
            </span>
          </div>

          <div className="text-hero flex flex-col items-start">
            <span className="text-title text-[18px] sm:text-[24px]">
              {layersMap}
            </span>

            <span className="text-footer text-[10px] sm:text-[12px]">
              Слоёв данных
            </span>
          </div>

          <div className="pb-[64px] text-hero flex flex-col items-start">
            <span className="text-title text-[18px] sm:text-[24px]">
              {dataUpdate}
            </span>

            <span className="text-footer text-[10px] sm:text-[12px]">
              Обновлено
            </span>
          </div>
        </div>

        {/* Карточки */}
        <div>
          <Cards cards={filteredSections} webMaps={webMaps} query={query} />
        </div>
      </div>
    </div>
  );
}
