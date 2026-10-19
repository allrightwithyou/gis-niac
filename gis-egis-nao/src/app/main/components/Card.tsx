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
  /** Поисковый запрос (в нижнем регистре). Пусто — обычный вид карточки. */
  query?: string;
}

/** Выделяет в тексте найденный фрагмент запроса. */
function highlight(text: string, query: string) {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query);
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[3px] bg-bglogo text-accent">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

export default function Card({ section, webMaps, query = "" }: CardProps) {
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

  // Поиск: если запрос совпал с названием раздела, карточка выглядит как обычно;
  // если совпали только карты внутри — карточка раскрывается и показывает только их
  const q = query.trim().toLowerCase();
  const sectionMatches =
    !q ||
    name.toLowerCase().includes(q) ||
    shortName.toLowerCase().includes(q);
  const mapsToShow =
    q && !sectionMatches
      ? availableMaps.filter((map) => map.name.toLowerCase().includes(q))
      : availableMaps;
  const forcedOpen = q !== "" && !sectionMatches && mapsToShow.length > 0;

  // Открытое состояние
  if (isOpen || forcedOpen) {
    return (
      <div className="h-full bg-white p-[20px] min-h-[230px] max-h-[255px] max-w-[230px] min-w-[170px] h-full flex flex-col border-[1.5px] border-margin rounded-[12px] shadow-xl">
        {/* Заголовок */}
        <div className="flex items-start justify-between mb-[16px]">
          <div className="flex flex-col gap-[4px]">
            <div className="uppercase text-accent text-[12px] rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
              {shortName}
            </div>
          </div>

          {/* При поиске карточка раскрыта автоматически — закрывать её не нужно */}
          {!forcedOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[20px] leading-none text-footer hover:text-accent cursor-pointer"
              aria-label="Закрыть"
            >
              ×
            </button>
          )}
        </div>

        {/* Список карт */}
        <div className="flex flex-col overflow-y-auto">
          {mapsToShow.length === 0 ? (
            <span className="text-[14px] text-footer">Доступных карт нет</span>
          ) : (
            mapsToShow.map((map) => (
              <Link
                href={`/map/${map.id}`}
                key={map.id}
                className="w-full text-left text-[13px] pb-[3px] text-card hover:text-accent transition cursor-pointer border-black/10 border-b-[1px]"
              >
                {highlight(map.name, q)}
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
      className="cursor-pointer h-full shadow-xl group bg-white p-[20px] gap-[16px] flex flex-col items-start min-h-[230px] max-h-[255px] max-w-[230px] min-w-[170px] border-[1.5px] border-margin rounded-[12px]  shadow-[1px] hover:[box-shadow:inset_0_-8px_24px_0_var(--shadow-color)] text-left cursor-pointer"
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
        <Image className="block " src={img} alt={name} width={40} height={40} />
      </div>

      {/* Название и категория */}
      <div className="flex flex-col h-[80px] w-full items-start">
        <div className="text-left flex-1 text-[14px] text-card pb-[2px] ">
          <span>{highlight(name, q)}</span>
        </div>

        <div className="text-[12px] flex items-start border-t-[1.5px] pt-[12px] border-black/[12%] w-full text-accent/70">
          <span>{category}</span>
        </div>
      </div>
    </button>
  );
  // {/* Статистика */}
  //<div className="pt-[12px] hidden border-t-[1.5px] border-black/[12%] w-full flex items-start text-[11px] text-accent">
  //     <span>{statistic}</span>
  //  </div>
}
