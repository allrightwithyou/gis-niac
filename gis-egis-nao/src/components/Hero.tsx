"use client";
import Cards from "./Cards";
import Image from "next/image";
import { useState } from "react";
import { sectionData } from "@/app/main/data";
export default function Hero() {
  const [isFocused, setIsFocused] = useState(false);
  const [search, setText] = useState("");
  const section = 12;
  const dataUpdate = "29.09.2026";
  const objectMap = "4500+";
  const layersMap = "200+";
  const filteredSections = sectionData.filter((section) => {
    const query = search.toLowerCase().trim();
    if (!query) return true; // Если пусто - показываем всё
    return (
      section.name.toLowerCase().includes(query) ||
      section.shortName.toLowerCase().includes(query)
    );
  });
  return (
    <div className="px-[24px]">
      <div className=" w-full max-w-[1400px] mx-auto">
        <div className="flex gap-[6px] uppercase text-accent text-[12px]  rounded-md py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
          <Image
            className="block"
            src="/compas.svg"
            alt="Логотип НИАЦ"
            width={12}
            height={12}
          />
          Ненецкий автономный округ
        </div>
        <div className="pt-[24px] text-[48px]/[60px]">
          <h1 className="text-title">Единая геоинформационная</h1>
          <h1 className="text-accent">система НАО</h1>
        </div>
        <div className="max-w-[512px] pt-[16px] pb-[40px] text-balance text-hero text-[16px]/[26px]">
          <span>
            Централизованная платформа пространственных данных Ненецкого
            автономного округа. Мониторинг, анализ и управление геоданными в
            режиме реального времени.
          </span>
        </div>
        <div className=" flex gap-[5px] flex-row w-full max-w-[448px] py-[14px] pl-[44px] pr-[16px] border border-black/[12%] rounded-[12px] text-footer ">
          <Image
            src="/search.svg"
            alt="Поиск"
            width={16}
            height={16}
            className={`block transition-opacity duration-200 ${isFocused ? "opacity-0" : ""}`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=" Поиск по разделам..."
            className="text-[14px] w-full focus:border-none outline-none focus:outline-none"
            aria-label="Поиск по разделам"
          ></input>
        </div>
        <div className="flex gap-[32px] pt-[32px] border-t mt-[32px]">
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
          <div className="pb-[64px]text-hero flex flex-col items-start">
            <span className="text-title text-[24px]">{dataUpdate}</span>
            <span className="text-footer text-[12px]">Обновлено</span>
          </div>
        </div>
        <div className="pt-[64px]">
          <Cards cards={filteredSections} />
        </div>
      </div>
    </div>
  );
}
