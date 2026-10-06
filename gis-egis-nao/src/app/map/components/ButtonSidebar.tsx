"use client";

import type { Layer } from "../[name]/MapClient";

interface ButtonSidebarProps {
  layer: Layer;
  onToggle: (id: string) => void;
}

export default function ButtonSidebar({ layer, onToggle }: ButtonSidebarProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(layer.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle(layer.id);
        }
      }}
      style={{
        backgroundColor: layer.active
          ? "var(--color-bglogo)"
          : "var(--color-profile)",
        borderColor: layer.active ? "var(--color-accent)" : "rgba(0,0,0,0.12)",
      }}
      className="flex shadow items-center justify-between p-[12px] bg-white border-[2px] border-grey rounded-[12px] transition-colors cursor-pointer select-none"
    >
      <div className="text-wrap w-[200px]">
        <span
          className={`text-sm font-medium transition-colors duration-300 ${
            layer.active ? "text-gray-900 font-bold" : "text-gray-400"
          }`}
        >
          {layer.name}
        </span>
      </div>

      <div className="relative flex items-center w-[32px] h-[16px]">
        <div
          className="absolute inset-0 rounded-full transition-colors duration-300 ease-in-out"
          style={{
            backgroundColor: layer.active ? "var(--color-accent)" : "#d1d5db",
          }}
        />

        <div
          className={`absolute w-[12px] h-[12px] bg-white rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
            layer.active ? "translate-x-[16px]" : "translate-x-[4px]"
          }`}
        />
      </div>
    </div>
  );
}
