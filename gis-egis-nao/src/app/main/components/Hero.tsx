"use client";

import Cards from "./Cards";
import Image from "next/image";
import { useState } from "react";
import { sectionData } from "@/app/main/data";
import type { WebMap } from "./Card";

type HeroProps = {
  webMaps: WebMap[];
};

export default function Hero({ webMaps }: HeroProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [search, setText] = useState("");
  

  const section = 12;
  const dataUpdate = "29.09.2026";
  const objectMap = "4500+";
  const layersMap = "200+";

  

  const filteredSections = sectionData.filter((section) => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return true;
    }

    return (
      section.name.toLowerCase().includes(query) ||
      section.shortName.toLowerCase().includes(query)
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
            alt="Логотип НИАЦ"
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
        <div className="shadow-md flex gap-[5px] flex-row w-full max-w-[448px] py-[14px] pl-[44px] pr-[16px] border border-black/[12%] rounded-[12px] text-footer">
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
            placeholder="Поиск по разделам..."
            className="text-[14px] w-full focus:border-none outline-none focus:outline-none"
            aria-label="Поиск по разделам"
          />
        </div>

        {/* Статистика */}
        <div className="flex gap-[32px] pt-[32px] border-t mt-[32px] text-sm sm:text-base border-margin">
          <div className="text-hero flex flex-col items-start">
            <span className="text-title text-[24px]">{section}</span>

            <span className="text-footer text-[12px]">Разделов</span>
          </div>

          <div className="text-hero flex flex-col items-start">
            <span className="text-title text-[24px]">{objectMap}</span>

            <span className="text-footer text-[12px]">Объектов</span>
          </div>

          <div className="text-hero flex flex-col items-start">
            <span className="text-title text-[24px]">{layersMap}</span>

            <span className="text-footer text-[12px]">Слоёв данных</span>
          </div>

          <div className="pb-[64px] text-hero flex flex-col items-start">
            <span className="text-title text-[24px]">{dataUpdate}</span>

            <span className="text-footer text-[12px]">Обновлено</span>
          </div>
        </div>

        {/* Карточки */}
        <div className="pt-[64px]">
          <Cards cards={filteredSections} webMaps={webMaps} />
        </div>
      </div>
    </div>
  );
}
