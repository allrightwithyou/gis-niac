"use client";

import Image from "next/image";
import Link from "next/link";
// import { useState } from "react"; <-- УДАЛИТЬ, этот стейт больше не нужен

interface HeaderProps {
  section: {
    name: string;
    category: string;
    shortName: string;
    img: string;
  };
  onToggleSidebar: () => void; // Получаем функцию от родителя
}

export default function Header({ section, onToggleSidebar }: HeaderProps) {
  // const [isOpen, setIsOpen] = useState(false); <-- УДАЛИТЬ

  const handleMenuClick = () => {
    // Просто вызываем функцию родителя
    onToggleSidebar();
  };

  return (
    <div className="h-[58px] px-[16px] bg-white flex flex-row items-center justify-between border-b border-gray-200 z-20 relative">
      <div className="flex gap-[12px] flex-row justify-center items-center">
        <Link
          href="/main"
          className="flex gap-[6px] pr-[12px] flex-row justify-center items-center border-r-[1px] border-margin"
        >
          <Image
            className="block"
            src="/back.svg"
            alt="Назад"
            width={16}
            height={16}
          />
          <span className="text-hero hover:text-accent transition-colors text-[14px]">
            Назад
          </span>
        </Link>
        <div className="flex shadow p-[2px] border-[2px] h-[32px] w-[32px] justify-center items-center rounded-md bg-bglogo border-accent/20">
          <Image
            className="block"
            width={30}
            height={30}
            src={section.img}
            alt={section.name}
          />
        </div>

        <div className="flex flex-col">
          <span className="text-title text-[16px]">{section.name}</span>
          <span className="text-hero text-[12px]">{section.category}</span>
        </div>
        <div className="flex justify-center shadow items-center h-[23px] px-[8px] py-[2px] uppercase text-accent text-[12px]  rounded-full py-[4px] px-[12px] w-fit bg-bglogo border-[1.5px] border-accent/30">
          <span>{section.shortName}</span>
        </div>
      </div>
      <button onClick={handleMenuClick} aria-label="Открыть меню" type="button">
        <svg
          className="block shadow w-[32px] h-[32px] p-[8px] border-grey/20 stroke-grey bg-profile flex justify-center rounded-md  border-[1px] box-sizing transition-all hover:stroke-accent hover:border-accent"
          fill="none"
          width={32}
          height={32}
          viewBox="0 0 14 14"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.16675 9.91667L7.00008 12.8333L12.8334 9.91667M1.16675 7L7.00008 9.91667L12.8334 7M7.00008 1.16667L1.16675 4.08333L7.00008 7L12.8334 4.08333L7.00008 1.16667Z"
            stroke=""
            strokeWidth="0.875"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
