"use client";

import { useState } from "react";
import ButtonSidebar from "./ButtonSidebar";
import type { Marker, Layer } from "@/app/main/data";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  markers?: Marker[];
  layers?: Layer[];
}

export default function Sidebar({
  isOpen,
  onClose,
  markers = [],
  layers = [],
}: SidebarProps) {
  // СОСТОЯНИЕ ХРАНИТСЯ ЗДЕСЬ. Копируем слои в локальный стейт.
  const [localLayers, setLocalLayers] = useState<Layer[]>(layers);

  // ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ
  const handleToggle = (id: string) => {
    setLocalLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, active: !layer.active } : layer,
      ),
    );
  };
  // 2. Функция для кнопки "Показать все" / "Скрыть все"
  const handleBulkAction = () => {
    // Проверяем, все ли слои уже активны
    const areAllActive = localLayers.every((layer) => layer.active);

    if (areAllActive) {
      // Если все активны -> скрываем все
      setLocalLayers((prev) =>
        prev.map((layer) => ({ ...layer, active: false })),
      );
    } else {
      // Если не все активны -> показываем все
      setLocalLayers((prev) =>
        prev.map((layer) => ({ ...layer, active: true })),
      );
    }
  };

  if (!isOpen) return null;

  const totalMarkers = markers.reduce((sum, m) => sum + m.count, 0);
  // Вычисляем текст кнопки динамически
  const isAllActive =
    localLayers.length > 0 && localLayers.every((l) => l.active);
  const buttonText = isAllActive ? "Скрыть все" : "Показать все";
  return (
    <aside className=" w-[320px] bg-white shadow-xl flex flex-col border-gray-200 h-sidebar overflow-hidden right-0 absolute z-[1000] top-[58px]">
      {/* Статистика */}
      <div className="p-[16px] flex flex-col gap-[12px] bg-white border-b-[2px] border-t border-black/10">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Статистика
        </p>
        <div className="grid grid-cols-3 gap-[8px] ">
          <div className="flex shadow border-[2px] rounded-[12px] border-black/10 p-[12px] flex-col items-center justify-start">
            <span className="text-title text-[18px]">
              {totalMarkers.toLocaleString()}
            </span>{" "}
            <span className="text-footer text-[12px]">Объектов</span>
          </div>
          <div className="flex shadow border-[2px] rounded-[12px] border-black/10 p-[12px] flex-col items-center justify-start">
            <span className="text-title text-[18px]">
              {totalMarkers.toLocaleString()}
            </span>{" "}
            <span className="text-footer text-[12px]">Объектов</span>
          </div>
          <div className="flex shadow border-[2px] rounded-[12px] border-black/10 p-[12px] flex-col items-center justify-start">
            <span className="text-title text-[18px]">
              {totalMarkers.toLocaleString()}
            </span>{" "}
            <span className="text-footer text-[12px]">Объектов</span>
          </div>
        </div>
      </div>

      {/* Слои */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-[16px] py-[8px] flex justify-between ">
          <span className="block text-[12px] text-gray-500 uppercase">
            Слои
          </span>
          <button
            className="text-accent text-[12px] hover:underline focus:outline-none"
            type="button"
            onClick={handleBulkAction}
            aria-label={buttonText}
          >
            {buttonText}
          </button>
        </div>
        <div className="p-[16px] flex flex-col gap-[6px]">
          {localLayers.length > 0 ? (
            localLayers.map((layer) => (
              <ButtonSidebar
                key={layer.id}
                layer={layer}
                onToggle={handleToggle}
              />
            ))
          ) : (
            <p className="p-[24px] text-center text-gray-400">
              Слои не загружены
            </p>
          )}
        </div>
      </div>

      {/* Метки */}
      <div className=" p-[16px] bg-gray-50 border-t-[2px] border-gray-100">
        <span className="block text-[12px] uppercase text-gray-500 mb-[8px]">
          Метки
        </span>
        {markers.map((marker) => (
          <div
            key={marker.id}
            className="flex items-center justify-between text-sm text-gray-800 mb-[6px]"
          >
            <div className="flex items-center gap-[8px] rounded-full">
              <span
                style={{
                  background: marker.color,
                  display: "inline-block",
                }}
                className="rounded-full w-[12px] h-[12px]"
              />
              <span>{marker.label}</span>
            </div>
            <span className="text-gray-500 font-medium">{marker.count}</span>
          </div>
        ))}
      </div>

      {/* Подвал */}
      <div className="p-[16px] border-t-[2px] border-gray-100 text-[12px] text-gray-500 bg-gray-50">
        <p>Картографическая основа: NextGIS Web</p>
        <p>Система координат: WGS 84</p>
        <p>Обновлено 29.09.2026</p>
      </div>
    </aside>
  );
}
