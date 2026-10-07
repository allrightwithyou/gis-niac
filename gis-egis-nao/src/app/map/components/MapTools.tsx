"use client";


import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";


import type { IdentifyItem, WebMapItem } from "../[name]/types";


// ──────────────────────────── Типы ────────────────────────────


interface NgwMapLike {
  emitter?: {
    on?: (event: string, handler: (value: unknown) => void) => void;
    off?: (event: string, handler: (value: unknown) => void) => void;
    removeListener?: (event: string, handler: (value: unknown) => void) => void;
  };
  mapAdapter?: {
    map?: {
      on: (event: string, handler: (e: MapClickEvent) => void) => void;
      off: (event: string, handler: (e: MapClickEvent) => void) => void;
      getZoom: () => number;
      getCenter: () => { lat: number; lng: number };
      fitBounds: (bounds: unknown, opts?: unknown) => void;
      addLayer: (layer: unknown) => void;
      removeLayer: (layer: unknown) => void;
    };
  };
  connector?: {
    get: (
      route: string,
      _null: null,
      opts: { id: number },
    ) => Promise<FeatureRecord[]>;
    getResource: (id: number) => Promise<ResourceRecord>;
  };
  removeLayer?: (id: string) => void;
  addGeoJsonLayer?: (opts: {
    data: GeoJSONFeature;
    id: string;
    paint?: () => PaintStyle;
  }) => Promise<void>;
  fitLayer?: (
    id: string,
    opts?: { maxZoom?: number; padding?: number },
  ) => void;
  setCursor?: (cursor: string) => void;
  enableSelection?: () => void;
  disableSelection?: () => void;
  cancelPromise?: (type: string, source: string) => void;
  invalidateSize?: () => void;
}


interface MapClickEvent {
  latlng: { lat: number; lng: number };
}


interface PaintStyle {
  color: string;
  opacity: number;
  weight: number;
  fillColor?: string;
  fillOpacity?: number;
  fill?: boolean;
  radius?: number;
}


interface FeatureRecord {
  id: number;
  fields: Record<string, unknown>;
  geom?: string;
  geometry?: unknown;
}


interface ResourceRecord {
  resource: {
    display_name: string;
    parent?: { id: number };
  };
  feature_layer?: {
    fields: FieldRecord[];
  };
}


interface FieldRecord {
  keyname: string;
  display_name: string;
  grid_visibility: boolean;
}


interface GeoJSONFeature {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, unknown>;
}


interface MapToolsProps {
  map: NgwMapLike | null;
  baseUrl: string;
  webmapChildren: WebMapItem[];
  toolsList: string[];
  sidebarOpen: boolean;
  onIdentifyItems: (items: IdentifyItem[], zoomToObject?: boolean) => void;
  onZoomToFeature: (feature: GeoJSONFeature) => void;
  onClearFeature: () => void;
  onToggleLoading?: (loading: boolean) => void;
  onObjectClick?: (event: React.MouseEvent<HTMLElement>) => void; // <-- ДОБАВЛЕНО
}


type ToolId =
  | "identify"
  | "measure"
  | "fish"
  | "coord"
  | "ecomon"
  | "coordFromMap"
  | "settl"
  | "zso"
  | "ccf";


interface ToolConfig {
  id: ToolId;
  icon: string;
  title: string;
  enabledKey: string;
}


// ──────────────────────────── Утилиты ────────────────────────────


function findLayerIdByName(
  children: WebMapItem[],
  name: string,
): number | null {
  for (const item of children) {
    if (item.display_name === name) {
      const raw = item as unknown as Record<string, unknown>;
      const id = Number(raw.style_parent_id);
      if (Number.isFinite(id)) return id;
    }
    if (item.children) {
      const found = findLayerIdByName(item.children, name);
      if (found !== null) return found;
    }
  }
  return null;
}


function sortByKey<T extends Record<string, unknown>>(
  arr: T[],
  key: string,
): T[] {
  return [...arr].sort((a, b) => {
    const av = String(a[key] ?? "");
    const bv = String(b[key] ?? "");
    return av.localeCompare(bv, "ru", { numeric: true });
  });
}


async function fetchFeatureCollection(
  baseUrl: string,
  layerId: number,
): Promise<FeatureRecord[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/resource/${layerId}/feature/`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`feature_collection ${res.status}`);
  return res.json();
}


async function fetchFeaturesByIds(
  baseUrl: string,
  layerId: number,
  ids: string[],
): Promise<FeatureRecord[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/resource/${layerId}/feature/?id__in=${ids.join(",")}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`feature_by_ids ${res.status}`);
  return res.json();
}


async function fetchFeaturesByFilter(
  baseUrl: string,
  layerId: number,
  field: string,
  operator: string,
  value: string,
): Promise<FeatureRecord[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/resource/${layerId}/feature/?${field}__${operator}=${encodeURIComponent(value)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`feature_by_filter ${res.status}`);
  return res.json();
}


// ──────────────────────────── ToolSelect ────────────────────────────
// Универсальный выпадающий список для fish/settl/zso/ccf


interface ToolSelectOption {
  value: string;
  label: string;
}


interface ToolSelectProps {
  options: ToolSelectOption[];
  placeholder: string;
  onSelect: (value: string) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  sidebarOpen: boolean;
}


function ToolSelect({
  options,
  placeholder,
  onSelect,
  buttonRef,
  sidebarOpen,
}: ToolSelectProps) {
  const selectRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });


  useEffect(() => {
    function update() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setPosition({
        left: rect.left - 210,
        top: rect.top - 2,
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [buttonRef, sidebarOpen]);


  return (
    <div
      ref={selectRef}
      className="fixed z-[1100] bg-white rounded-[8px] shadow-lg border border-gray-200 overflow-hidden"
      style={{ left: position.left, top: position.top, width: 210 }}
    >
      <select
        className="w-full px-[10px] py-[8px] text-[13px] text-gray-800 bg-white border-0 outline-none cursor-pointer"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            onSelect(e.target.value);
            e.target.value = "";
          }
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}


// ──────────────────────────── CoordWindow ────────────────────────────
// Окно добавления объектов по координатам


interface CoordWindowProps {
  map: NgwMapLike;
  onClose: () => void;
  sidebarOpen: boolean;
}


interface ParsedCoord {
  lat: number;
  lng: number;
}


function parseCoordinates(text: string): ParsedCoord[] {
  const lines = text.trim().split("\n");
  const result: ParsedCoord[] = [];


  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;


    // Различные форматы: "lat lng", "lat,lng", "lat\tlng"
    const parts = trimmed
      .split(/[\s,;\t]+/)
      .map((p) => parseFloat(p.replace(",", ".")))
      .filter((n) => !isNaN(n));


    if (parts.length >= 2) {
      result.push({ lat: parts[0], lng: parts[1] });
    }
  }


  return result;
}


async function addPointsToMap(
  map: NgwMapLike,
  coords: ParsedCoord[],
  fillColor: string,
  layerId: string,
) {
  const L = (await import("leaflet")).default;
  const leafletMap = map.mapAdapter?.map;
  if (!leafletMap) return;


  const layer = L.layerGroup();
  coords.forEach((coord, i) => {
    L.circleMarker([coord.lat, coord.lng], {
      radius: 5,
      fillColor,
      color: "#000",
      weight: 2,
      fillOpacity: 0.8,
    })
      .bindPopup(`Точка ${i + 1}`)
      .addTo(layer);
  });
  layer.addTo(leafletMap);
}


async function addLinesToMap(
  map: NgwMapLike,
  coords: ParsedCoord[],
  fillColor: string,
  layerId: string,
) {
  const L = (await import("leaflet")).default;
  const leafletMap = map.mapAdapter?.map;
  if (!leafletMap) return;


  const latlngs = coords.map((c) => [c.lat, c.lng]) as [number, number][];
  const layer = L.polyline(latlngs, {
    color: fillColor,
    weight: 2,
    opacity: 0.8,
  });
  layer.addTo(leafletMap);
}


async function addPolygonsToMap(
  map: NgwMapLike,
  coords: ParsedCoord[],
  fillColor: string,
  layerId: string,
) {
  const L = (await import("leaflet")).default;
  const leafletMap = map.mapAdapter?.map;
  if (!leafletMap) return;


  const latlngs = coords.map((c) => [c.lat, c.lng]) as [number, number][];
  // Замыкаем полигон
  if (
    latlngs.length > 0 &&
    (latlngs[0][0] !== latlngs[latlngs.length - 1][0] ||
      latlngs[0][1] !== latlngs[latlngs.length - 1][1])
  ) {
    latlngs.push(latlngs[0]);
  }
  const layer = L.polygon(latlngs, {
    color: "#000",
    weight: 2,
    fillColor,
    fillOpacity: 0.5,
  });
  layer.addTo(leafletMap);
}


function CoordWindow({ map, onClose, sidebarOpen }: CoordWindowProps) {
  const [text, setText] = useState("");
  const [fillColor, setFillColor] = useState("#3388ff");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layerCounter = useRef(0);


  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ""));
    };
    reader.readAsText(file);
  };


  const handleCreatePoints = async () => {
    if (!text.trim()) return;
    const coords = parseCoordinates(text);
    if (coords.length === 0) return;
    layerCounter.current++;
    await addPointsToMap(
      map,
      coords,
      fillColor,
      `coord_points_${layerCounter.current}`,
    );
  };


  const handleCreateLines = async () => {
    if (!text.trim()) return;
    const coords = parseCoordinates(text);
    if (coords.length < 2) return;
    layerCounter.current++;
    await addLinesToMap(
      map,
      coords,
      fillColor,
      `coord_lines_${layerCounter.current}`,
    );
    layerCounter.current++;
    await addPointsToMap(
      map,
      coords,
      fillColor,
      `coord_points_${layerCounter.current}`,
    );
  };


  const handleCreatePolygons = async () => {
    if (!text.trim()) return;
    const coords = parseCoordinates(text);
    if (coords.length < 3) return;
    layerCounter.current++;
    await addPolygonsToMap(
      map,
      coords,
      fillColor,
      `coord_polygons_${layerCounter.current}`,
    );
    layerCounter.current++;
    await addPointsToMap(
      map,
      coords,
      fillColor,
      `coord_points_${layerCounter.current}`,
    );
  };


  return (
    <div
      className="fixed z-[1100] bg-white rounded-[10px] shadow-xl border border-gray-200 flex flex-col"
      style={{
        left: "50%",
        top: "80px",
        transform: "translateX(-50%)",
        width: 380,
      }}
    >
      <div className="flex items-center justify-between px-[16px] py-[10px] border-b border-gray-200">
        <span className="text-[14px] font-semibold text-gray-800">
          Объекты по координатам
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-[18px] leading-none"
        >
          ×
        </button>
      </div>


      <div className="p-[16px] flex flex-col gap-[10px]">
        {/* Загрузка файла */}
        <label className="flex items-center gap-[8px] cursor-pointer">
          <span className="text-[12px] text-gray-500">Файл:</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.kml"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-[10px] py-[4px] text-[12px] bg-gray-100 hover:bg-gray-200 rounded-[6px] text-gray-700"
          >
            Выбрать файл
          </button>
          {fileName && (
            <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
              {fileName}
            </span>
          )}
        </label>


        {/* Текстовое поле */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите координаты:&#10;67.75 53.02&#10;67.76 53.03"
          className="w-full h-[120px] px-[10px] py-[8px] text-[12px] font-mono border border-gray-300 rounded-[8px] outline-none focus:border-blue-400 resize-none"
        />


        {/* Цвет */}
        <div className="flex items-center gap-[8px]">
          <span className="text-[12px] text-gray-500">Цвет:</span>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-[40px] h-[28px] cursor-pointer border border-gray-300 rounded"
          />
        </div>


        {/* Кнопки */}
        <div className="flex gap-[6px]">
          <button
            onClick={handleCreatePoints}
            className="flex-1 px-[8px] py-[8px] text-[12px] bg-blue-500 text-white rounded-[6px] hover:bg-blue-600 transition-colors"
          >
            Точки
          </button>
          <button
            onClick={handleCreateLines}
            className="flex-1 px-[8px] py-[8px] text-[12px] bg-blue-500 text-white rounded-[6px] hover:bg-blue-600 transition-colors"
          >
            Линии
          </button>
          <button
            onClick={handleCreatePolygons}
            className="flex-1 px-[8px] py-[8px] text-[12px] bg-blue-500 text-white rounded-[6px] hover:bg-blue-600 transition-colors"
          >
            Полигоны
          </button>
        </div>
      </div>
    </div>
  );
}


// ──────────────────────────── EcomonWindow ────────────────────────────
// Окно экологического мониторинга


interface EcomonWindowProps {
  baseUrl: string;
  map: NgwMapLike;
  onClose: () => void;
}


function EcomonWindow({ baseUrl, map, onClose }: EcomonWindowProps) {
  const [territories, setTerritories] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function load() {
      try {
        const features = await fetchFeatureCollection(baseUrl, 618);
        const names = features
          .map((f) => String(f.fields.terr_name ?? ""))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "ru"));
        setTerritories(names);
      } catch (err) {
        console.error("Не удалось загрузить территории:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [baseUrl]);


  return (
    <div
      className="fixed z-[1100] bg-white rounded-[10px] shadow-xl border border-gray-200 flex flex-col"
      style={{
        left: "50%",
        top: "80px",
        transform: "translateX(-50%)",
        width: 360,
      }}
    >
      <div className="flex items-center justify-between px-[16px] py-[10px] border-b border-gray-200">
        <span className="text-[14px] font-semibold text-gray-800">
          Экологический мониторинг
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-[18px] leading-none"
        >
          ×
        </button>
      </div>


      <div className="p-[16px] flex flex-col gap-[10px]">
        {loading ? (
          <p className="text-center text-gray-400 py-[20px] text-[13px]">
            Загрузка территорий…
          </p>
        ) : (
          <>
            <label className="text-[12px] text-gray-500">Территория</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="px-[10px] py-[8px] text-[13px] border border-gray-300 rounded-[8px] outline-none focus:border-blue-400"
            >
              <option value="">Выберите территорию</option>
              {territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>


            {selected && (
              <p className="text-[12px] text-gray-500 mt-[4px]">
                Выбрано: <b className="text-gray-800">{selected}</b>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ──────────────────────────── CoordFromMapWindow ────────────────────────────
// Окно получения координат по клику


interface CoordFromMapWindowProps {
  map: NgwMapLike;
  onClose: () => void;
  onObjectClick?: (event: React.MouseEvent<HTMLElement>) => void; // <-- ДОБАВЛЕНО
}


interface CoordEntry {
  num: number;
  lat: number;
  lng: number;
}


function formatCoordDms(value: number, pos: string, neg: string): string {
  const hem = value >= 0 ? pos : neg;
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${d}°${String(m).padStart(2, "0")}′${s.toFixed(3).replace(".", ",").padStart(6, "0")}″${hem}`;
}


function CoordFromMapWindow({ map, onClose, onObjectClick }: CoordFromMapWindowProps) {
  const [coords, setCoords] = useState<CoordEntry[]>([]);
  const clickHandlerRef = useRef<((e: MapClickEvent) => void) | null>(null);
  const markersRef = useRef<unknown[]>([]);


  useEffect(() => {
    const leafletMap = map.mapAdapter?.map;
    if (!leafletMap) return;


    map.setCursor?.("crosshair");


    const handler = (e: MapClickEvent) => {
      const { lat, lng } = e.latlng;
      setCoords((prev) => [...prev, { num: prev.length + 1, lat, lng }]);


      // Добавляем маркер на карту
      (async () => {
        const L = (await import("leaflet")).default;
        const marker = L.circleMarker([lat, lng], {
          radius: 5,
          fillColor: "#dc2626",
          color: "#fff",
          weight: 2,
          fillOpacity: 1,
        }).addTo(leafletMap);
        markersRef.current.push(marker);
      })();
    };


    clickHandlerRef.current = handler;
    leafletMap.on("click", handler);


    return () => {
      leafletMap.off("click", handler);
      markersRef.current.forEach((m) => {
        (m as { remove: () => void }).remove?.();
      });
      markersRef.current = [];
      map.setCursor?.("grab");
    };
  }, [map]);


  const handleClear = () => {
    const leafletMap = map.mapAdapter?.map;
    markersRef.current.forEach((m) => {
      (m as { remove: () => void }).remove?.();
    });
    markersRef.current = [];
    setCoords([]);
  };


  const handleCopy = () => {
    const text = coords
      .map((c) => `${c.lat.toFixed(6)} ${c.lng.toFixed(6)}`)
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  };


  return (
    <div
      className="fixed z-[1100] bg-white rounded-[10px] shadow-xl border border-gray-200 flex flex-col"
      style={{
        right: 24,
        top: 80,
        width: 340,
      }}
    >
      <div className="flex items-center justify-between px-[16px] py-[10px] border-b border-gray-200">
        <span className="text-[14px] font-semibold text-gray-800">
          Координаты кликов
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-[18px] leading-none"
        >
          ×
        </button>
      </div>


      <div className="flex gap-[6px] px-[16px] py-[8px] border-b border-gray-100">
        <button
          onClick={handleCopy}
          className="px-[10px] py-[6px] text-[12px] bg-gray-100 hover:bg-gray-200 rounded-[6px] text-gray-700"
        >
          Копировать
        </button>
        <button
          onClick={handleClear}
          className="px-[10px] py-[6px] text-[12px] bg-red-50 hover:bg-red-100 text-red-600 rounded-[6px]"
        >
          Очистить
        </button>
      </div>


      <div className="max-h-[300px] overflow-y-auto">
        {coords.length === 0 ? (
          <p className="text-center text-gray-400 py-[24px] text-[13px]">
            Кликните по карте для получения координат
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-[8px] py-[6px] text-left text-gray-500 font-medium">
                  №
                </th>
                <th className="px-[8px] py-[6px] text-left text-gray-500 font-medium">
                  Широта
                </th>
                <th className="px-[8px] py-[6px] text-left text-gray-500 font-medium">
                  Долгота
                </th>
              </tr>
            </thead>
            <tbody>
              {coords.map((c, index) => (
                <tr
                  key={c.num}
                  className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                  data-layer_id={index} // <-- ДОБАВЛЕНО для клика
                  onClick={onObjectClick} // <-- ДОБАВЛЕНО
                >
                  <td className="px-[8px] py-[4px] text-gray-400">{c.num}</td>
                  <td className="px-[8px] py-[4px] font-mono text-gray-800">
                    {formatCoordDms(c.lat, "N", "S")}
                  </td>
                  <td className="px-[8px] py-[4px] font-mono text-gray-800">
                    {formatCoordDms(c.lng, "E", "W")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


// ──────────────────────────── Иконки ────────────────────────────


const ICON_PATHS: Record<string, ReactNode> = {
  measure: (
    <path d="M192 384h-32v-128h32v128zm96-128h-32v128h32v-128zm96 0h-32v128h32V256zM352 96c17.7 0 32 14.3 32 32v32H64v-32c0-17.7 14.3-32 32-32h256zM304 64c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v32h128V64z" />
  ),
  fish: (
    <path d="M576 128c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zM320 256c0-106-85.9-192-192-192H0v128c0 106 85.9 192 192 192h128V256z" />
  ),
  coord: (
    <path d="M256 0C167.6 0 96 71.6 96 160c0 119.9 160 352 160 352s160-232.1 160-352C416 71.6 344.4 0 256 0zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z" />
  ),
  ecomon: (
    <path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256s114.6 256 256 256 256-114.6 256-256zm-128 64H288v96h-64v-96H128v-64h96v-96h64v96h96v64z" />
  ),
  coordFromMap: (
    <path d="M256 0C167.6 0 96 71.6 96 160c0 119.9 160 352 160 352s160-232.1 160-352C416 71.6 344.4 0 256 0zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z" />
  ),
  settl: (
    <path d="M576 336v128H0V336l288-160 288 160zM288 160L0 0v128l288 160L576 0V0L288 160z" />
  ),
  zso: (
    <path d="M384 32C573.3 32 736 194.7 736 384S573.3 736 384 736 32 573.3 32 384 194.7 32 384 32zm0 128c-123.7 0-224 100.3-224 224s100.3 224 224 224 224-100.3 224-224-100.3-224-224-224z" />
  ),
  ccf: (
    <path d="M436 8c-7-7-18-7-25 0L5 414c-7 7-7 18 0 25l41 41c7 7 18 7 25 0l406-406c7-7 7-18 0-25l-41-41z" />
  ),
};


function ToolIcon({ name }: { name: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 640 512"
      fill="currentColor"
    >
      {ICON_PATHS[name] ?? <path d="" />}
    </svg>
  );
}


// ──────────────────────────── MapTools ────────────────────────────


const TOOLS: ToolConfig[] = [
  { id: "measure", icon: "measure", title: "Измерения", enabledKey: "measureTool" },
  { id: "fish", icon: "fish", title: "Рыболовные участки", enabledKey: "fishTool" },
  { id: "coord", icon: "coord", title: "Объекты по координатам", enabledKey: "coordTool" },
  { id: "ecomon", icon: "ecomon", title: "Экологический мониторинг", enabledKey: "ecomonTool" },
  { id: "coordFromMap", icon: "coordFromMap", title: "Координаты по клику", enabledKey: "coordFromMapTool" },
  { id: "settl", icon: "settl", title: "Населённые пункты", enabledKey: "settlTool" },
  { id: "zso", icon: "zso", title: "Зоны санитарной охраны", enabledKey: "zsoTool" },
  { id: "ccf", icon: "ccf", title: "Объекты капитального строительства", enabledKey: "ccfTool" },
];


export default function MapTools({
  map,
  baseUrl,
  webmapChildren,
  toolsList,
  sidebarOpen,
  onIdentifyItems,
  onZoomToFeature,
  onClearFeature,
  onToggleLoading,
  onObjectClick, // <-- ДОБАВЛЕНО
}: MapToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [selectOptions, setSelectOptions] = useState<ToolSelectOption[]>([]);
  const [selectPlaceholder, setSelectPlaceholder] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const measureControlRef = useRef<unknown>(null);


  // ── Загрузка опций для dropdown-инструментов ──


  const loadSelectOptions = useCallback(
    async (toolId: ToolId) => {
      if (!map) return;


      const toolConfig = TOOLS.find((t) => t.id === toolId);
      if (!toolConfig) return;


      let layerName = "";
      let nameField = "name";
      let placeholder = "Выберите";


      switch (toolId) {
        case "fish":
          layerName = "Рыболовные участки";
          nameField = "name";
          placeholder = "Выберите участок";
          break;
        case "settl":
          layerName = "Населённые пункты";
          nameField = "Name";
          placeholder = "Выберите нас. пункт";
          break;
        case "zso":
          layerName = "Зоны санитарной охраны";
          nameField = "order_number";
          placeholder = "Выберите распоряж.";
          break;
        case "ccf":
          layerName = "Объекты капитального строительства";
          nameField = "Name";
          placeholder = "Выберите объект";
          break;
        default:
          return;
      }


      const layerId = findLayerIdByName(webmapChildren, layerName);
      if (!layerId) {
        console.warn(`Слой "${layerName}" не найден`);
        return;
      }


      setLoadingOptions(true);
      onToggleLoading?.(true);


      try {
        const features = await fetchFeatureCollection(baseUrl, layerId);
        const options: ToolSelectOption[] = [];


        if (toolId === "zso") {
          // Группировка по дате + номеру
          const groups = new Map<string, { ids: string[]; label: string }>();
          for (const f of features) {
            const dateRaw = String(f.fields.order_date ?? "");
            const number = String(f.fields.order_number ?? "");
            const dateParts = dateRaw.split(".");
            const dateUtc =
              dateParts.length === 3
                ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
                : dateRaw;
            const key = dateUtc + number;
            if (!groups.has(key)) {
              groups.set(key, {
                ids: [],
                label:
                  number !== "-"
                    ? `№ ${number} от ${dateRaw}`
                    : "Отсутствуют данные",
              });
            }
            groups.get(key)!.ids.push(String(f.id));
          }
          const sortedGroups = new Map(
            [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])),
          );
          sortedGroups.forEach((g) => {
            options.push({ value: g.ids.join(","), label: g.label });
          });
        } else if (toolId === "ccf") {
          // Группировка по имени
          const groups = new Map<string, { ids: string[]; label: string }>();
          for (const f of features) {
            const name = String(f.fields[nameField] ?? "");
            if (!groups.has(name)) {
              groups.set(name, { ids: [], label: name });
            }
            groups.get(name)!.ids.push(String(f.id));
          }
          const sortedGroups = new Map(
            [...groups.entries()].sort((a, b) =>
              a[0].localeCompare(b[0], "ru", { numeric: true }),
            ),
          );
          sortedGroups.forEach((g) => {
            options.push({ value: g.ids.join(","), label: g.label });
          });
        } else {
          // Обычная сортировка
          const sorted = sortByKey(
            features.map((f) => ({
              id: String(f.id),
              name: String(f.fields[nameField] ?? ""),
            })),
            "name",
          );
          sorted.forEach((s) => {
            options.push({ value: s.id, label: s.name });
          });
        }


        setSelectOptions(options);
        setSelectPlaceholder(placeholder);
      } catch (err) {
        console.error(`Не удалось загрузить опции для ${toolId}:`, err);
      } finally {
        setLoadingOptions(false);
        onToggleLoading?.(false);
      }
    },
    [map, baseUrl, webmapChildren, onToggleLoading],
  );


  // ── Обработка выбора из dropdown ──


  const handleSelect = useCallback(
    async (toolId: ToolId, value: string) => {
      if (!map) return;


      const layerNames: Record<string, string> = {
        fish: "Рыболовные участки",
        settl: "Населённые пункты",
        zso: "Зоны санитарной охраны",
        ccf: "Объекты капитального строительства",
      };


      const layerName = layerNames[toolId];
      if (!layerName) return;


      const layerId = findLayerIdByName(webmapChildren, layerName);
      if (!layerId) return;


      onToggleLoading?.(true);


      try {
        const ids = value.split(",");
        const features = await fetchFeaturesByIds(baseUrl, layerId, ids);


        if (toolId === "settl") {
          // Зум к объекту
          if (features.length > 0) {
            const f = features[0];
            const geom = f.geom ?? f.geometry;
            if (geom) {
              onZoomToFeature({
                type: "Feature",
                geometry: geom,
                properties: f.fields,
              });
            }
          }
        } else {
          // Идентификация
          const items: IdentifyItem[] = features.map((f) => ({
            layerId,
            layerName,
            fields: f.fields,
            geometry: f.geom ?? f.geometry,
            id: f.id,
          }));
          onIdentifyItems(items, false);
        }
      } catch (err) {
        console.error(`Ошибка при выборе ${toolId}:`, err);
      } finally {
        onToggleLoading?.(false);
      }
    },
    [map, baseUrl, webmapChildren, onIdentifyItems, onZoomToFeature, onToggleLoading],
  );


  // ── Переключение инструмента ──


  const handleToggle = useCallback(
    (toolId: ToolId) => {
      if (activeTool === toolId) {
        // Выключаем
        setActiveTool(null);
        setSelectOptions([]);
        onClearFeature();


        if (toolId === "measure" && measureControlRef.current) {
          (measureControlRef.current as { remove: () => void }).remove?.();
          measureControlRef.current = null;
        }
        return;
      }


      // Выключаем предыдущий инструмент
      onClearFeature();


      if (measureControlRef.current) {
        (measureControlRef.current as { remove: () => void }).remove?.();
        measureControlRef.current = null;
      }


      setActiveTool(toolId);


      // Загрузка для dropdown-инструментов
      if (["fish", "settl", "zso", "ccf"].includes(toolId)) {
        void loadSelectOptions(toolId);
      }


      // Measure tool
      if (toolId === "measure") {
        (async () => {
          try {
            const leafletMap = map?.mapAdapter?.map;
            if (!leafletMap) return;


            const L = (await import("leaflet")).default;


            // Простой measure: клик → линия → длина
            let measurePoints: [number, number][] = [];
            let measureLayer: unknown = null;


            const onMapClick = (e: { latlng: { lat: number; lng: number } }) => {
              measurePoints.push([e.latlng.lat, e.latlng.lng]);


              if (measureLayer) {
                (measureLayer as { remove: () => void }).remove?.();
              }


              if (measurePoints.length >= 2) {
                measureLayer = L.polyline(measurePoints, {
                  color: "#dc2626",
                  weight: 3,
                }).addTo(leafletMap);


                // Вычисление длины
                let total = 0;
                for (let i = 1; i < measurePoints.length; i++) {
                  total += L.latLng(measurePoints[i - 1][0], measurePoints[i - 1][1])
                    .distanceTo(L.latLng(measurePoints[i][0], measurePoints[i][1]));
                }


                const km = total / 1000;
                const text =
                  km >= 1
                    ? `${km.toFixed(2)} км`
                    : `${total.toFixed(0)} м`;


                L.popup()
                  .setLatLng([
                    e.latlng.lat,
                    e.latlng.lng,
                  ])
                  .setContent(`Длина: ${text}`)
                  .openOn(leafletMap);
              } else {
                measureLayer = L.circleMarker(
                  [e.latlng.lat, e.latlng.lng],
                  { radius: 4, color: "#dc2626" },
                ).addTo(leafletMap);
              }
            };


            const onDblClick = () => {
              measurePoints = [];
              if (measureLayer) {
                (measureLayer as { remove: () => void }).remove?.();
                measureLayer = null;
              }
            };


            leafletMap.on("click", onMapClick);
            leafletMap.on("dblclick", onDblClick);


            measureControlRef.current = {
              remove: () => {
                leafletMap.off("click", onMapClick);
                leafletMap.off("dblclick", onDblClick);
                if (measureLayer) {
                  (measureLayer as { remove: () => void }).remove?.();
                }
              },
            };
          } catch (err) {
            console.error("Measure init:", err);
          }
        })();
      }
    },
    [activeTool, loadSelectOptions, onClearFeature, map],
  );


  // ── Cleanup при размонтировании ──
  useEffect(() => {
    return () => {
      if (measureControlRef.current) {
        (measureControlRef.current as { remove: () => void }).remove?.();
      }
    };
  }, []);


  const visibleTools = TOOLS.filter((t) => toolsList.includes(t.enabledKey));
  if (visibleTools.length === 0 || !map) return null;


  return (
    <>
      {/* Кнопки инструментов */}
      <div
        className="absolute top-[10px] z-[1000] flex flex-col gap-[2px]"
        style={{ right: sidebarOpen ? 336 : 10 }}
      >
        {visibleTools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              ref={(el) => {
                buttonRefs.current[tool.id] = el;
              }}
              onClick={() => handleToggle(tool.id)}
              title={tool.title}
              className={`w-[34px] h-[34px] flex items-center justify-center rounded-[6px] border shadow-sm transition-all
                ${isActive
                  ? "bg-blue-500 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:text-gray-900 hover:border-gray-300"
                }`}
            >
              <ToolIcon name={tool.icon} />
            </button>
          );
        })}
      </div>


      {/* Dropdown для fish/settl/zso/ccf */}
      {activeTool &&
        ["fish", "settl", "zso", "ccf"].includes(activeTool) &&
        buttonRefs.current[activeTool] && (
          <ToolSelect
            options={selectOptions}
            placeholder={loadingOptions ? "Загрузка…" : selectPlaceholder}
            onSelect={(value) => void handleSelect(activeTool, value)}
            buttonRef={{
              current: buttonRefs.current[activeTool],
            }}
            sidebarOpen={sidebarOpen}
          />
        )}


      {/* Окно координат */}
      {activeTool === "coord" && (
        <CoordWindow
          map={map}
          onClose={() => handleToggle("coord")}
          sidebarOpen={sidebarOpen}
        />
      )}


      {/* Окно экологического мониторинга */}
      {activeTool === "ecomon" && (
        <EcomonWindow
          baseUrl={baseUrl}
          map={map}
          onClose={() => handleToggle("ecomon")}
        />
      )}


      {/* Окно координат по клику */}
      {activeTool === "coordFromMap" && (
        <CoordFromMapWindow
          map={map}
          onClose={() => handleToggle("coordFromMap")}
          onObjectClick={onObjectClick} // <-- ПЕРЕДАНО
        />
      )}
    </>
  );
}
