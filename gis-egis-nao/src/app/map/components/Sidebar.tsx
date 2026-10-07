"use client";

import { useEffect, useState } from "react";
import ButtonSidebar from "./ButtonSidebar";
import type {
  Layer,
  IdentifyResult,
} from "../[name]/MapClient";
import type { Marker } from "@/app/main/data";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  markers?: Marker[];
  layers?: Layer[];
  selectedFeature?: IdentifyResult | null;
  clickedCoordinates?: {
    latitude: string;
    longitude: string;
  } | null;
  onLayerToggle?: (id: string) => void | Promise<void>;
  onClearFeature?: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  markers = [],
  layers = [],
  selectedFeature,
  clickedCoordinates,
  onLayerToggle,
  onClearFeature,
}: SidebarProps) {
  const [localLayers, setLocalLayers] = useState<Layer[]>(layers);

  useEffect(() => {
    setLocalLayers(layers);
  }, [layers]);

  const handleToggle = (id: string) => {
    void onLayerToggle?.(id);
  };

  if (!isOpen) {
    return null;
  }

  const totalMarkers = markers.reduce(
    (sum, marker) => sum + marker.count,
    0,
  );

  const featureCards = (selectedFeature?.items ?? []).map(
    (item, index) => {
      const properties =
        item.properties ??
        item.fields ??
        item.feature?.properties ??
        {};

      const fields: { key: string; value: string }[] = [];

      for (const [key, value] of Object.entries(properties)) {
        if (value === null || value === undefined) {
          continue;
        }

        fields.push({
          key,
          value:
            typeof value === "object"
              ? JSON.stringify(value)
              : String(value),
        });
      }

      const name =
        item.label ??
        item.name ??
        fields.find((field) => field.key.toLowerCase() === "name")
          ?.value ??
        "Выбранный объект";

      return {
        key: `${index}-${item.id ?? ""}`,
        layerName: item.layerName,
        name,
        fields,
      };
    },
  );

  return (
    <aside className=" w-[320px] bg-white shadow-xl flex flex-col border-black/10 h-sidebar overflow-hidden right-0 absolute z-[1000] top-[58px]">
      {/* Точка клика по карте */}
      {clickedCoordinates && (
        <div className="px-[16px] py-[10px] bg-gray-50 border-b border-gray-200 text-[13px] flex flex-col gap-[4px]">
          <span className="text-gray-500">Точка клика:</span>
          <span className="text-gray-900 font-mono">
            {clickedCoordinates.latitude}
          </span>
          <span className="text-gray-900 font-mono">
            {clickedCoordinates.longitude}
          </span>
        </div>
      )}

      {/* Панель выбранного объекта */}
      {selectedFeature && ( 
        <div className="p-[16px] flex flex-col gap-[12px] border-b-[2px] max-h-[50%] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wider ">
              Объект
            </p>

            <button
              type="button"
              onClick={onClearFeature}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Закрыть карточку объекта"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {featureCards.map((card) => (
            <div
              key={card.key}
              className="flex flex-col gap-[6px] pb-[12px] last:border-b-0 last:pb-0"
            >
              {card.layerName && (
                <p className="text-[12px] text-gray-500">
                  {card.layerName}
                </p>
              )}

              <h3 className="text-[16px] text-xs text-gray-500 break-words">
                {card.name}
              </h3>

              {card.fields.length > 0 && (
                <div className="flex flex-col gap-[6px] mt-[4px]">
                  {card.fields.map((field) => (
                    <div
                      key={field.key}
                      className="flex justify-between gap-[12px] text-[13px]"
                    >
                      <span className="text-gray-500 capitalize">
                        {field.key}
                      </span>

                      <span className="text-gray-900 font-medium text-right break-words">
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-[16px] flex flex-col gap-[12px] bg-white border-b-[2px] border-t border-black/10">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Статистика
        </p>

        <div className="grid grid-cols-3 gap-[8px]">
          <div className="flex shadow border-[2px] rounded-[12px] border-black/10 p-[12px] flex-col items-center justify-start">
            <span className="text-title text-[18px]">
              {totalMarkers.toLocaleString()}
            </span>
            <span className="text-footer text-[12px]">Объектов</span>
          </div>

          <div className="flex shadow border-[2px] rounded-[12px] border-black/10 p-[12px] flex-col items-center justify-start">
            <span className="text-title text-[18px]">
              {layers.length}
            </span>
            <span className="text-footer text-[12px]">Слоёв</span>
          </div>

          <div className="flex shadow border-[2px] rounded-[12px] border-black/10 p-[12px] flex-col items-center justify-start">
            <span className="text-title text-[18px]">
              {selectedFeature?.items?.length ?? 0}
            </span>
            <span className="text-footer text-[12px]">Выбрано</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-[16px] py-[8px] flex justify-between">
          <span className="block text-[12px] text-gray-500 uppercase">
            Слои
          </span>
        </div>

        <div className="p-[16px] text-wrap flex flex-col gap-[6px]">
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

      <div className="p-[16px] bg-gray-50 border-t-[2px] border-gray-100">
        <span className="block text-[12px] uppercase text-gray-500 mb-[8px]">
          Легенда
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

            <span className="text-gray-500 font-medium">
              {marker.count}
            </span>
          </div>
        ))}
      </div>

      <div className="p-[16px] border-t-[2px] border-gray-100 text-[12px] text-gray-500 bg-gray-50">
        <p>Картографическая основа: NextGIS Web</p>
        <p>Система координат: WGS 84</p>
        <p>Обновлено 29.09.2026</p>
      </div>
    </aside>
  );
}
