"use client";

import { useEffect, useRef, useState } from "react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MapTools from "../components/MapTools";

// Импорт стилей для адаптера карты NextGIS
import "@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css";

import type { Layer, SectionData, WebMapItem } from "./types";

// Экспортируем тип Layer для использования в других модулях
export type { Layer } from "./types";

// Элемент, полученный при идентификации (клике по карте)
export interface IdentifyItem {
  properties?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  name?: string;
  label?: string;
  layerName?: string;

  feature?: {
    properties?: Record<string, unknown>;
    geometry?: unknown;
    geom?: unknown;
  };

  geometry?: unknown;
  geom?: unknown;
  type?: string;
  id?: string | number;
  layerId?: number;

  [key: string]: unknown;
}

// Результат идентификации
export interface IdentifyResult {
  items: IdentifyItem[];
  raw: unknown;
}

// Целевой слой для идентификации
interface IdentifyTarget {
  mapLayerId: string;
  vectorLayerId: number;
  name: string;
  fieldLabels: Record<string, string>;
}

// Типизация события мыши Leaflet
interface LeafletMouseEventLike {
  latlng: MapPoint;
}

// Типизация объекта карты Leaflet
interface LeafletMapLike {
  on(event: string, handler: (event: LeafletMouseEventLike) => void): void;
  off(event: string, handler: (event: LeafletMouseEventLike) => void): void;
  attributionControl?: {
    remove: () => void;
  };
  getZoom(): number;
}

// Типизация EventEmitter для событий карты
interface EventEmitter {
  on?: (event: string, handler: (value: unknown) => void) => void;
  off?: (event: string, handler: (value: unknown) => void) => void;
  removeListener?: (event: string, handler: (value: unknown) => void) => void;
}

// Опции для добавления GeoJSON слоя
interface GeoJsonLayerOptions {
  data: {
    type: "Feature";
    geometry: unknown;
    properties: Record<string, unknown>;
  };
  id: string;
  paint?: () => {
    color: string;
    opacity: number;
    weight: number;
    fillColor?: string;
    fillOpacity?: number;
    fill?: boolean;
    radius?: number;
    zIndex?: number;
  };
}

// Интерфейс экземпляра карты NextGIS
interface NgwMapInstance {
  destroy?: () => void;
  remove?: () => void;
  onLoad?: () => Promise<unknown>;
  getLayers?: () => string[];
  isLayerVisible?: (id: string) => boolean;
  toggleLayer?: (id: string, visible?: boolean) => Promise<void>;
  invalidateSize?: () => void;
  addGeoJsonLayer?: (options: GeoJsonLayerOptions) => Promise<void>;
  removeLayer?: (id: string) => void;
  fitLayer?: (id: string, opts?: { maxZoom?: number; padding?: number }) => void;
  emitter?: EventEmitter;
  mapAdapter?: {
    map?: LeafletMapLike;
  };
}

// Опции для создания карты NextGIS
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

// Конструктор карты NextGIS
interface NgwMapConstructor {
  create: (options: NgwMapOptions) => Promise<NgwMapInstance>;
}

// Точка на карте
export interface MapPoint {
  lat: number;
  lng: number;
}

// Константы
const EARTH_RADIUS = 6378137;
const WEB_MERCATOR_RESOLUTION_Z0 = 156543.03392804097;
const IDENTIFY_PIXEL_RADIUS = 15;
const HIGHLIGHT_LAYER_ID = "identify-highlight";
const ZOOM_LAYER_ID = "zoom_layer";

function normalizePoint(point: MapPoint): MapPoint {
  const lng = ((((point.lng + 180) % 360) + 360) % 360) - 180;
  return {
    lat: point.lat,
    lng,
  };
}

function formatDms(
  value: number,
  positiveLabel: string,
  negativeLabel: string,
): string {
  const hemisphere = value >= 0 ? positiveLabel : negativeLabel;
  const totalThousandths = Math.round(Math.abs(value) * 3600 * 1000);
  const degrees = Math.floor(totalThousandths / 3_600_000);
  const minutes = Math.floor((totalThousandths % 3_600_000) / 60_000);
  const seconds = (totalThousandths % 60_000) / 1000;
  const secondsText = seconds.toFixed(3).replace(".", ",").padStart(6, "0");
  const minutesText = String(minutes).padStart(2, "0");
  return `${degrees}° ${minutesText}′ ${secondsText}′′${hemisphere}`;
}

function formatLatitude(lat: number): string {
  return formatDms(lat, "С.Ш.", "Ю.Ш.");
}

function formatLongitude(lng: number): string {
  return formatDms(lng, "В.Д.", "З.Д.");
}

function formatPoint(point: MapPoint): string {
  return `${formatLatitude(point.lat)} | ${formatLongitude(point.lng)}`;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Ошибка запроса ${response.status}: ${url}`);
  }
  const data: unknown = await response.json();
  if (!isRecord(data)) {
    throw new Error(`Неожиданный ответ: ${url}`);
  }
  return data;
}

async function loadIdentifyTargets(
  baseUrl: string,
  entries: Array<{
    mapLayerId: string;
    styleId: number;
    name: string;
  }>,
): Promise<IdentifyTarget[]> {
  const results = await Promise.all(
    entries.map(async (entry) => {
      try {
        const style = await fetchJson(
          `${baseUrl}/api/resource/${entry.styleId}`,
        );
        const resource = style.resource;
        const parentId =
          isRecord(resource) && isRecord(resource.parent)
            ? Number(resource.parent.id)
            : Number.NaN;
        if (!Number.isFinite(parentId)) {
          return null;
        }
        const layer = await fetchJson(`${baseUrl}/api/resource/${parentId}`);
        const featureLayer = layer.feature_layer;
        if (!isRecord(featureLayer)) {
          return null;
        }
        const fieldLabels: Record<string, string> = {};
        if (Array.isArray(featureLayer.fields)) {
          for (const field of featureLayer.fields) {
            if (!isRecord(field) || typeof field.keyname !== "string") {
              continue;
            }
            fieldLabels[field.keyname] =
              typeof field.display_name === "string" && field.display_name
                ? field.display_name
                : field.keyname;
          }
        }
        return {
          mapLayerId: entry.mapLayerId,
          vectorLayerId: parentId,
          name: entry.name,
          fieldLabels,
        };
      } catch (error) {
        console.error(`Не удалось подготовить слой ${entry.name}:`, error);
        return null;
      }
    }),
  );
  return results.filter((target): target is IdentifyTarget => target !== null);
}

function toWebMercator(point: MapPoint): [number, number] {
  const x = (EARTH_RADIUS * point.lng * Math.PI) / 180;
  const y =
    EARTH_RADIUS *
    Math.log(Math.tan(Math.PI / 4 + (point.lat * Math.PI) / 360));
  return [x, y];
}

function buildIdentifyGeometry(point: MapPoint, zoom: number): string {
  const [x, y] = toWebMercator(point);
  const radius =
    IDENTIFY_PIXEL_RADIUS * (WEB_MERCATOR_RESOLUTION_Z0 / 2 ** zoom);
  return [
    "POLYGON((",
    `${x - radius} ${y - radius},`,
    `${x + radius} ${y - radius},`,
    `${x + radius} ${y + radius},`,
    `${x - radius} ${y + radius},`,
    `${x - radius} ${y - radius}`,
    "))",
  ].join("");
}

function normalizeFeature(
  feature: Record<string, unknown>,
  target: IdentifyTarget,
): IdentifyItem {
  const fields: Record<string, unknown> = {};
  const rawFields = isRecord(feature.fields)
    ? feature.fields
    : isRecord(feature.properties)
      ? feature.properties
      : {};
  for (const [key, value] of Object.entries(rawFields)) {
    fields[
      target.fieldLabels[key] ?? key
    ] = value;
  }
  return {
    id:
      typeof feature.id === "number" || typeof feature.id === "string"
        ? feature.id
        : undefined,
    label: typeof feature.label === "string" ? feature.label : undefined,
    fields,
    layerName: target.name,
    geometry: feature.geometry ?? feature.geom,
    layerId: target.vectorLayerId,
  };
}

function parseIdentifyResponse(
  data: unknown,
  targets: IdentifyTarget[],
): IdentifyResult | null {
  if (!isRecord(data)) {
    return null;
  }
  const items: IdentifyItem[] = [];
  for (const target of targets) {
    const entry = data[String(target.vectorLayerId)];
    if (!isRecord(entry) || !Array.isArray(entry.features)) {
      continue;
    }
    for (const feature of entry.features) {
      if (!isRecord(feature)) {
        continue;
      }
      items.push(normalizeFeature(feature, target));
    }
  }
  if (items.length === 0) {
    return null;
  }
  return {
    items,
    raw: data,
  };
}

async function identifyAtPoint(
  geometry: string,
  targets: IdentifyTarget[],
): Promise<IdentifyResult | null> {
  if (targets.length === 0) {
    console.warn("Нет доступных векторных слоёв");
    return null;
  }
  const baseUrl = process.env.NEXT_PUBLIC_NGW_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_NGW_BASE_URL не задан");
  }
  const endpoint =
    `${baseUrl.replace(/\/$/, "")}` + "/api/feature_layer/identify";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      srs: 3857,
      geom: geometry,
      layers: targets.map(
        (target) => target.vectorLayerId,
      ),
    }),
    cache: "no-store",
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Ошибка identify ${response.status}: ${responseText}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("NextGIS вернул не JSON");
  }
  return parseIdentifyResponse(data, targets);
}

// Тип для GeoJSON feature
interface GeoJSONFeature {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, unknown>;
}

interface MapClientProps {
  section: SectionData;
  resourceId: number;
}

export default function MapClient({ section, resourceId }: MapClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loadedLayers, setLoadedLayers] = useState<Layer[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<IdentifyResult | null>(
    null,
  );
  const [clickedPoint, setClickedPoint] = useState<MapPoint | null>(null);

  const mapElement = useRef<HTMLDivElement | null>(null);
  const coordsElement = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<NgwMapInstance | null>(null);
  const identifyTargetsRef = useRef<IdentifyTarget[]>([]);
  const identifyRequestRef = useRef(0);
  const initializingRef = useRef(false);
  const webmapChildrenRef = useRef<WebMapItem[]>([]);
  const objectsRef = useRef<IdentifyItem[]>([]);

  function removeHighlight() {
    const map = mapInstance.current;
    if (!map?.removeLayer) {
      return;
    }
    map.removeLayer(HIGHLIGHT_LAYER_ID);
  }

  async function highlightFeature(data: GeoJSONFeature, fitToLayer = false) {
    const map = mapInstance.current;
    if (!map?.addGeoJsonLayer) {
      console.warn("У карты отсутствует addGeoJsonLayer");
      return;
    }
    const geometry = data.geometry;
    if (!geometry) {
      console.warn("У объекта отсутствует geometry — подсветка пропущена", data);
      return;
    }
    
    map.removeLayer?.(HIGHLIGHT_LAYER_ID);
    
    await map.addGeoJsonLayer({
      data,
      id: HIGHLIGHT_LAYER_ID,
      paint: () => ({
        color: "#FF00FF",
        opacity: 0.5,
        weight: 8,
        zIndex: 9999,
      }),
    });
    
    if (fitToLayer && map.fitLayer) {
      map.fitLayer(HIGHLIGHT_LAYER_ID);
    }
  }

  async function zoomToObject(data: GeoJSONFeature, fitToLayer = false) {
    const map = mapInstance.current;
    if (!map?.addGeoJsonLayer) {
      console.warn("У карты отсутствует addGeoJsonLayer");
      return;
    }
    const geometry = data.geometry;
    if (!geometry) {
      console.warn("У объекта отсутствует geometry — зум пропущен", data);
      return;
    }
    map.removeLayer?.(ZOOM_LAYER_ID);
    await map.addGeoJsonLayer({
      data,
      id: ZOOM_LAYER_ID,
      paint: () => ({
        color: "#FFFFFF",
        opacity: 0.0,
        weight: 0,
        zIndex: 9999,
      }),
    });
    if (fitToLayer && map.fitLayer) {
      map.fitLayer(ZOOM_LAYER_ID, {
        maxZoom: 15,
        padding: 2,
      });
    }
  }

  async function handleIdentifyItems(items: IdentifyItem[], _zoomToObject?: boolean) {
    if (items.length === 0) {
      removeHighlight();
      setSelectedFeature(null);
      objectsRef.current = [];
      return;
    }
    const result: IdentifyResult = {
      items,
      raw: items,
    };
    setSelectedFeature(result);
    setIsSidebarOpen(true);
    objectsRef.current = items;
    
    const firstItem = items[0];
    if (firstItem.feature) {
      await highlightFeature(firstItem.feature);
    } else if (firstItem.geometry) {
      await highlightFeature({
        type: "Feature",
        geometry: firstItem.geometry,
        properties: firstItem.fields ?? firstItem.properties ?? {},
      });
    }
  }

  function handleZoomToFeature(feature: GeoJSONFeature) {
    void zoomToObject(feature, true);
  }

  function handleClearFeature() {
    identifyRequestRef.current += 1;
    removeHighlight();
    setSelectedFeature(null);
    setClickedPoint(null);
    objectsRef.current = [];
  }

  function handleObjectClick(event: React.MouseEvent<HTMLElement>) {
    const layerId = event.currentTarget.dataset.layer_id;
    if (layerId === undefined) {
      return;
    }
    const index = Number(layerId);
    if (!Number.isFinite(index) || !objectsRef.current[index]) {
      return;
    }
    const item = objectsRef.current[index];
    if (item.feature) {
      void highlightFeature(item.feature);
    } else if (item.geometry) {
      void highlightFeature({
        type: "Feature",
        geometry: item.geometry,
        properties: item.fields ?? item.properties ?? {},
      });
    }
  }

  async function handleLayerToggle(id: string) {
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
  }

  useEffect(() => {
    let cancelled = false;
    let leafletMap: LeafletMapLike | undefined;
    let onMouseMove: ((event: LeafletMouseEventLike) => void) | undefined;
    let onMouseOut: (() => void) | undefined;
    let onClick: ((event: LeafletMouseEventLike) => void) | undefined;

    async function init() {
      if (initializingRef.current) {
        return;
      }
      initializingRef.current = true;
      const target = mapElement.current;
      const baseUrl = process.env.NEXT_PUBLIC_NGW_BASE_URL;
      if (!target || !resourceId || !baseUrl) {
        initializingRef.current = false;
        console.error("Не хватает параметров карты", {
          target,
          resourceId,
          baseUrl,
        });
        return;
      }
      try {
        if (mapInstance.current) {
          mapInstance.current.remove?.();
          mapInstance.current.destroy?.();
          mapInstance.current = null;
        }
        removeHighlight();
        target.replaceChildren();
        const module = (await import("@nextgis/ngw-leaflet")) as {
          default: NgwMapConstructor;
        };
        const NgwMap = module.default;
        if (cancelled || !mapElement.current) {
          return;
        }
        const map = await NgwMap.create({
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
          pixelRadius: IDENTIFY_PIXEL_RADIUS,
        });
        if (cancelled) {
          map.remove?.();
          map.destroy?.();
          return;
        }
        mapInstance.current = map;
        await map.onLoad?.();
        if (cancelled) {
          return;
        }
        leafletMap = map.mapAdapter?.map;
        if (!leafletMap) {
          throw new Error("Leaflet-карта не найдена");
        }
        leafletMap.attributionControl?.remove();
        const layerIds = map.getLayers?.() ?? [];
        const overlayIds = layerIds.filter(
          (id) => !id.startsWith("webmap-baselayer"),
        );
        const resourceResponse = await fetch(
          `${baseUrl}/api/resource/${resourceId}`,
          {
            cache: "no-store",
          },
        );
        if (!resourceResponse.ok) {
          throw new Error(`Ошибка API Web Map: ${resourceResponse.status}`);
        }
        const resourceData = await resourceResponse.json();
        const rootItem = resourceData.webmap?.root_item;
        const items: WebMapItem[] = rootItem?.children ?? [];
        webmapChildrenRef.current = items;
        const layerItems = getLayerItems(items);
        const layerMap = new Map(
          layerItems.map((l, idx) => {
            const overlayId = overlayIds[idx];
            if (!overlayId) return [null, l] as const;
            return [overlayId, l] as const;
          }),
        );
        const allLayers: Layer[] = overlayIds
          .map((id) => {
            const item = layerMap.get(id);
            if (!item) return null;
            return {
              id,
              name: item.display_name?.trim() || id,
              active: map.isLayerVisible?.(id) ?? item.layer_enabled ?? true,
            };
          })
          .filter((layer): layer is Layer => layer !== null);
        const nextLayers = allLayers.filter((layer) =>
          /\p{L}/u.test(layer.name),
        );
        if (!cancelled) {
          setLoadedLayers(nextLayers);
        }
        const identifyEntries: Array<{
          mapLayerId: string;
          styleId: number;
          name: string;
        }> = [];
        overlayIds.forEach((id, index) => {
          const item = layerItems[index];
          if (!item) {
            return;
          }
          const raw = item as unknown as Record<string, unknown>;
          if (raw.layer_identifiable === false) {
            return;
          }
          const styleId = Number(raw.layer_style_id);
          if (!Number.isFinite(styleId)) {
            return;
          }
          identifyEntries.push({
            mapLayerId: id,
            styleId,
            name: item.display_name?.trim() || id,
          });
        });
        const targets = await loadIdentifyTargets(baseUrl, identifyEntries);
        if (!cancelled) {
          identifyTargetsRef.current = targets;
        }
        onMouseMove = (event: LeafletMouseEventLike) => {
          if (coordsElement.current) {
            coordsElement.current.textContent = formatPoint(
              normalizePoint(event.latlng),
            );
          }
        };
        onMouseOut = () => {
          if (coordsElement.current) {
            coordsElement.current.textContent = "—";
          }
        };
        onClick = (event: LeafletMouseEventLike) => {
          const point = normalizePoint(event.latlng);
          setClickedPoint(point);
          setSelectedFeature(null);
          setIsSidebarOpen(true);
          const requestId = ++identifyRequestRef.current;
          const visibleTargets = identifyTargetsRef.current.filter(
            (item) => map.isLayerVisible?.(item.mapLayerId) ?? true,
          );
          const identifyGeometry = buildIdentifyGeometry(
            point,
            leafletMap?.getZoom() ?? 0,
          );
          void identifyAtPoint(identifyGeometry, visibleTargets)
            .then(async (result) => {
              if (requestId !== identifyRequestRef.current) return;
              setSelectedFeature(result);
              if (!result || result.items.length === 0) {
                removeHighlight();
                return;
              }
              objectsRef.current = result.items;
              const firstItem = result.items[0];
              if (firstItem.feature?.geometry) {
                await highlightFeature(firstItem.feature);
              } else if (firstItem.geometry) {
                await highlightFeature({
                  type: "Feature",
                  geometry: firstItem.geometry,
                  properties: firstItem.fields ?? firstItem.properties ?? {},
                });
              } else {
                console.warn("Первый объект не имеет геометрии — подсветка пропущена");
              }
            })
            .catch((error) => {
              if (requestId === identifyRequestRef.current) {
                console.error("Ошибка идентификации:", error);
              }
            });
        };
        leafletMap.on("mousemove", onMouseMove);
        leafletMap.on("mouseout", onMouseOut);
        leafletMap.on("click", onClick);
      } catch (error) {
        if (!cancelled) {
          console.error("Ошибка инициализации карты:", error);
        }
      } finally {
        initializingRef.current = false;
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (leafletMap) {
        if (onMouseMove) {
          leafletMap.off("mousemove", onMouseMove);
        }
        if (onMouseOut) {
          leafletMap.off("mouseout", onMouseOut);
        }
        if (onClick) {
          leafletMap.off("click", onClick);
        }
      }
      removeHighlight();
      mapInstance.current?.remove?.();
      mapInstance.current?.destroy?.();
      mapInstance.current = null;
      mapElement.current?.replaceChildren();
      identifyTargetsRef.current = [];
      identifyRequestRef.current += 1;
      initializingRef.current = false;
      setLoadedLayers([]);
      setSelectedFeature(null);
      setClickedPoint(null);
      objectsRef.current = [];
    };
  }, [resourceId]);

  const toolsList = [
    "measureTool",
    "fishTool",
    "coordTool",
    "ecomonTool",
    "coordFromMapTool",
    "settlTool",
    "zsoTool",
    "ccfTool",
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        section={section}
        onToggleSidebar={() => setIsSidebarOpen((previous) => !previous)}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        layers={loadedLayers}
        selectedFeature={selectedFeature}
        clickedCoordinates={
          clickedPoint
            ? {
                latitude: formatLatitude(clickedPoint.lat),
                longitude: formatLongitude(clickedPoint.lng),
              }
            : null
        }
        onLayerToggle={handleLayerToggle}
        onClearFeature={handleClearFeature}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="relative min-h-0 flex-1">
        <div ref={mapElement} className="h-full w-full" />
        <MapTools
          map={mapInstance.current}
          baseUrl={process.env.NEXT_PUBLIC_NGW_BASE_URL || ""}
          webmapChildren={webmapChildrenRef.current}
          toolsList={toolsList}
          sidebarOpen={isSidebarOpen}
          onIdentifyItems={handleIdentifyItems}
          onZoomToFeature={handleZoomToFeature}
          onClearFeature={handleClearFeature}
          onObjectClick={handleObjectClick}
        />
        <div
          ref={coordsElement}
          className={`pointer-events-none absolute bottom-[28px] z-[1000] rounded bg-white/90 px-[10px] py-[4px] font-mono text-[12px] text-gray-800 shadow ${
            isSidebarOpen ? "right-[336px]" : "right-[8px]"
          }`}
        >
          —
        </div>
      </main>
    </div>
  );
}