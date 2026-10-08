"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Sidebar, {
  type LegendItem,
  type BasemapItem,
} from "../components/Sidebar";
//import MapTools from "../components/MapTools";

// Стили адаптера Leaflet — без них карта и тайлы отрисуются некорректно
import "@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css";

import type { Layer, SectionData, WebMapItem } from "./types";

export type { Layer } from "./types";

// ──────────────────────────────────────────────────────────────────────────────
//  ИНТЕРФЕЙСЫ: ИДЕНТИФИКАЦИЯ ОБЪЕКТОВ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Один элемент результата идентификации (клик по карте → объект).
 * Содержит свойства, поля, имя слоя, геометрию и метаданные.
 * Передаётся в Sidebar для отображения карточки объекта.
 */
export interface IdentifyItem {
  properties?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  name?: string;
  label?: string;
  layerName?: string;

  feature?: {
    type?: string;
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

/**
 * Полный результат идентификации: массив элементов + «сырые» данные.
 * Сырые данные сохраняются для возможной отладки или расширенной логики.
 */
export interface IdentifyResult {
  items: IdentifyItem[];
  raw: unknown;
}

/**
 * Конфигурация цели идентификации для конкретного слоя.
 * Связывает ID слоя на карте (mapLayerId) с векторным слоем NGW (vectorLayerId),
 * хранит человекочитаемые имена полей и правила их видимости.
 */
interface IdentifyTarget {
  mapLayerId: string;
  vectorLayerId: number;
  name: string;
  fieldLabels: Record<string, string>;
  fieldVisibility: Record<string, boolean>;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ИНТЕРФЕЙСЫ: LEAFLET, NGW, СОБЫТИЯ
// ──────────────────────────────────────────────────────────────────────────────

/** Минимальный интерфейс события мыши Leaflet — нужен только latlng. */
interface LeafletMouseEventLike {
  latlng: MapPoint;
}

/** Минимальный интерфейс карты Leaflet, с которым работает компонент. */
interface LeafletMapLike {
  on(event: string, handler: (event: LeafletMouseEventLike) => void): void;
  off(event: string, handler: (event: LeafletMouseEventLike) => void): void;
  attributionControl?: {
    remove: () => void;
  };
  getZoom(): number;
}

/** Универсальный интерфейс подписки на события (SDK emitter или аналог). */
interface EventEmitter {
  on?: (event: string, handler: (value: unknown) => void) => void;
  off?: (event: string, handler: (value: unknown) => void) => void;
  removeListener?: (event: string, handler: (value: unknown) => void) => void;
}

/** Один элемент идентификации, возвращаемый NGW SDK. */
interface NgwIdentifyItem {
  layerId: number;
  label?: string;
  id?: string | number;
  geojson?: () => Promise<GeoJSONFeature>;
  properties?: Record<string, unknown>;
  fields?: Record<string, unknown>;
}

/** Событие выбора объекта на карте (ngw:select). */
interface NgwSelectEvent {
  getIdentifyItems?: () => NgwIdentifyItem[];
}

/** Опции для добавления GeoJSON-слоя на карту. */
interface GeoJsonLayerOptions {
  data: GeoJSONFeature | GeoJSONFeature[];
  id: string;
  paint?: () => {
    color: string;
    opacity: number;
    weight: number;
  };
}

/** Адаптер слоя NGW — используется для получения легенды. */
interface NgwLayerAdapter {
  getLegend?: () => Promise<unknown>;
}

/** Сырой объект базового слоя из getBaseLayers(). */
interface BaseLayerEntry {
  id?: string;
  options?: {
    name?: string;
    visibility?: boolean;
  };
}

/**
 * Минимальный интерфейс экземпляра NGW-карты (NgwMap).
 * Описывает только те методы, которые реально используются в компоненте.
 */
interface NgwMapInstance {
  destroy?: () => void;
  remove?: () => void;
  onLoad?: () => Promise<unknown>;
  getLayers?: () => string[];
  getLayer?: (layerDef: string) => NgwLayerAdapter | undefined;
  isLayerVisible?: (id: string) => boolean;
  toggleLayer?: (id: string, visible?: boolean) => Promise<void>;
  invalidateSize?: () => void;
  addGeoJsonLayer: (options: GeoJsonLayerOptions) => Promise<void>;
  removeLayer: (id: string) => void;
  fitLayer: (
    id: string,
    opts?: {
      maxZoom?: number;
      padding?: number;
    },
  ) => void;
  setCursor: (cursor: string) => void;
  enableSelection?: () => void;
  disableSelection?: () => void;
  emitter?: EventEmitter;
  mapAdapter?: {
    map?: LeafletMapLike;
  };
  getBaseLayers?: (resourceId?: string | number) => BaseLayerEntry[];
  showLayer?: (layer: BaseLayerEntry) => void;
}

export interface MapPoint {
  lat: number;
  lng: number;
}

/** Минимальное описание GeoJSON Feature, достаточное для работы компонента. */
interface GeoJSONFeature {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, unknown>;
}

interface MapClientProps {
  section: SectionData;
  resourceId: number; // ID ресурса веб-карты в NextGIS
}

/** Радиус поиска объектов вокруг точки клика (в пикселях). */
const IDENTIFY_PIXEL_RADIUS = 15;

// ──────────────────────────────────────────────────────────────────────────────
//  УТИЛИТЫ: КООРДИНАТЫ И ФОРМАТИРОВАНИЕ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Нормализует долготу в диапазон [-180, 180].
 * Нужно, чтобы избежать артефактов при работе с глобальными данными
 * и сферическими проекциями: долгота может прийти как 190 или -270.
 */
function normalizePoint(point: MapPoint): MapPoint {
  const lng = ((((point.lng + 180) % 360) + 360) % 360) - 180;
  return {
    lat: point.lat,
    lng,
  };
}

/**
 * Форматирует числовое значение координаты в строку вида:
 * «69° 02′ 30,000′′С.Ш.»
 * Работает с тысячными долями секунды для точного округления.
 */
function formatDms(
  value: number,
  positiveLabel: string, // например "С.Ш."
  negativeLabel: string, // например "Ю.Ш."
): string {
  const hemisphere = value >= 0 ? positiveLabel : negativeLabel;

  // Переводим в тысячные доли секунды для максимальной точности
  const totalThousandths = Math.round(Math.abs(value) * 3600 * 1000);

  const degrees = Math.floor(totalThousandths / 3_600_000);
  const minutes = Math.floor((totalThousandths % 3_600_000) / 60_000);
  const seconds = (totalThousandths % 60_000) / 1000;

  // Секунды: 3 знака после запятой, запятая как разделитель, выравнивание по ширине
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

/** Объединяет широту и долготу в одну строку для координатной строки. */
function formatPoint(point: MapPoint): string {
  return `${formatLatitude(point.lat)} | ${formatLongitude(point.lng)}`;
}

// ──────────────────────────────────────────────────────────────────────────────
//  УТИЛИТЫ: СБОР СЛОЁВ ИЗ ДЕРЕВА ВЕБ-КАРТЫ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Рекурсивно собирает все элементы типа «слой» из дерева веб-карты.
 * Учитывает вложенные группы: если встречается группа с детьми — спускается внутрь.
 * Возвращает плоский массив слоёв для отображения в сайдбаре и настройки идентификации.
 */
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

/**
 * Тайп-гард: проверяет, что значение — это обычный объект (не null, не массив).
 * Используется при разборе JSON-ответов от NGW API.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// ──────────────────────────────────────────────────────────────────────────────
//  HTTP-УТИЛИТЫ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Безопасный fetch JSON-ответа с базовой валидацией.
 * cache: "no-store" отключает кеширование Next.js, чтобы данные всегда были свежими.
 * Если ответ не OK или не объект — выбрасывает ошибку.
 */
async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Ошибка запроса ${response.status}: ${url}`);
  }

  const data: unknown = await response.json();

  if (!isRecord(data)) {
    throw new Error(`Неожиданный ответ (не объект): ${url}`);
  }

  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ИДЕНТИФИКАЦИЯ: ПОДГОТОВКА ЦЕЛЕЙ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Загружает и подготавливает цели идентификации для списка слоёв.
 *
 * Для каждого слоя:
 * 1) Запрашивает стиль (style) по styleId.
 * 2) Из стиля извлекает parentId — ID родительского векторного слоя.
 * 3) Запрашивает родительский ресурс, чтобы получить конфигурацию полей
 *    (display_name, grid_visibility).
 *
 * Возвращает массив IdentifyTarget, который используется при обработке кликов:
 * позволяет сопоставить кликнутый объект с настройками отображения его полей.
 */
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
        // Шаг 1: получаем данные стиля слоя
        const style = await fetchJson(
          `${baseUrl}/api/resource/${entry.styleId}`,
        );

        const resource = style.resource;

        // Шаг 2: извлекаем ID родительского ресурса (векторного слоя)
        const parentId =
          isRecord(resource) && isRecord(resource.parent)
            ? Number(resource.parent.id)
            : Number.NaN;

        if (!Number.isFinite(parentId)) {
          return null;
        }

        // Шаг 3: получаем данные родительского ресурса
        const layer = await fetchJson(`${baseUrl}/api/resource/${parentId}`);

        const featureLayer = layer.feature_layer;

        if (!isRecord(featureLayer)) {
          return null;
        }

        // Шаг 4: собираем конфигурацию полей
        const fieldLabels: Record<string, string> = {};
        const fieldVisibility: Record<string, boolean> = {};

        if (Array.isArray(featureLayer.fields)) {
          for (const field of featureLayer.fields) {
            if (!isRecord(field) || typeof field.keyname !== "string") {
              continue;
            }

            // Если display_name задан и непустой — используем его, иначе keyname
            fieldLabels[field.keyname] =
              typeof field.display_name === "string" && field.display_name
                ? field.display_name
                : field.keyname;

            // По умолчанию поле видимо, если grid_visibility не равно false
            fieldVisibility[field.keyname] = field.grid_visibility !== false;
          }
        }

        return {
          mapLayerId: entry.mapLayerId,
          vectorLayerId: parentId,
          name: entry.name,
          fieldLabels,
          fieldVisibility,
        };
      } catch (error) {
        // Если слой не удалось подготовить — пропускаем, не роняем всю инициализацию
        console.error(`Не удалось подготовить слой ${entry.name}:`, error);
        return null;
      }
    }),
  );

  // Фильтруем null-результаты, оставляем только валидные цели
  return results.filter((target): target is IdentifyTarget => target !== null);
}

// ──────────────────────────────────────────────────────────────────────────────
//  ПОСТРОЕНИЕ ЭЛЕМЕНТА ИДЕНТИФИКАЦИИ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Создаёт объект IdentifyItem из GeoJSON-объекта и конфигурации цели.
 *
 * - Применяет правила видимости полей (fieldVisibility): скрытые поля не попадают в результат.
 * - Переименовывает поля в человекочитаемые имена (fieldLabels).
 * - Если цель не передана — использует ключи свойств как есть.
 */
function buildIdentifyItem(
  feature: GeoJSONFeature,
  target: IdentifyTarget | undefined,
  extra: {
    id?: string | number;
    label?: string;
    layerId?: number;
  },
): IdentifyItem {
  const fields: Record<string, unknown> = {};
  const rawFields = isRecord(feature.properties) ? feature.properties : {};

  for (const [key, value] of Object.entries(rawFields)) {
    // Пропускаем поля, которые отмечены как невидимые в конфигурации слоя
    if (target?.fieldVisibility && target.fieldVisibility[key] === false) {
      continue;
    }

    // Используем человекочитаемое имя, если оно задано; иначе — ключ как есть
    fields[target?.fieldLabels[key] ?? key] = value;
  }

  return {
    id: extra.id,
    label: extra.label,
    fields,
    layerName: target?.name ?? `Слой ${extra.layerId}`,
    layerId: extra.layerId,
    feature,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
//  ЛЕГЕНДЫ: НОРМАЛИЗАЦИЯ (SDK И REST)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Нормализует легенду, полученную через SDK (layer.getLegend()).
 *
 * Ожидаемый формат: массив объектов, каждый содержит поле legend: [].
 * Каждый элемент легенды: { symbol: { format, data }, name }.
 * format и data — base64-представление иконки.
 * Преобразует их в data URI для отображения в <img>.
 */
function normalizeLegend(value: unknown): LegendItem[] {
  const result: LegendItem[] = [];

  if (!Array.isArray(value)) {
    return result;
  }

  for (const layerLegend of value) {
    if (!isRecord(layerLegend)) continue;

    const items = layerLegend.legend;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (!isRecord(item)) continue;

      const symbol = isRecord(item.symbol) ? item.symbol : undefined;
      const format =
        typeof symbol?.format === "string" ? symbol.format : undefined;
      const data = typeof symbol?.data === "string" ? symbol.data : undefined;

      if (!format || !data) continue;

      const icon = `data:image/${format};base64,${data}`;
      const label = typeof item.name === "string" ? item.name : undefined;

      result.push({ icon, label });
    }
  }

  return result;
}

/**
 * Нормализует легенду из REST-ответа NGW.
 * Поддерживает три возможных формата:
 * 1) Массив объектов с legend: [] (тот же, что в SDK)
 * 2) Одиночный объект с legend: []
 * 3) Прямой массив объектов { symbol: { format, data }, name }
 *
 * Возвращает плоский массив LegendItem с data URI.
 */

// ──────────────────────────────────────────────────────────────────────────────
//  ОСНОВНОЙ КОМПОНЕНТ
// ──────────────────────────────────────────────────────────────────────────────

export default function MapClient({ section, resourceId }: MapClientProps) {
  // Состояние видимости сайдбара (открыт/закрыт)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Список слоёв карты для отображения в сайдбаре (с флагом активности)
  const [loadedLayers, setLoadedLayers] = useState<Layer[]>([]);

  // Список базовых карт для отображения в сайдбаре
  const [basemaps, setBasemaps] = useState<BasemapItem[]>([]);

  // ID активной базовой карты
  const [activeBasemapId, setActiveBasemapId] = useState<string | null>(null);

  // Результат идентификации: выбранный объект(ы) на карте
  const [selectedFeature, setSelectedFeature] = useState<IdentifyResult | null>(
    null,
  );

  // Координаты точки клика (для отображения в сайдбаре)
  const [clickedPoint, setClickedPoint] = useState<MapPoint | null>(null);

  // DOM-элемент контейнера карты
  const mapElement = useRef<HTMLDivElement | null>(null);

  // DOM-элемент строки координат (обновляется напрямую через textContent)
  const coordsElement = useRef<HTMLDivElement | null>(null);

  // Экземпляр NGW-карты
  const mapInstance = useRef<NgwMapInstance | null>(null);

  // Цели идентификации: конфигурация полей для каждого слоя
  const identifyTargetsRef = useRef<IdentifyTarget[]>([]);

  // Флаг: идёт ли инициализация карты (предотвращает повторный запуск)
  const initializingRef = useRef(false);

  // Дерево элементов веб-карты (нужно для получения имён слоёв)
  const webmapChildrenRef = useRef<WebMapItem[]>([]);

  // Реф для хранения массива идентифицированных объектов
  const objectsRef = useRef<IdentifyItem[]>([]);

  // Карта: overlayId → styleId. Нужна для REST-запроса легенды по styleId.
  const layerStyleIdsRef = useRef<Record<string, number>>({});

  // Сырые объекты базовых слоёв — нужны для передачи в showLayer()
  const baseLayersRef = useRef<BaseLayerEntry[]>([]);

  // ────────────────────────────────────────────────────────────────────────────
  //  ВЫДЕЛЕНИЕ ОБЪЕКТА НА КАРТЕ
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Добавляет (или обновляет) временный GeoJSON-слой «ident_layer»
   * с яркой подсветкой (пурпур, полупрозрачность, толстая обводка).
   * Если status === false — подгоняет камеру под границы слоя.
   *
   * @param data GeoJSON-объект (или массив) для отрисовки
   * @param status true = только отрисовать; false = отрисовать и приблизить
   */
  async function setSelected(
    data: GeoJSONFeature | GeoJSONFeature[],
    status: boolean,
  ) {
    const ngwMap = mapInstance.current;

    if (!ngwMap?.addGeoJsonLayer) {
      console.warn("У карты отсутствует addGeoJsonLayer");
      return;
    }

    // Удаляем предыдущий слой выделения, если был
    ngwMap.removeLayer("ident_layer");

    // Добавляем новый слой с пурпурной подсветкой
    await ngwMap.addGeoJsonLayer({
      data,
      id: "ident_layer",
      paint: () => ({
        color: "#FF00FF",
        opacity: 0.3,
        weight: 8,
      }),
    });

    // Если status === false — центрируем карту на выделенном объекте
    if (!status) {
      ngwMap.fitLayer?.("ident_layer");
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ОЧИСТКА ВЫДЕЛЕНИЯ
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Сбрасывает состояние выделения:
   * - удаляет временные слои (ident_layer, zoom_layer) с карты
   * - очищает выбранный объект и координаты клика
   * - обнуляет массив идентифицированных объектов
   */
  function handleClearFeature() {
    mapInstance.current?.removeLayer?.("ident_layer");
    mapInstance.current?.removeLayer?.("zoom_layer");

    setSelectedFeature(null);
    setClickedPoint(null);

    objectsRef.current = [];
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ СЛОЯ
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Включает/выключает видимость слоя на карте и обновляет состояние в сайдбаре.
   * После переключения вызывает invalidateSize, чтобы карта перерисовалась корректно.
   *
   * @param id — идентификатор слоя (overlayId в NGW)
   */
  async function handleLayerToggle(id: string) {
    const map = mapInstance.current;

    if (!map?.toggleLayer) {
      return;
    }

    // Текущее состояние видимости
    const currentVisible = map.isLayerVisible?.(id) ?? false;
    const nextVisible = !currentVisible;

    try {
      // Переключаем видимость на карте
      await map.toggleLayer(id, nextVisible);

      // Форсируем перерисовку карты
      map.invalidateSize?.();

      // Обновляем состояние слоёв для сайдбара
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

  // ────────────────────────────────────────────────────────────────────────────
  //  ПЕРЕКЛЮЧЕНИЕ БАЗОВОЙ КАРТЫ
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Переключает активную базовую карту.
   * Очищает выделение и вызывает showLayer для выбранной подложки.
   *
   * @param id — индекс базовой карты в baseLayersRef
   */
  function handleBasemapChange(id: string) {
    const map = mapInstance.current;
    if (!map?.showLayer) return;

    const idx = Number(id);
    const baseLayer = baseLayersRef.current[idx];

    if (!baseLayer) return;

    map.removeLayer?.("ident_layer");
    setSelectedFeature(null);

    map.showLayer(baseLayer);
    setActiveBasemapId(id);
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ЗАГРУЗКА ЛЕГЕНДЫ
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Загружает легенду для указанного слоя.
   *
   * Стратегия из двух шагов:
   * 1) Сначала пробует SDK: layer.getLegend(). Если метод есть и возвращает
   *    непустой результат — нормализует его через normalizeLegend.
   * 2) Если SDK не сработал (нет метода, пустой ответ, ошибка) — фолбэк на REST:
   *    GET /api/resource/{styleId}/legend.
   *    NGW может отдать PNG или SVG — конвертируем blob в data URI через FileReader.
   *    Если ответ не картинка — легенда недоступна, возвращаем пустой массив.
   *
   * @param layerId — идентификатор слоя на карте (overlayId)
   * @returns массив LegendItem (icon = data URI, label = подпись)
   */
  async function fetchLegend(layerId: string): Promise<LegendItem[]> {
    const map = mapInstance.current;
    if (!map) return [];

    // ── Шаг 1: пробуем SDK getLegend() ──
    try {
      const layer = map.getLayer?.(layerId);

      if (layer?.getLegend) {
        const raw = await layer.getLegend();
        const legend = normalizeLegend(raw);

        if (legend.length > 0) return legend;
      }
    } catch (error) {
      // SDK не сработал — переходим к REST-фолбэку
      console.warn(`SDK getLegend() не сработал для ${layerId}:`, error);
    }

    // ── Шаг 2: REST-фолбэк ──
    const baseUrl = process.env.NEXT_PUBLIC_NGW_BASE_URL;
    if (!baseUrl) return [];

    // Получаем styleId, сохранённый при инициализации карты
    const styleId = layerStyleIdsRef.current[layerId];

    if (!styleId || !Number.isFinite(styleId)) {
      return [];
    }

    try {
      const legendUrl = `${baseUrl}/api/resource/${styleId}/legend`;

      const response = await fetch(legendUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        console.warn(
          `Legend endpoint не вернул OK (${response.status}): ${legendUrl}`,
        );
        return [];
      }

      const contentType = response.headers.get("content-type") || "";

      // NGW может отдавать PNG или SVG; если это не изображение — выходим
      if (
        !contentType.startsWith("image/png") &&
        !contentType.startsWith("image/svg+xml")
      ) {
        console.warn("Legend response — не изображение:", contentType);
        return [];
      }

      // Конвертируем blob в data URI для вставки в <img>
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<LegendItem[]>((resolve, reject) => {
        reader.onload = () => {
          const dataUri = reader.result as string;

          // Имя слоя берём из дерева веб-карты по layerId
          const item = webmapChildrenRef.current.find(
            (i) => i.id?.toString() === layerId,
          );
          const label = item?.display_name ?? `Слой ${layerId}`;

          resolve([{ icon: dataUri, label }]);
        };

        reader.onerror = () =>
          reject(new Error("Не удалось прочитать изображение легенды"));

        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`REST legend error для ${layerId}:`, error);
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ИНИЦИАЛИЗАЦИЯ КАРТЫ (useEffect)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Основной эффект: создаёт экземпляр NGW-карты при монтировании компонента
   * (или при изменении resourceId). Выполняет:
   *
   * 1. Динамический импорт @nextgis/ngw-leaflet.
   * 2. Создание карты с указанным ресурсом веб-карты.
   * 3. Загрузку дерева веб-карты и сбор всех слоёв.
   * 4. Сохранение styleId для каждого слоя (нужен для REST-запроса легенды).
   * 5. Подготовку целей идентификации (loadIdentifyTargets).
   * 6. Подписку на события мыши (mousemove, mouseout, click)
   *    и события NGW (ngw:select, click).
   * 7. Очистку всего при размонтировании: снятие слушателей, удаление карты,
   *    сброс рефов и состояния.
   *
   * Переменные cancelled и initializingRef предотвращают гонки состояний
   * при быстром переключении resourceId.
   */
  useEffect(() => {
    let cancelled = false;

    // Локальные ссылки на обработчики, чтобы можно было отписаться в cleanup
    let leafletMap: LeafletMapLike | undefined;
    let onMouseMove: ((event: LeafletMouseEventLike) => void) | undefined;
    let onMouseOut: (() => void) | undefined;
    let onClick: ((event: LeafletMouseEventLike) => void) | undefined;
    let onNgwSelect: ((e: unknown) => void) | undefined;
    let onEmitterClick: (() => void) | undefined;

    async function init() {
      // Предотвращаем повторный запуск, если предыдущая инициализация ещё идёт
      if (initializingRef.current) {
        return;
      }
      initializingRef.current = true;

      const target = mapElement.current;
      const baseUrl = process.env.NEXT_PUBLIC_NGW_BASE_URL;

      // Проверяем, что все необходимые параметры на месте
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
        // Если карта уже существует — уничтожаем её перед созданием новой
        if (mapInstance.current) {
          mapInstance.current.remove?.();
          mapInstance.current.destroy?.();
          mapInstance.current = null;
        }

        // Очищаем DOM-контейнер
        target.replaceChildren();

        // Динамический импорт NGW-Leaflet (чтобы не тащить в SSR)
        const ngwModule = await import("@nextgis/ngw-leaflet");
        const NgwMap = ngwModule.default;

        if (cancelled || !mapElement.current) {
          return;
        }

        // Создаём экземпляр карты с указанным ресурсом веб-карты
        const map = (await NgwMap.create({
          baseUrl,
          target: mapElement.current,
          resources: [
            {
              resource: resourceId,
              useBasemap: true, // загружать базовые карты из конфига веб-карты
              fit: true, // подогнать камеру под границы веб-карты
              selectable: true, // включить выбор объектов кликом
            },
          ],
          pixelRadius: IDENTIFY_PIXEL_RADIUS,
        } as unknown as Record<string, unknown>)) as unknown as NgwMapInstance;

        if (cancelled) {
          map.remove?.();
          map.destroy?.();
          return;
        }

        mapInstance.current = map;

        // Ждём полной загрузки карты (тайлы, слои)
        await map.onLoad?.();

        if (cancelled) {
          return;
        }

        // Базовая настройка карты
        map.setCursor?.("default");
        map.enableSelection?.();

        // Получаем низкоуровневый экземпляр Leaflet-карты для подписки на события мыши
        leafletMap = map.mapAdapter?.map;

        if (!leafletMap) {
          throw new Error("Leaflet-карта не найдена");
        }

        // Удаляем атрибуцию Leaflet (если не нужна)
        leafletMap.attributionControl?.remove();

        // ── Сбор базовых карт ──
        const baseLayersRaw = map.getBaseLayers?.() ?? [];
        baseLayersRef.current = baseLayersRaw;

        const basemapsList: BasemapItem[] = baseLayersRaw.map((bl, index) => ({
          id: String(index),
          name: bl?.options?.name ?? `Базовая карта ${index + 1}`,
        }));

        if (!cancelled) {
          setBasemaps(basemapsList);

          // Определяем активную карту по visibility
          const activeIdx = baseLayersRaw.findIndex(
            (bl) => bl?.options?.visibility === true,
          );
          setActiveBasemapId(
            activeIdx >= 0 ? String(activeIdx) : (basemapsList[0]?.id ?? null),
          );
        }

        // ── Сбор всех слоёв карты ──

        const layerIds = map.getLayers?.() ?? [];

        // Оверлейные слои — всё, что не базовые подложки (их ID начинается с "webmap-baselayer")
        const overlayIds = layerIds.filter(
          (id) => !id.startsWith("webmap-baselayer"),
        );

        // Запрашиваем дерево веб-карты через REST API, чтобы получить имена слоёв
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

        // Корневой элемент дерева веб-карты
        const rootItem = resourceData.webmap?.root_item;
        const items: WebMapItem[] = rootItem?.children ?? [];

        webmapChildrenRef.current = items;

        // Рекурсивно собираем все слои (включая вложенные группы)
        const layerItems = getLayerItems(items);

        // Сопоставляем overlayId с элементом дерева веб-карты по индексу
        const layerMap = new Map(
          layerItems.map((item, index) => {
            const overlayId = overlayIds[index];

            if (!overlayId) {
              return [null, item] as const;
            }

            return [overlayId, item] as const;
          }),
        );

        // Формируем массив слоёв для сайдбара
        const allLayers: Layer[] = overlayIds
          .map((id) => {
            const item = layerMap.get(id);

            if (!item) {
              return null;
            }

            return {
              id,
              name: item.display_name?.trim() || id,
              active: map.isLayerVisible?.(id) ?? item.layer_enabled ?? true,
            };
          })
          .filter((layer): layer is Layer => layer !== null);

        // Оставляем только слои, в имени которых есть хотя бы одна буква
        // (отфильтровываем технические слои без человекочитаемого названия)
        const nextLayers = allLayers.filter((layer) =>
          /\p{L}/u.test(layer.name),
        );

        if (!cancelled) {
          setLoadedLayers(nextLayers);
        }

        // ── Сохранение styleId для каждого overlay-слоя ──
        // styleId нужен для REST-запроса легенды (fetchLegend, шаг 2)
        const styleIdsMap: Record<string, number> = {};

        overlayIds.forEach((id, index) => {
          const item = layerItems[index];

          if (!item) {
            return;
          }

          const raw = item as unknown as Record<string, unknown>;

          const styleId = Number(raw.layer_style_id);

          if (Number.isFinite(styleId)) {
            styleIdsMap[id] = styleId;
          }
        });

        layerStyleIdsRef.current = styleIdsMap;

        // ── Подготовка целей идентификации ──
        // Собираем только слои с layer_identifiable !== false и валидным styleId
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

          // Слой явно помечен как неидентифицируемый — пропускаем
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

        // Загружаем конфигурацию полей для каждого идентифицируемого слоя
        const targets = await loadIdentifyTargets(baseUrl, identifyEntries);

        if (!cancelled) {
          identifyTargetsRef.current = targets;
        }

        // ──────────────────────────────────────────────────────────────────────
        //  ОБРАБОТЧИКИ СОБЫТИЙ МЫШИ (LEAFLET)
        // ──────────────────────────────────────────────────────────────────────

        // При движении мыши — обновляем строку координат (прямо через DOM, без re-render)
        onMouseMove = (event: LeafletMouseEventLike) => {
          if (coordsElement.current) {
            coordsElement.current.textContent = formatPoint(
              normalizePoint(event.latlng),
            );
          }
        };

        // При уходе мыши с карты — сбрасываем строку координат
        onMouseOut = () => {
          if (coordsElement.current) {
            coordsElement.current.textContent = "—";
          }
        };

        // При клике по карте — запоминаем точку клика и открываем сайдбар
        onClick = (event: LeafletMouseEventLike) => {
          const point = normalizePoint(event.latlng);

          setClickedPoint(point);
          setSelectedFeature(null);
          setIsSidebarOpen(true);
        };

        leafletMap.on("mousemove", onMouseMove);
        leafletMap.on("mouseout", onMouseOut);
        leafletMap.on("click", onClick);

        // ──────────────────────────────────────────────────────────────────────
        //  ОБРАБОТЧИКИ СОБЫТИЙ NGW (EMITTER)
        // ──────────────────────────────────────────────────────────────────────

        // При клике по карте (через emitter NGW) — удаляем слой выделения
        onEmitterClick = () => {
          mapInstance.current?.removeLayer?.("ident_layer");
        };

        map.emitter?.on?.("click", onEmitterClick as (value: unknown) => void);

        // Основной обработчик выбора объекта (ngw:select).
        // Срабатывает, когда пользователь кликает по объекту на идентифицируемом слое.
        onNgwSelect = async (e: unknown) => {
          const selectEvent = e as NgwSelectEvent;

          if (!selectEvent?.getIdentifyItems) {
            return;
          }

          const rawItems = selectEvent.getIdentifyItems();

          // Нет объектов — очищаем выделение
          if (!Array.isArray(rawItems) || rawItems.length === 0) {
            mapInstance.current?.removeLayer?.("ident_layer");

            setSelectedFeature(null);
            objectsRef.current = [];

            return;
          }

          const items: IdentifyItem[] = [];

          // Обрабатываем каждый найденный объект
          for (const rawItem of rawItems) {
            const ngwItem = rawItem as NgwIdentifyItem;

            // geojson() — асинхронный метод SDK, возвращает геометрию объекта
            if (!ngwItem || typeof ngwItem.geojson !== "function") {
              continue;
            }

            // Ищем конфигурацию полей для этого слоя
            const target = identifyTargetsRef.current.find(
              (item) => item.vectorLayerId === ngwItem.layerId,
            );

            let feature: GeoJSONFeature | null = null;

            try {
              feature = await ngwItem.geojson();
            } catch (error) {
              console.warn("Не удалось получить geojson для объекта:", error);
              continue;
            }

            if (!feature) {
              continue;
            }

            // Строим элемент идентификации с применением правил отображения полей
            const item = buildIdentifyItem(feature, target, {
              id: ngwItem.id,
              label: ngwItem.label,
              layerId: ngwItem.layerId,
            });

            items.push(item);
          }

          if (cancelled) {
            return;
          }

          // Нет валидных объектов — очищаем выделение
          if (items.length === 0) {
            mapInstance.current?.removeLayer?.("ident_layer");

            setSelectedFeature(null);
            objectsRef.current = [];

            return;
          }

          // Сохраняем результат и открываем сайдбар
          const result: IdentifyResult = {
            items,
            raw: rawItems,
          };

          setSelectedFeature(result);
          setIsSidebarOpen(true);
          objectsRef.current = items;

          // Подсвечиваем первый объект на карте
          const firstItem = items[0];

          if (firstItem.feature) {
            await setSelected(firstItem.feature as GeoJSONFeature, true);
          }
        };

        map.emitter?.on?.("ngw:select", onNgwSelect);
      } catch (error) {
        if (!cancelled) {
          console.error("Ошибка инициализации карты:", error);
        }
      } finally {
        initializingRef.current = false;
      }
    }

    void init();

    // ──────────────────────────────────────────────────────────────────────────
    //  CLEANUP (размонтирование или смена resourceId)
    // ──────────────────────────────────────────────────────────────────────────
    return () => {
      cancelled = true;

      // Снимаем слушатели событий мыши с Leaflet-карты
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

      const map = mapInstance.current;

      // Снимаем слушатели событий NGW emitter
      if (map?.emitter) {
        if (onEmitterClick) {
          map.emitter.off?.(
            "click",
            onEmitterClick as (value: unknown) => void,
          );
        }

        if (onNgwSelect) {
          map.emitter.off?.("ngw:select", onNgwSelect);
        }
      }

      // Удаляем временные слои выделения и зума
      map?.removeLayer?.("ident_layer");
      map?.removeLayer?.("zoom_layer");

      // Уничтожаем экземпляр карты
      map?.remove?.();
      map?.destroy?.();

      mapInstance.current = null;

      // Очищаем DOM-контейнер
      mapElement.current?.replaceChildren();

      // Сбрасываем все рефы
      identifyTargetsRef.current = [];
      initializingRef.current = false;
      layerStyleIdsRef.current = {};
      baseLayersRef.current = [];

      // Сбрасываем состояние компонента
      setLoadedLayers([]);
      setBasemaps([]);
      setActiveBasemapId(null);
      setSelectedFeature(null);
      setClickedPoint(null);

      objectsRef.current = [];
    };
  }, [resourceId]);

  // ────────────────────────────────────────────────────────────────────────────
  //  РЕНДЕР
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Шапка с кнопкой переключения сайдбара */}
      <Header
        section={section}
        onToggleSidebar={() => setIsSidebarOpen((previous) => !previous)}
      />

      {/* Сайдбар: слои, легенда, карточка объекта, координаты клика, базовые карты */}
      <Sidebar
        isOpen={isSidebarOpen}
        layers={loadedLayers}
        basemaps={basemaps}
        activeBasemapId={activeBasemapId}
        onBasemapChange={handleBasemapChange}
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
        fetchLegend={fetchLegend}
      />

      {/* Основная область с картой */}
      <main className="relative min-h-0 flex-1">
        {/* Контейнер карты — заполняет всё доступное пространство */}
        <div ref={mapElement} className="h-full w-full" />

        {/* Строка координат: обновляется напрямую через ref (без re-render) */}
        {/* Позиционируется в правом нижнем углу, отступ зависит от состояния сайдбара */}
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
