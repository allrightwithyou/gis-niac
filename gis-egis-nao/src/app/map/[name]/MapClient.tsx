"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

import "@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css";

import type {
  Layer,
  SectionData,
  WebMapItem,
} from "./types";

interface MapClientProps {
  section: SectionData;
  resourceId: number;
}

export interface IdentifyItem {
  properties?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  name?: string;
  feature?: {
    properties?: Record<string, unknown>;
  };
  geometry?: unknown;
  type?: string;
  id?: string | number;

  [key: string]: unknown;
}

export interface IdentifyResult {
  items: IdentifyItem[];
  raw: unknown;
}

interface EventEmitter {
  on?: (
    event: string,
    handler: (value: unknown) => void,
  ) => void;

  off?: (
    event: string,
    handler: (value: unknown) => void,
  ) => void;
}

interface NgwMapInstance {
  destroy?: () => void;
  remove?: () => void;
  onLoad?: () => Promise<unknown>;
  getLayers?: () => string[];
  isLayerVisible?: (
    id: string,
  ) => boolean;
  toggleLayer?: (
    id: string,
    visible?: boolean,
  ) => Promise<void>;
  invalidateSize?: () => void;
  emitter?: EventEmitter;
}

interface NgwMapOptions {
  baseUrl: string;
  target: HTMLDivElement;
  resources: Array<{
    resource: number;
    fit?: boolean;
  }>;
  identification: boolean;
  highlightIdentification: boolean;
  pixelRadius: number;
}

interface NgwMapConstructor {
  create: (
    options: NgwMapOptions,
  ) => Promise<NgwMapInstance>;
}

function getLayerItems(
  items: WebMapItem[],
): WebMapItem[] {
  const result: WebMapItem[] = [];

  for (const item of items) {
    if (item.item_type === "layer") {
      result.push(item);
    }

    if (
      item.item_type === "group" &&
      item.children
    ) {
      result.push(
        ...getLayerItems(item.children),
      );
    }
  }

  return result;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function getIdentifyItems(
  value: unknown,
): IdentifyItem[] {
  if (!isRecord(value)) {
    return [];
  }

  const getItems =
    value.getIdentifyItems;

  if (typeof getItems === "function") {
    try {
      const items = (
        getItems as () => unknown
      )();

      if (Array.isArray(items)) {
        return items as IdentifyItem[];
      }
    } catch (error) {
      console.error(
        "Ошибка получения объектов:",
        error,
      );
    }
  }

  if (Array.isArray(value.items)) {
    return value.items as IdentifyItem[];
  }

  if (Array.isArray(value.features)) {
    return value.features as IdentifyItem[];
  }

  if (
    value.feature &&
    isRecord(value.feature)
  ) {
    return [
      value.feature as IdentifyItem,
    ];
  }

  if (
    value.properties &&
    isRecord(value.properties)
  ) {
    return [
      value as IdentifyItem,
    ];
  }

  if (
    value.fields &&
    isRecord(value.fields)
  ) {
    return [
      value as IdentifyItem,
    ];
  }

  return [];
}

function normalizeIdentify(
  value: unknown,
): IdentifyResult | null {
  if (!value) {
    return null;
  }

  const items =
    getIdentifyItems(value);

  if (items.length === 0) {
    return null;
  }

  return {
    items,
    raw: value,
  };
}

export default function MapClient({
  section,
  resourceId,
}: MapClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(true);

  const [loadedLayers, setLoadedLayers] =
    useState<Layer[]>([]);

  const [selectedFeature, setSelectedFeature] =
    useState<IdentifyResult | null>(null);

  const mapElement =
    useRef<HTMLDivElement | null>(null);

  const mapInstance =
    useRef<NgwMapInstance | null>(null);

  const initializingRef =
    useRef(false);

  useEffect(() => {
    let cancelled = false;

    let identifyHandler:
      | ((value: unknown) => void)
      | undefined;

    async function initMap() {
      if (initializingRef.current) {
        return;
      }

      initializingRef.current = true;

      const target =
        mapElement.current;

      const baseUrl =
        process.env.NEXT_PUBLIC_NGW_BASE_URL;

      if (
        !target ||
        !resourceId ||
        !baseUrl
      ) {
        initializingRef.current = false;

        console.error(
          "Не хватает параметров карты",
          {
            target,
            resourceId,
            baseUrl,
          },
        );

        return;
      }

      try {
        if (mapInstance.current) {
          mapInstance.current.remove?.();
          mapInstance.current.destroy?.();
          mapInstance.current = null;
        }

        target.replaceChildren();

        const module =
          (await import(
            "@nextgis/ngw-leaflet"
          )) as {
            default: NgwMapConstructor;
          };

        const NgwMap =
          module.default;

        if (
          cancelled ||
          !mapElement.current
        ) {
          return;
        }

        const map =
          await NgwMap.create({
            baseUrl,
            target: mapElement.current,
            resources: [
              {
                resource: resourceId,
                fit: true,
              },
            ],
            identification: true,
            highlightIdentification: true,
            pixelRadius: 15,
          });

        if (cancelled) {
          map.remove?.();
          map.destroy?.();
          return;
        }

        mapInstance.current =
          map;

        identifyHandler = (
          value: unknown,
        ) => {
          console.log(
            "Событие ngw:select:",
            value,
          );

          if (!value) {
            return;
          }

          const result =
            normalizeIdentify(value);

          console.log(
            "Нормализованный объект:",
            result,
          );

          if (!result) {
            return;
          }

          setSelectedFeature(result);
          setIsSidebarOpen(true);
        };

        map.emitter?.on?.(
          "ngw:select",
          identifyHandler,
        );

        await map.onLoad?.();

        if (cancelled) {
          return;
        }

        const layerIds =
          map.getLayers?.() ?? [];

        const resourceResponse =
          await fetch(
            `${baseUrl}/api/resource/${resourceId}`,
          );

        if (!resourceResponse.ok) {
          throw new Error(
            `Ошибка API Web Map: ${resourceResponse.status}`,
          );
        }

        const resourceData =
          await resourceResponse.json();

        const rootItem =
          resourceData.webmap?.root_item;

        const items: WebMapItem[] =
          rootItem?.children ?? [];

        const layerItems =
          getLayerItems(items);

        const allLayers: Layer[] =
          layerIds
            .filter(
              (id) =>
                !id.startsWith(
                  "webmap-baselayer",
                ),
            )
            .map((id, index) => {
              const item =
                layerItems[index];

              return {
                id,
                name:
                  item?.display_name?.trim() ||
                  id,
                active:
                  map.isLayerVisible?.(id) ??
                  item?.layer_enabled ??
                  true,
              };
            });

        const nextLayers =
          allLayers.filter(
            (layer) =>
              /\p{L}/u.test(layer.name),
          );

        if (!cancelled) {
          setLoadedLayers(
            nextLayers,
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Ошибка инициализации карты:",
            error,
          );
        }
      } finally {
        initializingRef.current = false;
      }
    }

    void initMap();

    return () => {
      cancelled = true;

      if (
        identifyHandler &&
        mapInstance.current?.emitter
      ) {
        mapInstance.current.emitter.off?.(
          "ngw:select",
          identifyHandler,
        );
      }

      mapInstance.current?.remove?.();
      mapInstance.current?.destroy?.();
      mapInstance.current = null;

      mapElement.current?.replaceChildren();

      initializingRef.current = false;

      setLoadedLayers([]);
      setSelectedFeature(null);
    };
  }, [resourceId]);

  async function handleLayerToggle(
    id: string,
  ) {
    const map =
      mapInstance.current;

    if (!map?.toggleLayer) {
      return;
    }

    const currentVisible =
      map.isLayerVisible?.(id) ?? false;

    const nextVisible =
      !currentVisible;

    try {
      await map.toggleLayer(
        id,
        nextVisible,
      );

      map.invalidateSize?.();

      setLoadedLayers(
        (currentLayers) =>
          currentLayers.map((layer) =>
            layer.id === id
              ? {
                  ...layer,
                  active: nextVisible,
                }
              : layer,
          ),
      );
    } catch (error) {
      console.error(
        `Не удалось переключить слой ${id}:`,
        error,
      );
    }
  }

  function handleClearFeature() {
    setSelectedFeature(null);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        section={section}
        onToggleSidebar={() =>
          setIsSidebarOpen(
            (previous) => !previous,
          )
        }
      />

      <Sidebar
        isOpen={isSidebarOpen}
        layers={loadedLayers}
        selectedFeature={selectedFeature}
        onLayerToggle={handleLayerToggle}
        onClearFeature={
          handleClearFeature
        }
        onClose={() =>
          setIsSidebarOpen(false)
        }
      />

      <main className="relative min-h-0 flex-1">
        <div
          ref={mapElement}
          className="h-full w-full"
        />
      </main>
    </div>
  );
}