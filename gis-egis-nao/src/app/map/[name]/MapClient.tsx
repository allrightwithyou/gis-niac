"use client";

import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Sidebar, {
  type LegendItem,
  type BasemapItem,
} from "../components/Sidebar";
import {
  EcomonPanel,
  type EcomonApi,
  type EcomonFeature,
} from "../components/EcomonPanel";
import {
  CoordInputPanel,
  CoordPickerPanel,
  SelectToolPanel,
  type SelectOption,
} from "../components/MapToolPanels";

// Стили адаптера Leaflet — без них карта и тайлы отрисуются некорректно
import "@nextgis/leaflet-map-adapter/lib/leaflet-map-adapter.css";
// Стили плагина измерений (JS плагина подгружается динамически, только если он нужен)
import "leaflet-measure/dist/leaflet-measure.css";

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
  addControl?: (control: unknown) => void;
  removeControl?: (control: unknown) => void;
}

/** Глобальный объект Leaflet (плагин leaflet-measure регистрирует себя в L.control). */
interface LeafletGlobal {
  control?: {
    measure?: (options: Record<string, unknown>) => unknown;
  };
}

/** Опции кнопки-переключателя, создаваемой через NgwMap.createToggleControl. */
interface ToggleControlOptions {
  getStatus?: () => boolean;
  onClick: (status: boolean) => void;
  html: string;
  title: string;
  addClassOn: string;
  addClassOff: string;
}

interface ToggleControlLike {
  changeStatus?: (status: boolean) => void;
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
  paint?: () => Record<string, unknown>;
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
  connector?: {
    get: (
      name: string,
      options: unknown,
      params: Record<string, unknown>,
    ) => Promise<unknown>;
  };
  createToggleControl?: (options: ToggleControlOptions) => unknown;
  addControl?: (
    control: unknown,
    position: string,
  ) => Promise<ToggleControlLike | undefined>;
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
//  ИНСТРУМЕНТЫ КАРТЫ: КОНФИГУРАЦИЯ
// ──────────────────────────────────────────────────────────────────────────────

/** Инструменты с панелью (кнопка-переключатель + React-панель). */
type PanelToolId =
  | "fishTool"
  | "settlTool"
  | "zsoTool"
  | "ccfTool"
  | "ecomonTool"
  | "coordTool"
  | "coordFromMapTool";

/** Все инструменты: панельные + измерение (готовый контрол Leaflet). */
export type ToolId = PanelToolId | "measureTool";

/**
 * КАКИЕ ИНСТРУМЕНТЫ ПОКАЗЫВАТЬ НА КАКИХ КАРТАХ.
 * Ключ — resourceId веб-карты в NextGIS, значение — список инструментов.
 * Для карт, которых здесь нет, инструменты не появляются.
 */
const MAP_TOOLS: Record<number, ToolId[]> = {
  // Пример (подставьте свои ID):
 490: ["fishTool", "settlTool", "zsoTool", "ccfTool","coordFromMapTool","coordTool","ecomonTool","measureTool"],
  262: ["fishTool", "settlTool", "zsoTool", "ccfTool","coordFromMapTool","coordTool","ecomonTool","measureTool"],
};

/** Угол карты для кнопок инструментов (NgwMap и Leaflet называют углы по-разному). */
const TOOLS_NGW_POSITION = "top-left";
const TOOLS_LEAFLET_POSITION = "topleft";

const TOOL_META: Record<PanelToolId, { title: string; icon: string }> = {
  fishTool: { title: "Рыболовные участки", icon: "🐟" },
  settlTool: { title: "Населённые пункты", icon: "🏘️" },
  zsoTool: { title: "Зоны санитарной охраны", icon: "🛡️" },
  ccfTool: { title: "Объекты капитального строительства", icon: "🏢" },
  ecomonTool: { title: "Экологический мониторинг", icon: "🌿" },
  coordTool: { title: "Добавить объекты по координатам", icon: "🧭" },
  coordFromMapTool: { title: "Получение координат по клику", icon: "📌" },
};

/** Объект слоя NGW в виде GeoJSON (id нужен для выбора из списка). */
/** Строка таблицы атрибутов слоя (ответ feature_layer.feature.collection). */
interface ToolRow {
  id: number;
  fields: Record<string, unknown>;
}

interface ToolFeature extends GeoJSONFeature {
  id?: string | number;
}

/**
 * Описание инструмента «выбрать объект из списка слоя».
 * Четыре таких инструмента отличаются только слоем, подписью и действием,
 * поэтому реализованы одним общим кодом.
 */
interface SelectToolConfig {
  /** display_name слоя в дереве веб-карты */
  layerName: string;
  placeholder: string;
  getLabel: (props: Record<string, unknown>) => string;
  /** Объекты с одинаковым ключом попадают в один пункт списка (и сортируются по нему) */
  groupKey?: (props: Record<string, unknown>) => string;
  /** identify — показать карточку в сайдбаре и подсветить; zoom — только приблизить */
  action: "identify" | "zoom";
}

/** «дд.мм.гггг» → «гггг/мм/дд» (для сортировки по дате). */
function toSortableDate(value: unknown): string {
  const [day, month, year] = String(value ?? "").split(".");
  return year && month && day ? `${year}/${month}/${day}` : String(value ?? "");
}

const SELECT_TOOLS: Partial<Record<PanelToolId, SelectToolConfig>> = {
  fishTool: {
    layerName: "Рыболовные участки",
    placeholder: "Выберите участок",
    getLabel: (p) => String(p.name ?? ""),
    action: "identify",
  },
  settlTool: {
    layerName: "Населённые пункты",
    placeholder: "Выберите нас.пункт",
    getLabel: (p) => String(p.Name ?? ""),
    action: "zoom",
  },
  zsoTool: {
    layerName: "Зоны санитарной охраны",
    placeholder: "Выберите распоряж.",
    getLabel: (p) =>
      p.order_number !== "-"
        ? `№ ${p.order_number} от ${p.order_date}`
        : "Отсутствуют данные",
    groupKey: (p) => `${toSortableDate(p.order_date)}${p.order_number}`,
    action: "identify",
  },
  ccfTool: {
    layerName: "Объекты капитального строительства",
    placeholder: "Выберите объект",
    getLabel: (p) => String(p.Name ?? ""),
    groupKey: (p) => String(p.Name ?? ""),
    action: "identify",
  },
};

/** Собирает пункты выпадающего списка: группирует по groupKey и сортирует. */
function buildSelectOptions(
  config: SelectToolConfig,
  rows: ToolRow[],
): SelectOption[] {
  const groups = new Map<
    string,
    { label: string; sortKey: string; ids: number[] }
  >();

  for (const row of rows) {
    const props = isRecord(row.fields) ? row.fields : {};
    const label = config.getLabel(props);
    const key = config.groupKey?.(props) ?? String(row.id);
    const group = groups.get(key);

    if (group) {
      group.ids.push(row.id);
    } else {
      groups.set(key, {
        label,
        sortKey: config.groupKey ? key : label,
        ids: [row.id],
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, "ru"))
    .map((group) => ({ value: group.ids.join(","), label: group.label }));
}

// ──────────────────────────────────────────────────────────────────────────────
//  ИНСТРУМЕНТЫ КАРТЫ: КООРДИНАТЫ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Разбирает текст с координатами, по одной точке в строке («широта долгота»).
 * Понимает: десятичные градусы (69.5 33.2 или 69,5 33,2),
 * градусы+минуты (69 30 33 12), ГМС (69°02′30″ 33°05′00″) и буквы полушарий (S/Ю, W/З).
 * Если широта явно вне диапазона, а долгота подходит — меняет их местами.
 */
function parseCoordinates(text: string): MapPoint[] {
  const result: MapPoint[] = [];

  for (const line of text.split(/\r?\n/)) {
    const tokens = line.match(/-?\d+(?:[.,]\d+)?/g);
    if (!tokens) continue;

    const values = tokens.map((token) => Number(token.replace(",", ".")));

    // Градусы[, минуты[, секунды]] → десятичные градусы; знак берётся только у градусов
    const toDegrees = (from: number, count: number): number => {
      const [d = 0, m = 0, s = 0] = values
        .slice(from, from + count)
        .map((value) => Math.abs(value));
      const value = d + m / 60 + s / 3600;
      return tokens[from].startsWith("-") ? -value : value;
    };

    let lat: number;
    let lng: number;

    if (values.length === 2) {
      [lat, lng] = values;
    } else if (values.length === 4) {
      lat = toDegrees(0, 2);
      lng = toDegrees(2, 2);
    } else if (values.length === 6) {
      lat = toDegrees(0, 3);
      lng = toDegrees(3, 3);
    } else {
      continue;
    }

    if (/[SЮ]/i.test(line)) lat = -Math.abs(lat);
    if (/[WЗ]/i.test(line)) lng = -Math.abs(lng);

    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
      [lat, lng] = [lng, lat];
    }

    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      result.push({ lat, lng });
    }
  }

  return result;
}

function toPointFeature(point: MapPoint): GeoJSONFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [point.lng, point.lat] },
    properties: {},
  };
}

/** Стиль точек: круг с чёрной обводкой. */
function pointPaint(color: string, radius = 5): Record<string, unknown> {
  return {
    type: "circle",
    radius,
    color,
    fillOpacity: 0.5,
    strokeColor: "#000000",
    weight: 2,
    fill: true,
  };
}

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

  // ── Инструменты карты ──

  // Активный панельный инструмент (одновременно работает только один)
  const [activeTool, setActiveTool] = useState<PanelToolId | null>(null);
  const activeToolRef = useRef<PanelToolId | null>(null);

  // Кнопки-переключатели: нужны, чтобы гасить неактивные при смене инструмента
  const toolControlsRef = useRef<Partial<Record<PanelToolId, ToggleControlLike>>>(
    {},
  );

  // Идёт ли измерение (leaflet-measure): на это время клики не должны открывать сайдбар
  const measuringRef = useRef(false);

  // Инструменты «выбор из списка»: пункты списка, загрузка, кэш объектов по слою
  const [selectOptions, setSelectOptions] = useState<SelectOption[]>([]);
  const [selectLoading, setSelectLoading] = useState(false);
  const selectLayerIdRef = useRef<number | null>(null);
  const toolRowsRef = useRef<Record<number, ToolRow[]>>({});
  const [selectMessage, setSelectMessage] = useState<string | null>(null);

  // Инструмент «добавить по координатам»: id созданных слоёв и счётчик
  const coordLayerIdsRef = useRef<string[]>([]);
  const coordCounterRef = useRef(0);

  // Инструмент «координаты по клику»: накопленные точки
  const [pickedPoints, setPickedPoints] = useState<MapPoint[]>([]);

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
  //  ИНСТРУМЕНТЫ КАРТЫ: ВЫБОР ОБЪЕКТА ИЗ СПИСКА
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Находит ID векторного слоя по названию слоя в веб-карте.
   * Сначала ищет среди уже подготовленных целей идентификации; если слой
   * не идентифицируемый — подготавливает его так же, как при инициализации.
   */
  async function resolveVectorLayerCandidates(
    layerName: string,
  ): Promise<Array<{ source: string; id: number }>> {
    const norm = (value?: string) => (value ?? "").trim().toLowerCase();
    const result: Array<{ source: string; id: number }> = [];

    const add = (source: string, id: number) => {
      if (Number.isFinite(id) && id > 0 && !result.some((c) => c.id === id)) {
        result.push({ source, id });
      }
    };

    // 1) Как в оригинале: дерево веб-карты из SDK — getLayer(<слой веб-карты>).layer.item.children,
    //    у элемента с нужным display_name берём style_parent_id (ID векторного слоя).
    const map = mapInstance.current;

    interface SdkTreeItem {
      display_name?: string;
      style_parent_id?: number;
      children?: SdkTreeItem[];
    }

    const findInTree = (items: SdkTreeItem[]): SdkTreeItem | undefined => {
      for (const item of items) {
        if (norm(item.display_name) === norm(layerName) && item.style_parent_id) {
          return item;
        }
        const nested = item.children ? findInTree(item.children) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };

    // Имени слоя веб-карты (webMapName) в новом коде нет — перебираем слои карты
    // и берём тот, у которого есть layer.item.children
    const sdkCandidates = [String(resourceId), ...(map?.getLayers?.() ?? [])];

    for (const candidate of sdkCandidates) {
      try {
        const adapter = map?.getLayer?.(candidate) as unknown as
          | { layer?: { item?: { children?: SdkTreeItem[] } } }
          | undefined;
        const children = adapter?.layer?.item?.children;

        if (Array.isArray(children)) {
          const found = findInTree(children);
          if (found?.style_parent_id) {
            add("дерево SDK", Number(found.style_parent_id));
            break;
          }
        }
      } catch {
        // слой с таким id недоступен — пробуем следующий
      }
    }

    // 2) Цели идентификации (родитель стиля слоя, получен при инициализации карты)
    const known = identifyTargetsRef.current.find(
      (t) => norm(t.name) === norm(layerName),
    );
    if (known) add("цель идентификации", known.vectorLayerId);

    // 3) Стиль слоя из дерева веб-карты (REST)
    const layerItems = getLayerItems(webmapChildrenRef.current);
    const item = layerItems.find((i) => norm(i.display_name) === norm(layerName));

    if (!item) {
      console.warn(
        `Слой «${layerName}» не найден в веб-карте. Есть слои:`,
        layerItems.map((i) => i.display_name),
      );
    } else if (!known) {
      const baseUrl = process.env.NEXT_PUBLIC_NGW_BASE_URL;
      const styleId = Number(
        (item as unknown as Record<string, unknown>).layer_style_id,
      );

      if (baseUrl && Number.isFinite(styleId)) {
        const [target] = await loadIdentifyTargets(baseUrl, [
          { mapLayerId: "", styleId, name: layerName },
        ]);

        if (target) {
          identifyTargetsRef.current.push(target);
          add("стиль слоя", target.vectorLayerId);
        }
      }
    }

    return result;
  }

  /** Первый подходящий ID векторного слоя (для экомониторинга). */
  async function resolveVectorLayerId(layerName: string): Promise<number | null> {
    const candidates = await resolveVectorLayerCandidates(layerName);
    return candidates[0]?.id ?? null;
  }

  /**
   * Запрашивает объекты слоя NGW через ngw-kit (GeoJSON-фичи: id, geometry, properties).
   * fields ограничивает набор полей, filters — фильтр вида [поле, оператор, значение].
   */
  async function fetchLayerFeatures(
    layerId: number,
    options: {
      fields?: string[];
      filters?: Array<[string, string, unknown]>;
    } = {},
  ): Promise<ToolFeature[]> {
    const connector = mapInstance.current?.connector;
    if (!connector) return [];

    const kit = (await import("@nextgis/ngw-kit")) as unknown as {
      fetchNgwLayerFeatures: (
        options: Record<string, unknown>,
      ) => Promise<ToolFeature[]>;
    };

    return kit.fetchNgwLayerFeatures({
      connector,
      resourceId: layerId,
      ...options,
    });
  }

  /**
   * Таблица атрибутов слоя для списка (id + поля) — тот же запрос, что в прежней версии:
   * feature_layer.feature.collection. Кэшируется по слою.
   */
  async function loadToolRows(layerId: number): Promise<ToolRow[]> {
    const cached = toolRowsRef.current[layerId];
    if (cached) return cached;

    const connector = mapInstance.current?.connector;
    if (!connector) throw new Error("У карты нет connector");

    // Тот же запрос, что в оригинале
    const response = await connector.get("feature_layer.feature.collection", null, {
      id: layerId,
    });

    const rows = (Array.isArray(response) ? response : [])
      .filter(isRecord)
      .map((row) => ({
        id: Number(row.id),
        fields: isRecord(row.fields) ? row.fields : {},
      }))
      .filter((row) => Number.isFinite(row.id));

    toolRowsRef.current[layerId] = rows;
    return rows;
  }

  /** Приближает карту к объектам во временном слое zoom_layer (без карточки в сайдбаре). */
  async function zoomToFeatures(features: GeoJSONFeature[]) {
    const map = mapInstance.current;
    if (!map) return;

    handleClearFeature();

    await map.addGeoJsonLayer({
      data: features,
      id: "zoom_layer",
      paint: () => ({ color: "#FF8800", opacity: 0.3, weight: 4 }),
    });
    map.fitLayer("zoom_layer", { maxZoom: 14 });
  }

  /**
   * Пользователь выбрал пункт в списке: запрашиваем объекты (с геометрией) по id,
   * затем либо показываем карточку + подсветку + приближение, либо только приближаем.
   */
  async function handleSelectToolChange(
    config: SelectToolConfig,
    value: string,
  ) {
    const layerId = selectLayerIdRef.current;
    if (layerId === null) return;

    try {
      const fetched = await fetchLayerFeatures(layerId, {
        // Как в оригинале: одиночный объект — eq, группа объектов (ЗСО, ОКС) — in
        filters: config.groupKey
          ? [["id", "in", value.split(",")]]
          : [["id", "eq", value]],
      });

      // Приводим к чистому GeoJSON Feature: геометрия + свойства
      const features: ToolFeature[] = fetched
        .filter((feature) => feature?.geometry)
        .map((feature) => ({
          type: "Feature",
          id: feature.id,
          geometry: feature.geometry,
          properties: isRecord(feature.properties) ? feature.properties : {},
        }));

      if (features.length === 0) {
        console.warn("По выбранному пункту не найдено объектов с геометрией", {
          layerId,
          value,
          fetched,
        });
        return;
      }

      if (config.action === "zoom") {
        await zoomToFeatures(features);
        return;
      }

      const target = identifyTargetsRef.current.find(
        (t) => t.vectorLayerId === layerId,
      );

      const items = features.map((feature) =>
        buildIdentifyItem(feature, target, {
          id: feature.id,
          label: config.getLabel(feature.properties),
          layerId,
        }),
      );

      setSelectedFeature({ items, raw: features });
      setIsSidebarOpen(true);
      objectsRef.current = items;

      // false → после отрисовки подсветки карта приближается к объектам
      await setSelected(features, false);
    } catch (error) {
      console.error("Не удалось показать выбранный объект:", error);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ИНСТРУМЕНТЫ КАРТЫ: ЭКОЛОГИЧЕСКИЙ МОНИТОРИНГ
  // ────────────────────────────────────────────────────────────────────────────

  /** Подписи полей слоя: keyname → display_name (REST, как в loadIdentifyTargets). */
  async function fetchFieldNames(
    layerId: number,
  ): Promise<Record<string, string>> {
    const baseUrl = process.env.NEXT_PUBLIC_NGW_BASE_URL;
    if (!baseUrl) return {};

    const data = await fetchJson(`${baseUrl}/api/resource/${layerId}`);
    const fields = isRecord(data.feature_layer) ? data.feature_layer.fields : null;
    const result: Record<string, string> = {};

    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (isRecord(field) && typeof field.keyname === "string") {
          result[field.keyname] =
            typeof field.display_name === "string" && field.display_name
              ? field.display_name
              : field.keyname;
        }
      }
    }

    return result;
  }

  /** Подсвечивает выбранные точки мониторинга во временном слое light_object и приближает карту. */
  async function ecomonShowPoints(features: EcomonFeature[], color: string) {
    const map = mapInstance.current;
    if (!map) return;

    map.removeLayer("light_object");

    const data = features
      .filter((feature) => feature.geometry)
      .map((feature) => ({
        type: "Feature" as const,
        geometry: feature.geometry,
        properties: {},
      }));

    if (data.length === 0) return;

    await map.addGeoJsonLayer({
      data,
      id: "light_object",
      paint: () => pointPaint(color, 8),
    });
    map.fitLayer("light_object", { maxZoom: 12 });
  }

  const ecomonApi: EcomonApi = {
    fetchFeatures: fetchLayerFeatures,
    fetchFieldNames,
    resolveLayerId: resolveVectorLayerId,
    showPoints: ecomonShowPoints,
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  ИНСТРУМЕНТЫ КАРТЫ: ДОБАВЛЕНИЕ ОБЪЕКТОВ ПО КООРДИНАТАМ
  // ────────────────────────────────────────────────────────────────────────────

  /** Удаляет с карты все слои, созданные инструментом «по координатам». */
  function clearCoordLayers() {
    for (const id of coordLayerIdsRef.current) {
      mapInstance.current?.removeLayer(id);
    }
    coordLayerIdsRef.current = [];
  }

  /**
   * Рисует точки / линию / полигон по координатам из текста.
   * Для линии и полигона дополнительно рисуются вершины (как в прежней версии).
   * Возвращает текст ошибки или null.
   */
  async function handleCoordDraw(
    kind: "points" | "lines" | "polygons",
    text: string,
    color: string,
  ): Promise<string | null> {
    const map = mapInstance.current;
    if (!map) return "Карта ещё не готова";

    const points = parseCoordinates(text);
    const minPoints = kind === "points" ? 1 : kind === "lines" ? 2 : 3;

    if (points.length < minPoints) {
      return `Не найдено корректных координат (нужно минимум ${minPoints})`;
    }

    const coordinates = points.map((p) => [p.lng, p.lat]);
    const n = ++coordCounterRef.current;

    async function addLayer(
      suffix: string,
      data: GeoJSONFeature | GeoJSONFeature[],
      paint: Record<string, unknown>,
    ) {
      const id = `coord_layer_${n}_${suffix}`;
      await map!.addGeoJsonLayer({ data, id, paint: () => paint });
      coordLayerIdsRef.current.push(id);
      return id;
    }

    let fitId: string;

    if (kind === "lines") {
      fitId = await addLayer(
        "line",
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates },
          properties: {},
        },
        { color, weight: 3, opacity: 1 },
      );
    } else if (kind === "polygons") {
      fitId = await addLayer(
        "polygon",
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[...coordinates, coordinates[0]]] },
          properties: {},
        },
        {
          color,
          strokeColor: "#000000",
          fillOpacity: 0.5,
          weight: 2,
          fill: true,
        },
      );
    } else {
      fitId = "";
    }

    const pointsId = await addLayer(
      "points",
      points.map(toPointFeature),
      pointPaint(color),
    );

    map.fitLayer(fitId || pointsId, { maxZoom: 16 });
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ИНСТРУМЕНТЫ КАРТЫ: ЭФФЕКТЫ
  // ────────────────────────────────────────────────────────────────────────────

  // Смена активного инструмента: гасим кнопки остальных (взаимоисключение)
  useEffect(() => {
    activeToolRef.current = activeTool;

    for (const [id, control] of Object.entries(toolControlsRef.current)) {
      if (id !== activeTool) {
        control?.changeStatus?.(false);
      }
    }
  }, [activeTool]);

  // Инструменты «выбор из списка»: при включении грузим список, при выключении чистим выделение
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const config = activeTool ? SELECT_TOOLS[activeTool] : undefined;
    if (!config) return;

    let cancelled = false;
    setSelectLoading(true);
    setSelectMessage(null);

    void (async () => {
      try {
        const candidates = await resolveVectorLayerCandidates(config.layerName);

        if (cancelled) return;

        if (candidates.length === 0) {
          setSelectMessage(`Слой «${config.layerName}» не найден в этой веб-карте`);
          return;
        }

        // Пробуем ID по очереди, пока NGW не отдаст таблицу атрибутов
        let rows: ToolRow[] | null = null;
        let layerId = candidates[0].id;
        const attempts: string[] = [];

        for (const candidate of candidates) {
          try {
            rows = await loadToolRows(candidate.id);
            layerId = candidate.id;
            console.info(
              `Инструмент «${config.layerName}»: слой ${candidate.id} (${candidate.source})`,
            );
            break;
          } catch (error) {
            console.warn(`Слой ${candidate.id} (${candidate.source}) не подошёл:`, error);
            attempts.push(`${candidate.source}: ${candidate.id}`);
          }
        }

        if (cancelled) return;

        if (!rows) {
          setSelectMessage(
            `NGW не отдал таблицу слоя. Пробовали ID — ${attempts.join(", ")}`,
          );
          return;
        }

        selectLayerIdRef.current = layerId;

        const options = buildSelectOptions(config, rows);
        setSelectOptions(options);

        if (options.length === 0) {
          console.warn("Пустой список для слоя", config.layerName, { layerId, rows });
          setSelectMessage("В слое нет объектов или не найдены нужные поля");
        }
      } catch (error) {
        console.error(`Не удалось загрузить слой «${config.layerName}»:`, error);
        if (!cancelled) {
          setSelectMessage(
            `Не удалось загрузить список: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } finally {
        if (!cancelled) setSelectLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      selectLayerIdRef.current = null;
      setSelectOptions([]);
      setSelectLoading(false);
      setSelectMessage(null);
      handleClearFeature();
    };
  }, [activeTool]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // «Экомониторинг»: при выключении инструмента убираем подсветку точек
  useEffect(() => {
    if (activeTool !== "ecomonTool") return;

    return () => mapInstance.current?.removeLayer("light_object");
  }, [activeTool]);

  // «Добавить по координатам»: при выключении инструмента убираем нарисованные слои
  useEffect(() => {
    if (activeTool !== "coordTool") return;

    return () => clearCoordLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // «Координаты по клику»: отключаем идентификацию, ловим клики, копим точки
  useEffect(() => {
    if (activeTool !== "coordFromMapTool") return;

    const map = mapInstance.current;
    const leafletMap = map?.mapAdapter?.map;
    if (!map || !leafletMap) return;

    map.disableSelection?.();
    map.setCursor("crosshair");

    const onPick = (event: LeafletMouseEventLike) => {
      setPickedPoints((previous) => [...previous, normalizePoint(event.latlng)]);
    };

    leafletMap.on("click", onPick);

    return () => {
      leafletMap.off("click", onPick);
      map.enableSelection?.();
      map.setCursor("default");
      setPickedPoints([]);
    };
  }, [activeTool]);

  // Отрисовка накопленных точек «координат по клику» на карте
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    map.removeLayer("coord_pick_layer");

    if (pickedPoints.length === 0) return;

    void map.addGeoJsonLayer({
      data: pickedPoints.map(toPointFeature),
      id: "coord_pick_layer",
      paint: () => pointPaint("#ff0000"),
    });
  }, [pickedPoints]);

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
    let measureControl: unknown;
    let onMeasureStart: (() => void) | undefined;
    let onMeasureFinish: (() => void) | undefined;

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
          // Во время измерения и снятия координат клик не должен открывать сайдбар
          if (
            measuringRef.current ||
            activeToolRef.current === "coordFromMapTool"
          ) {
            return;
          }

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

        // ──────────────────────────────────────────────────────────────────────
        //  КНОПКИ ИНСТРУМЕНТОВ (только те, что заданы для этой карты в MAP_TOOLS)
        // ──────────────────────────────────────────────────────────────────────

        const toolIds = MAP_TOOLS[resourceId] ?? [];

        // Измерения: готовый плагин leaflet-measure, добавляется прямо в Leaflet-карту
        if (toolIds.includes("measureTool")) {
          await import("leaflet");
          await import("leaflet-measure");

          const L = (window as unknown as { L?: LeafletGlobal }).L;

          if (!cancelled && L?.control?.measure) {
            measureControl = L.control.measure({
              position: TOOLS_LEAFLET_POSITION,
              primaryLengthUnit: "kilometers",
              primaryAreaUnit: "hectares",
              localization: "ru",
            });
            leafletMap.addControl?.(measureControl);

            // На время измерения отключаем идентификацию объектов
            onMeasureStart = () => {
              measuringRef.current = true;
              map.disableSelection?.();
            };
            onMeasureFinish = () => {
              measuringRef.current = false;

              if (activeToolRef.current !== "coordFromMapTool") {
                map.enableSelection?.();
              }
            };

            leafletMap.on("measurestart", onMeasureStart);
            leafletMap.on("measurefinish", onMeasureFinish);
          }
        }

        // Остальные инструменты: кнопки-переключатели NgwMap, панели рисует React
        for (const toolId of toolIds) {
          if (toolId === "measureTool") continue;

          const meta = TOOL_META[toolId];

          const control = map.createToggleControl?.({
            getStatus: () => activeToolRef.current === toolId,
            onClick: (status) =>
              setActiveTool((previous) =>
                status ? toolId : previous === toolId ? null : previous,
              ),
            html: meta.icon,
            title: meta.title,
            addClassOn: "ngw-tool-on",
            addClassOff: "ngw-tool-off",
          });

          if (!control) continue;

          const added = await map.addControl?.(control, TOOLS_NGW_POSITION);

          if (cancelled) return;

          toolControlsRef.current[toolId] =
            added ?? (control as ToggleControlLike);
        }
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

      // Убираем контрол измерений
      if (leafletMap) {
        if (onMeasureStart) leafletMap.off("measurestart", onMeasureStart);
        if (onMeasureFinish) leafletMap.off("measurefinish", onMeasureFinish);
        if (measureControl) leafletMap.removeControl?.(measureControl);
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
      toolControlsRef.current = {};
      toolRowsRef.current = {};
      coordLayerIdsRef.current = [];
      measuringRef.current = false;

      // Сбрасываем состояние компонента
      setActiveTool(null);
      setPickedPoints([]);
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

  // Конфигурация активного инструмента «выбор из списка» (если он активен)
  const activeSelectTool = activeTool ? SELECT_TOOLS[activeTool] : undefined;

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

        {/* Панели инструментов (одновременно открыта максимум одна) */}
        {activeTool && activeSelectTool && (
          <SelectToolPanel
            key={activeTool}
            title={TOOL_META[activeTool].title}
            placeholder={activeSelectTool.placeholder}
            options={selectOptions}
            loading={selectLoading}
            message={selectMessage}
            onChange={(value) =>
              void handleSelectToolChange(activeSelectTool, value)
            }
          />
        )}

        {activeTool === "ecomonTool" && <EcomonPanel api={ecomonApi} />}

        {activeTool === "coordTool" && (
          <CoordInputPanel onDraw={handleCoordDraw} onClear={clearCoordLayers} />
        )}

        {activeTool === "coordFromMapTool" && (
          <CoordPickerPanel
            points={pickedPoints}
            onClear={() => setPickedPoints([])}
          />
        )}
      </main>
    </div>
  );
}
