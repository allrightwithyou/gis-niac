"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SectionData } from "../data";
export interface WebMap {
  id: number;
  name: string;
  keyname?: string;
  description?: string;
}

export interface CardProps {
  section: SectionData;
  webMaps: WebMap[];
}

export default function Card({ section, webMaps }: CardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    name,
    shortName,
    category,
    statistic,
    img,
    shadowColor,
    resourceIds,
  } = section;
  // Оставляем только те карты,
  // ID которых указаны у данной карточки
  const availableMaps = webMaps.filter((map) => resourceIds.includes(map.id));

  // Открытое состояние
  if (isOpen) {
    return (
      <div className="h-full bg-white p-[20px] min-h-[240px] h-full flex flex-col max-w-[220px] min-w-[170px] border-[1.5px] border-margin rounded-[12px] shadow-xl">
        {/* Заголовок */}
        <div className="flex items-start justify-between mb-[16px]">
          <div className="flex flex-col gap-[4px]">
            <div className="uppercase text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
              {shortName}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[20px] leading-none text-footer hover:text-accent cursor-pointer"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Список карт */}
        <div className="flex flex-col overflow-y-auto">
          {availableMaps.length === 0 ? (
            <span className="text-[12px] text-footer">Доступных карт нет</span>
          ) : (
            availableMaps.map((map) => (
              <Link
                href={`/map/${map.id}`}
                key={map.id}
                className="w-full text-left text-[14px] pb-[3px] text-card hover:text-accent transition cursor-pointer border-black/10 border-b-[1px]"
              >
                {map.name}
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  // Обычное состояние
  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="cursor-pointer h-full shadow-xl group bg-white p-[20px] gap-[16px] flex flex-col items-start max-w-[220px] border-[1.5px] border-margin rounded-[12px] min-h-[240px] min-w-[170px] max-h-[240px] shadow-[1px] hover:[box-shadow:inset_0_-8px_24px_0_var(--shadow-color)] text-left cursor-pointer"
      style={
        {
          "--shadow-color": shadowColor,
        } as React.CSSProperties
      }
    >
      {/* Короткое название */}
      <div className="uppercase text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
        <span>{shortName}</span>
      </div>

      {/* Иконка */}
      <div>
        <Image className="block" src={img} alt={name} width={40} height={40} />
      </div>

      {/* Название и категория */}
      <div className="flex flex-col h-[60px] items-start">
        <div className="text-left flex-1 text-[14px] text-card ">
          <span>{name}</span>
        </div>

        <div className="text-[11px] text-footer">
          <span>{category}</span>
        </div>
      </div>

      {/* Статистика */}
      <div className="pt-[12px] border-t-[1.5px] border-black/[12%] w-full flex items-start text-[11px] text-accent">
        <span>{statistic}</span>
      </div>
    </button>
  );
}
