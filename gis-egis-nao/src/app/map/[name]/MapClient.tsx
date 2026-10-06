"use client";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useEffect, useRef, useState } from "react";

interface SectionData {
  name: string;
  category: string;
  shortName: string;
  img: string;
  resourceIds: number[];
  statistic?: string;
}

export interface Layer {
  id: string;
  name: string;
  active: boolean;
}

interface WebMapItem {
  item_type?: "layer" | "group";
  display_name?: string;
  layer_enabled?: boolean;
  children?: WebMapItem[];
}

interface MapClientProps {
  section: SectionData;
  resourceId: number;
}

interface MapInstance {
  destroy?: () => void;
  onLoad?: () => Promise<unknown>;
  getLayers?: () => string[];
  isLayerVisible?: (id: string) => boolean;
  toggleLayer?: (id: string, visible?: boolean) => Promise<void>;
  invalidateSize?: () => void;
}

function getLayerItems(items: WebMapItem[]): WebMapItem[] {
  const result: WebMapItem[] = [];

  for (const item of items) {
    if (item.item_type === "layer") {
      result.push(item);
    }

    if (item.item_type === "group" && item.children) {
      result.push(...getLayerItems(item.children));
    }
  }

  return result;
}

export default function MapClient({ section, resourceId }: MapClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [loadedLayers, setLoadedLayers] = useState<Layer[]>([]);

  const mapElement = useRef<HTMLDivElement | null>(null);

  const mapInstance = useRef<MapInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const target = mapElement.current;
      const baseUrl = process.env.NEXT_PUBLIC_NGW_BASE_URL;

      if (!target || !resourceId || !baseUrl) {
        console.error("Не хватает параметров карты", {
          target,
          resourceId,
          baseUrl,
        });
        return;
      }

      try {
        const { default: NgwMap } = await import("@nextgis/ngw-leaflet");

        if (cancelled || !mapElement.current) {
          return;
        }

        const map = await NgwMap.create({
          baseUrl,
          target: mapElement.current,
          webmapId: resourceId,
        });

        if (cancelled) {
          map.destroy();
          return;
        }

        mapInstance.current = map;

        await map.onLoad?.();

        const layerIds = map.getLayers?.() ?? [];

        const resourceResponse = await fetch(
          `${baseUrl}/api/resource/${resourceId}`,
        );

        if (!resourceResponse.ok) {
          throw new Error(`Ошибка API Web Map: ${resourceResponse.status}`);
        }

        const resourceData = await resourceResponse.json();

        const rootItem = resourceData.webmap?.root_item;

        const items: WebMapItem[] = rootItem?.children ?? [];

        const layerItems = getLayerItems(items);

        const allLayers: Layer[] = layerIds
          .filter((id) => !id.startsWith("webmap-baselayer"))
          .map((id, index) => {
            const item = layerItems[index];

            return {
              id,
              name: item?.display_name?.trim() || id,
              active: map.isLayerVisible?.(id) ?? item?.layer_enabled ?? true,
            };
          });

        const nextLayers = allLayers.filter((layer) =>
          /\p{L}/u.test(layer.name),
        );

        if (!cancelled) {
          setLoadedLayers(nextLayers);
        }
      } catch (error) {
        console.error("Ошибка инициализации карты:", error);
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      mapInstance.current?.destroy();
      mapInstance.current = null;
      setLoadedLayers([]);
    };
  }, [resourceId]);
  const handleLayerToggle = async (id: string) => {
    const map = mapInstance.current;

    if (!map?.toggleLayer) {
      return;
    }

    const currentVisible = map.isLayerVisible?.(id) ?? false;

    const nextVisible = !currentVisible;

    try {
      await map.toggleLayer(id, nextVisible);

      map.invalidateSize?.();

      setLoadedLayers((currentLayers) =>
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
      console.error(`Не удалось переключить слой ${id}:`, error);
    }
  };
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        section={section}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        layers={loadedLayers}
        onLayerToggle={handleLayerToggle}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-h-0 flex-1">
        <div ref={mapElement} className="h-full w-full flex-1" />
      </div>
    </div>
  );
}
