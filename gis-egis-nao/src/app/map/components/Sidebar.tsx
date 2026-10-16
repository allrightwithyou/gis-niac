"use client";

import { useEffect, useState } from "react";
import ButtonSidebar from "./ButtonSidebar";
import IdentifyMedia, {
  IdentifyFieldValue,
  isMediaValue,
} from "./IdentifyMedia";
import type { Layer, IdentifyItem, IdentifyResult } from "../[name]/MapClient";

export interface LegendItem {
  icon?: string;
  label?: string;
}

export interface BasemapItem {
  id: string;
  name: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  layers?: Layer[];
  basemaps?: BasemapItem[];
  activeBasemapId?: string | null;
  selectedFeature?: IdentifyResult | null;
  clickedCoordinates?: {
    latitude: string;
    longitude: string;
  } | null;
  onLayerToggle?: (id: string) => void | Promise<void>;
  onBasemapChange?: (id: string) => void;
  onClearFeature?: () => void;
  /** Лупа в карточке объекта: приблизить карту к объекту */
  onZoomToItem?: (item: IdentifyItem) => void;
  fetchLegend?: (layerId: string) => Promise<LegendItem[]>;
}

export default function Sidebar({
  isOpen,
  layers = [],
  basemaps = [],
  activeBasemapId,
  selectedFeature,
  clickedCoordinates,
  onLayerToggle,
  onBasemapChange,
  onClearFeature,
  onZoomToItem,
  fetchLegend,
}: SidebarProps) {
  const [openLegends, setOpenLegends] = useState<Record<string, boolean>>({});
  const [legends, setLegends] = useState<Record<string, LegendItem[]>>({});
  const [loadingLegends, setLoadingLegends] = useState<Record<string, boolean>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<"layers" | "basemaps">("layers");
  // Свёрнутые/развёрнутые группы слоёв; пока не трогали — берём настройку из NGW (layer.expanded)
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!fetchLegend || !isOpen || layers.length === 0) return;

    let cancelled = false;
    // Легенда есть только у слоёв, у групп её нет
    const layerIds = layers.filter((l) => l.kind !== "group").map((l) => l.id);

    const loadAllLegends = async () => {
      await Promise.resolve();

      for (const id of layerIds) {
        if (cancelled) return;

        setLoadingLegends((prev) => ({ ...prev, [id]: true }));

        try {
          const legendData = await fetchLegend(id);
          if (cancelled) return;

          if (legendData && legendData.length > 0) {
            setLegends((prev) => ({ ...prev, [id]: legendData }));
          }
        } catch {
          // Легенда недоступна
        } finally {
          if (!cancelled) {
            setLoadingLegends((prev) => ({ ...prev, [id]: false }));
          }
        }
      }
    };

    loadAllLegends();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, fetchLegend, isOpen]);

  const handleToggle = (id: string) => {
    void onLayerToggle?.(id);
  };

  const toggleLegend = (layerId: string) => {
    setOpenLegends((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  if (!isOpen) {
    return null;
  }

  // Иерархия слоёв: строки внутри свёрнутой группы (на любом уровне) скрываем
  const layerById = new Map(layers.map((layer) => [layer.id, layer] as const));
  const hasGroups = layers.some((layer) => layer.kind === "group");

  const isGroupCollapsed = (group: Layer) =>
    collapsedGroups[group.id] ?? group.expanded === false;

  const isRowHidden = (layer: Layer) => {
    let parentId = layer.parentId;

    while (parentId) {
      const parent = layerById.get(parentId);
      if (!parent) break;
      if (isGroupCollapsed(parent)) return true;
      parentId = parent.parentId;
    }

    return false;
  };

  const visibleLayers = layers.filter((layer) => !isRowHidden(layer));

  const featureCards = (selectedFeature?.items ?? []).map((item, index) => {
    const properties =
      item.properties ?? item.fields ?? item.feature?.properties ?? {};

    const fields: { key: string; value: string }[] = [];

    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Фото (bgstorage) и камера (camid:N) показываются в <IdentifyMedia>, а не текстом
      if (isMediaValue(value)) {
        continue;
      }

      fields.push({
        key,
        value:
          typeof value === "object" ? JSON.stringify(value) : String(value),
      });
    }

    const name =
      item.label ??
      item.name ??
      fields.find((field) => field.key.toLowerCase() === "name")?.value ??
      "Выбранный объект";

    return {
      key: `${index}-${item.id ?? ""}`,
      layerName: item.layerName,
      name,
      fields,
      item,
      // «Сырые» свойства нужны для ссылок на панораму (nodes, name)
      rawProperties: item.feature?.properties,
    };
  });

  return (
    <aside className="w-[320px] bg-white shadow-xl flex flex-col border-black/10 h-sidebar overflow-hidden right-0 absolute z-[1000] top-[58px]">
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

      {selectedFeature && (
        <div className="p-[16px] flex flex-col gap-[12px] border-b-[1px] border-black/10 max-h-[50%] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
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
              className="flex flex-col gap-[6px] pb-[12px] border-b-[1px] border-black/10 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-[8px]">
                <div className="min-w-0 flex flex-col gap-[6px]">
                  {card.layerName && (
                    <p className="text-[12px] text-gray-500">
                      {card.layerName}
                    </p>
                  )}

                  <h3 className="text-[16px] text-xs text-gray-500 break-words">
                    {card.name}
                  </h3>
                </div>

                {onZoomToItem &&
                  Boolean(
                    card.item.feature?.geometry ?? card.item.geometry,
                  ) && (
                    <button
                      type="button"
                      onClick={() => onZoomToItem(card.item)}
                      className="shrink-0 text-gray-400 hover:text-accent transition-colors"
                      title="Приблизить к объекту"
                      aria-label="Приблизить к объекту"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          cx="11"
                          cy="11"
                          r="7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M16.5 16.5L21 21"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
              </div>

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
                        <IdentifyFieldValue
                          value={field.value}
                          properties={card.rawProperties}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Фото из bgstorage (одно или несколько) и онлайн-камера */}
              <IdentifyMedia item={card.item} />
            </div>
          ))}
        </div>
      )}

      <div className="p-[16px] flex flex-col gap-[12px] bg-white border-b-[2px] border-t border-black/10">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Статистика
        </p>

        <div className="grid grid-cols-2 gap-[8px]">
          <div className="flex shadow border-[2px] rounded-[12px] border-black/10 p-[12px] flex-col items-center justify-start">
            <span className="text-title text-[18px]">
              {layers.filter((layer) => layer.kind !== "group").length}
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

      {/* ───── Переключатель вкладок ───── */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("layers")}
          className={`flex-1 flex items-center justify-center gap-[6px] py-[10px] text-[13px] font-medium transition-colors ${
            activeTab === "layers"
              ? "text-accent border-b-[2px] border-accent/30 bg-accent/10"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          Слои
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("basemaps")}
          className={`flex-1 flex items-center justify-center gap-[6px] py-[10px] text-[13px] font-medium transition-colors ${
            activeTab === "basemaps"
              ? "text-accent border-b-[2px] border-accent/30 bg-accent/10"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          Базовые карты
        </button>
      </div>

      {/* ───── Содержимое вкладок ───── */}
      <div className="flex-1 overflow-y-auto">
        {/* Вкладка: Слои */}
        {activeTab === "layers" && (
          <>
            <div className="px-[16px] py-[8px] flex justify-between">
              <span className="block text-[12px] text-gray-500 uppercase">
                Слои
              </span>
            </div>

            <div className="p-[16px] text-wrap flex flex-col gap-[6px]">
              {layers.length > 0 ? (
                visibleLayers.map((layer) => {
                  const depth = layer.depth ?? 0;

                  // Группа: стрелка сворачивания + переключатель видимости группы
                  if (layer.kind === "group") {
                    const collapsed = isGroupCollapsed(layer);

                    return (
                      <div
                        key={layer.id}
                        className="flex items-center gap-[4px]"
                        style={{ paddingLeft: depth * 16 }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedGroups((prev) => ({
                              ...prev,
                              [layer.id]: !collapsed,
                            }))
                          }
                          className="text-gray-400 hover:text-gray-700 transition-colors w-[20px] h-[20px] flex items-center justify-center shrink-0"
                          aria-label={
                            collapsed ? "Развернуть группу" : "Свернуть группу"
                          }
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            aria-hidden="true"
                            className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
                          >
                            <path
                              d="M4 2l4 4-4 4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        <ButtonSidebar layer={layer} onToggle={handleToggle} />
                      </div>
                    );
                  }

                  const layerLegend = legends[layer.id];
                  const hasLegend = layerLegend && layerLegend.length > 0;
                  const isLoading = loadingLegends[layer.id];

                  return (
                    <div
                      key={layer.id}
                      className="flex flex-col"
                      // Слои сдвигаем на уровень вложенности (+ ширину стрелки, если в карте есть группы)
                      style={{ paddingLeft: depth * 16 + (hasGroups ? 24 : 0) }}
                    >
                      <div className="flex items-center gap-[4px]">
                        <ButtonSidebar layer={layer} onToggle={handleToggle} />
                        {(hasLegend || isLoading) && (
                          <button
                            type="button"
                            onClick={() => toggleLegend(layer.id)}
                            className="text-gray-400 hover:text-gray-700 transition-colors text-[16px] leading-none w-[20px] h-[20px] flex items-center justify-center shrink-0"
                            title={
                              openLegends[layer.id]
                                ? "Скрыть легенду"
                                : "Показать легенду"
                            }
                            aria-label={
                              openLegends[layer.id]
                                ? "Скрыть легенду"
                                : "Показать легенду"
                            }
                          >
                            {openLegends[layer.id] ? "−" : "+"}
                          </button>
                        )}
                      </div>

                      {hasLegend && openLegends[layer.id] && (
                        <div className="ml-[24px] mt-[8px] mb-[8px]">
                          <img
                            src={layerLegend[0].icon}
                            alt="Легенда слоя"
                            className="block"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="p-[24px] text-center text-gray-400">
                  Слои не загружены
                </p>
              )}
            </div>
          </>
        )}

        {/* Вкладка: Базовые карты */}
        {activeTab === "basemaps" && (
          <>
            <div className="px-[16px] py-[8px] flex justify-between">
              <span className="block text-[12px] text-gray-500 uppercase">
                Базовые карты
              </span>
            </div>

            <div className="p-[16px] flex flex-col gap-[4px]">
              {basemaps.length > 0 ? (
                basemaps.map((bm) => {
                  const isActive = bm.id === activeBasemapId;

                  return (
                    <label
                      key={bm.id}
                      className={`flex items-center gap-[10px] cursor-pointer p-[8px] rounded-[8px] transition-colors hover:bg-gray-50 ${
                        isActive ? "bg-green-50" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="basemap-select"
                        checked={isActive}
                        onChange={() => onBasemapChange?.(bm.id)}
                        className="sr-only peer"
                      />
                      {/* Кастомный радио-кружок */}
                      <span
                        className={`flex items-center justify-center w-[18px] h-[18px] rounded-full border-[2px] shrink-0 transition-colors ${
                          isActive
                            ? "border-accent bg-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        <span
                          className={`w-[10px] h-[10px] rounded-full transition-colors ${
                            isActive ? "bg-accent" : "bg-transparent"
                          }`}
                        />
                      </span>
                      <span
                        className={`text-[14px] font-medium ${
                          isActive ? "text-accent" : "text-gray-700"
                        }`}
                      >
                        {bm.name}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="p-[24px] text-center text-gray-400">
                  Базовые карты не настроены
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="hidden p-[16px] border-t-[2px] border-gray-100 text-[12px] text-gray-500 bg-gray-50">
        <p>Картографическая основа: NextGIS Web</p>
        <p>Система координат: WGS 84</p>
        <p>Обновлено 29.09.2026</p>
      </div>
    </aside>
  );
}
