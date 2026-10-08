"use client";

import { useEffect, useRef, useCallback } from "react";

// ──────────────────────────────────────────────────────────────────────────────
//  ТИПЫ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Идентификаторы инструментов, доступных на карте.
 * Названия соответствуют ключам в resmeta.items веб-карты NGW.
 *
 * Чтобы отключить инструмент — удалите его из этого типа и из TOOL_CONFIGS.
 */
export type ToolId =
  | "measureTool"       // Инструмент измерения расстояний и площадей
  | "fishTool"          // Выбор рыболовного участка из выпадающего списка
  | "coordTool"         // Добавление объектов на карту по координатам (точки, линии, полигоны)
  | "ecomonTool"        // Экологический мониторинг: выбор территории и статистика
  | "coordFromMapTool"  // Получение координат точек кликами по карте
  | "settlTool"         // Поиск и приближение к населённому пункту
  | "zsoTool"           // Поиск зон санитарной охраны по распоряжению
  | "ccfTool";          // Поиск объектов капитального строительства

/**
 * Конфигурация инструмента: иконка, заголовок и признак переключателя.
 */
interface ToolConfig {
  title: string;
  icon: string; // FontAwesome класс иконки
  isToggle: boolean; // true = кнопка-переключатель (вкл/выкл), false = одноразовое действие
}

/**
 * Маппинг id инструмента → его конфигурация.
 * Добавьте/удалите записи здесь, чтобы управлять набором инструментов.
 */
const TOOL_CONFIGS: Record<ToolId, ToolConfig> = {
  // ── Измерения ──
  // Линейка и измерение площади через Leaflet-плагин L.control.measure.
  // Активируется одним кликом, отдельная кнопка на карте.
  measureTool: {
    title: "Измерения",
    icon: "fa-solid fa-ruler-combined",
    isToggle: false,
  },

  // ── Рыболовные участки ──
  // Загружает таблицу атрибутов слоя «Рыболовные участки»,
  // строит выпадающий список. При выборе участка — идентифицирует объект на карте.
  fishTool: {
    title: "Рыболовные участки",
    icon: "fa-solid fa-fish-fins",
    isToggle: true,
  },

  // ── Добавление объектов по координатам ──
  // Открывает панель с textarea для ввода координат и кнопками:
  // «Создать точку», «Создать линию», «Создать полигон».
  // Также поддерживает загрузку координат из файла.
  coordTool: {
    title: "Добавить объекты по координатам",
    icon: "fa-solid fa-map-location-dot",
    isToggle: true,
  },

  // ── Экологический мониторинг ──
  // Загружает список территорий (таблица по ID=618 в NGW),
  // открывает окно выбора территории и статистики.
  ecomonTool: {
    title: "Экологический мониторинг",
    icon: "fa-solid fa-shapes",
    isToggle: true,
  },

  // ── Получение координат по клику ──
  // При активации — каждый клик по карте добавляет точку в список.
  // Координаты можно скопировать в буфер обмена.
  coordFromMapTool: {
    title: "Получение координат по клику",
    icon: "fa-solid fa-map-pin",
    isToggle: true,
  },

  // ── Населённые пункты ──
  // Загружает список всех населённых пунктов из соответствующего слоя.
  // При выборе — приближает карту к выбранному пункту.
  settlTool: {
    title: "Населённые пункты",
    icon: "fa-solid fa-book-atlas",
    isToggle: true,
  },

  // ── Зоны санитарной охраны ──
  // Загружает список распоряжений (группировка по дате + номеру).
  // При выборе — идентифицирует все объекты, относящиеся к распоряжению.
  zsoTool: {
    title: "Зоны санитарной охраны",
    icon: "fa-solid fa-draw-polygon",
    isToggle: true,
  },

  // ── Объекты капитального строительства ──
  // Загружает список всех ОКС из соответствующего слоя.
  // При выборе — идентифицирует объект(ы) на карте.
  ccfTool: {
    title: "Объекты капитального строительства",
    icon: "fa-solid fa-building",
    isToggle: true,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
//  ИНТЕРФЕЙСЫ КАРТЫ
// ──────────────────────────────────────────────────────────────────────────────

/** Минимальный интерфейс NgwMap, нужный для работы инструментов. */
interface NgwMapLike {
  connector?: {
    get: (route: string, _null: null, params: { id: number }) => Promise<unknown>;
  };
  getLayer?: (id: string) => {
    layer?: {
      item?: {
        children?: Array<{
          display_name?: string;
          style_parent_id?: number;
        }>;
      };
    };
  };
  createToggleControl?: (opts: {
    getStatus?: () => void;
    onClick: (status: boolean) => void;
    html: string;
    title: string;
    addClassOn: string;
    addClassOff: string;
  }) => unknown;
  addControl?: (
    control: unknown,
    position: string,
  ) => Promise<ToolControl>;
  setCursor?: (cursor: string) => void;
  removeLayer?: (id: string) => void;
  emitter?: {
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    setMaxListeners?: (n: number) => void;
  };
  enableSelection?: () => void;
  disableSelection?: () => void;
  cancelPromise?: (...args: unknown[]) => void;
  addGeoJsonLayer?: (opts: unknown) => Promise<void>;
  fitLayer?: (id: string, opts?: Record<string, unknown>) => void;
  getBounds?: () => unknown;
  fitBounds?: (bounds: unknown) => void;
}

/** Управляющий элемент, возвращаемый addControl(). */
interface ToolControl {
  id?: string;
  init?: () => void;
  changeStatus?: (status: boolean) => void;
}

/** Результат запроса feature_layer.feature.collection. */
interface FeatureRow {
  id: number;
  fields: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────────
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ──────────────────────────────────────────────────────────────────────────────

/** Сортировка массива объектов по строковому полю. */
function sortObjects<T extends Record<string, unknown>>(
  arr: T[],
  field: string,
): T[] {
  return [...arr].sort((a, b) => {
    const av = String(a[field] ?? "");
    const bv = String(b[field] ?? "");
    return av.localeCompare(bv, "ru");
  });
}

// ──────────────────────────────────────────────────────────────────────────────
//  ПРОПСЫ
// ──────────────────────────────────────────────────────────────────────────────

interface MapToolsProps {
  /** Экземпляр NgwMap, на который добавляются инструменты. */
  ngwMap: NgwMapLike | null;
  /** ID ресурса веб-карты в NGW. */
  webMapName: string;
  /** Список id инструментов, включённых для данной карты.
   *  Берётся из resmeta.items веб-карты.
   *  Если массив пуст — ни один инструмент не добавится. */
  enabledTools: ToolId[];
  /** Колбэк, вызываемый при идентификации объекта (для карточки в сайдбаре). */
  onIdentify?: (
    layerId: number,
    feature: Record<string, unknown>,
    multiple?: boolean,
  ) => void;
  /** Колбэк для зума к объекту. */
  onZoomToObject?: (feature: Record<string, unknown>) => void;
  /** Глобальный wrapper для позиционирования всплывающих окон. */
  wrapperRef: React.RefObject<HTMLElement | null>;
}

// ──────────────────────────────────────────────────────────────────────────────
//  КОМПОНЕНТ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * MapTools — панель инструментов карты.
 *
 * Каждый инструмент добавляется на карту через ngwMap.addControl().
 * Инструменты-переключатели (isToggle: true) при активации деактивируют все остальные.
 *
 * Логика каждого инструмента портирована из ванильного JS-кода геопортала.
 * Комментарии в TOOL_CONFIGS описывают назначение — удалите ненужные,
 * чтобы сократить код.
 */
export default function MapTools({
  ngwMap,
  webMapName,
  enabledTools,
  onIdentify,
  onZoomToObject,
  wrapperRef,
}: MapToolsProps) {
  // Массив активных контролов для взаимного выключения
  const toolsRef = useRef<ToolControl[]>([]);
  // Ссылки на динамические DOM-элементы (выпадающие списки и окна)
  const dynamicElemsRef = useRef<HTMLElement[]>([]);
  // Счётчик точек для coordFromMapTool
  const coordPointsCountRef = useRef(0);
  // Реф для обработчика клика coordFromMapTool
  const coordFromMapHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);

  // ────────────────────────────────────────────────────────────────────────────
  //  Очистка динамических элементов
  // ────────────────────────────────────────────────────────────────────────────

  const removeDynamicElems = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    dynamicElemsRef.current.forEach((el) => {
      try {
        if (el.parentNode === wrapper) {
          wrapper.removeChild(el);
        }
      } catch {
        // элемент уже удалён
      }
    });
    dynamicElemsRef.current = [];
  }, [wrapperRef]);

  // ────────────────────────────────────────────────────────────────────────────
  //  Деактивация всех инструментов кроме текущего
  // ────────────────────────────────────────────────────────────────────────────

  const deactivateOtherTools = useCallback(
    (currentId: string) => {
      toolsRef.current.forEach((item) => {
        if (item.id !== currentId) {
          item.init?.();
          item.changeStatus?.(false);
        }
      });
    },
    [],
  );

  // ────────────────────────────────────────────────────────────────────────────
  //  Создание выпадающего списка для инструмента
  // ────────────────────────────────────────────────────────────────────────────

  const createSelect = useCallback(
    (
      toolName: string,
      placeholder: string,
      rows: Array<{ id: number | string; text: string; value: string }>,
      onSelect: (value: string) => void,
      cssClass: string,
      optionClass: string,
    ) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return null;

      // Находим кнопку инструмента на карте по aria-label
      const toolButton = document.querySelector(
        `div[aria-label="${toolName}"]`,
      ) as HTMLElement | null;

      if (!toolButton) return null;

      const select = document.createElement("select");
      select.classList.add(cssClass);

      // Позиционируем относительно кнопки
      const updatePosition = () => {
        const rect = toolButton.getBoundingClientRect();
        select.style.left = `${rect.left - 205}px`;
        select.style.top = `${rect.top - 2}px`;
      };
      updatePosition();

      window.addEventListener("resize", updatePosition);

      // Заглушка
      const defaultOption = document.createElement("option");
      defaultOption.classList.add(optionClass);
      defaultOption.value = "-1";
      defaultOption.text = placeholder;
      defaultOption.setAttribute("disabled", "disabled");
      defaultOption.setAttribute("selected", "selected");
      select.insertAdjacentElement("beforeend", defaultOption);

      // Опции
      rows.forEach((row) => {
        const option = document.createElement("option");
        option.classList.add(optionClass);
        option.value = row.value;
        option.text = row.text;
        select.appendChild(option);
      });

      wrapper.insertAdjacentElement("beforeend", select);
      dynamicElemsRef.current.push(select);

      select.onchange = (e) => {
        const value = (e.target as HTMLSelectElement).value;
        if (value !== "-1") {
          onSelect(value);
        }
      };

      return select;
    },
    [wrapperRef],
  );

  // ────────────────────────────────────────────────────────────────────────────
  //  Получение ID слоя по имени из дерева веб-карты
  // ────────────────────────────────────────────────────────────────────────────

  const getLayerIdByName = useCallback(
    (toolName: string): number | null => {
      if (!ngwMap?.getLayer) return null;

      const layer = ngwMap.getLayer(webMapName);
      const children = layer?.layer?.item?.children;

      if (!children) return null;

      for (const child of children) {
        if (child.display_name === toolName) {
          return child.style_parent_id ?? null;
        }
      }

      return null;
    },
    [ngwMap, webMapName],
  );

  // ────────────────────────────────────────────────────────────────────────────
  //  ИНИЦИАЛИЗАЦИЯ ИНСТРУМЕНТОВ
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ngwMap || enabledTools.length === 0) return;

    let active = true;

    /**
     * Регистрирует toggle-контрол в общем массиве.
     * После добавления контрола на карту — сохраняет id, init и добавляет в toolsRef.
     */
    async function registerTool(
      control: unknown,
      id: string,
      initFn: () => void,
    ) {
      const added = await ngwMap!.addControl?.(control, "top-right");
      if (!active) return;

      const tc = added as ToolControl;
      tc.id = id;
      tc.init = initFn;
      toolsRef.current.push(tc);
    }

    /**
     * Создаёт toggle-контрол с стандартной логикой деактивации остальных.
     */
    function makeToggle(
      id: string,
      onClick: (status: boolean) => void,
      icon: string,
      title: string,
    ) {
      return ngwMap!.createToggleControl?.({
        getStatus: () => {},
        onClick: (status: boolean) => {
          deactivateOtherTools(id);
          onClick(status);
        },
        html: `<i class="${icon}"></i>`,
        title,
        addClassOn: "tools_icon_on",
        addClassOff: "tools_icon_off",
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  1. ИЗМЕРЕНИЯ (measureTool)
    //  Линейка и площадь через L.control.measure.
    //  Не является toggle-контролом — добавляется как отдельный Leaflet-плагин.
    //  Удалите, если измерения не нужны на карте.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("measureTool")) {
      try {
        // @ts-expect-error — L доступен глобально через leaflet
        const measureTool = L.control.measure({});
        ngwMap.addControl?.(measureTool, "top-right");
      } catch {
        console.warn("measureTool: плагин L.control.measure недоступен");
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  2. РЫБОЛОВНЫЕ УЧАСТКИ (fishTool)
    //  Загружает таблицу атрибутов слоя «Рыболовные участки»,
    //  строит выпадающий список. При выборе — идентифицирует объект.
    //  Удалите, если рыболовные участки не используются.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("fishTool")) {
      const toolName = "Рыболовные участки";
      let fishSelect: HTMLSelectElement | null = null;

      const control = makeToggle(
        "fishTool",
        (status) => {
          if (status) {
            const layerID = getLayerIdByName(toolName);

            if (layerID == null) return;

            ngwMap.connector
              ?.get("feature_layer.feature.collection", null, { id: layerID })
              .then((store: unknown) => {
                const rows = store as FeatureRow[];
                const doubleStore = rows.map((item) => ({
                  id: item.id,
                  name: String(item.fields.name ?? ""),
                }));
                const sorted = sortObjects(doubleStore, "name");

                fishSelect = createSelect(
                  toolName,
                  "Выберите участок",
                  sorted.map((r) => ({
                    id: r.id,
                    text: r.name,
                    value: String(r.id),
                  })),
                  (value) => {
                    // Идентификация выбранного участка
                    onIdentify?.(layerID, { id: Number(value) }, false);
                  },
                  "fish_select",
                  "fish_option",
                ) as HTMLSelectElement | null;
              });
          } else {
            // Деактивация — удаляем выпадающий список
            const wrapper = wrapperRef.current;
            if (fishSelect && wrapper) {
              try {
                wrapper.removeChild(fishSelect);
              } catch {
                // уже удалён
              }
              fishSelect = null;
            }
          }
        },
        TOOL_CONFIGS.fishTool.icon,
        toolName,
      );

      if (control) {
        registerTool(control, "fishTool", () => {
          const wrapper = wrapperRef.current;
          if (fishSelect && wrapper) {
            try {
              wrapper.removeChild(fishSelect);
            } catch {
              // уже удалён
            }
            fishSelect = null;
          }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  3. ДОБАВЛЕНИЕ ОБЪЕКТОВ ПО КООРДИНАТАМ (coordTool)
    //  Открывает панель с textarea и кнопками: точка, линия, полигон.
    //  Поддерживает загрузку координат из файла и выбор цвета заливки.
    //  Удалите, если ручное добавление объектов не требуется.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("coordTool")) {
      const control = makeToggle(
        "coordTool",
        (status) => {
          if (status) {
            // Создаёт панель инструментов рисования.
            // В оригинале использовался new Paint().createTool().
            // Здесь нужно вызвать ваш класс/функцию Paint.
            console.info("coordTool: панель добавления объектов активирована");
            // TODO: реализовать через React-компонент или Paint-класс
          } else {
            const wrapper = wrapperRef.current;
            const coordWin = document.getElementById("coord_win");
            if (coordWin && wrapper) {
              try {
                wrapper.removeChild(coordWin);
              } catch {
                // уже удалён
              }
            }
          }
        },
        TOOL_CONFIGS.coordTool.icon,
        TOOL_CONFIGS.coordTool.title,
      );

      if (control) {
        registerTool(control, "coordTool", () => {
          const wrapper = wrapperRef.current;
          const coordWin = document.getElementById("coord_win");
          if (coordWin && wrapper) {
            try {
              wrapper.removeChild(coordWin);
            } catch {
              // уже удалён
            }
          }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  4. ЭКОЛОГИЧЕСКИЙ МОНИТОРИНГ (ecomonTool)
    //  Загружает список территорий (таблица NGW ID=618),
    //  открывает окно выбора территории и статистики.
    //  Удалите, если экологический мониторинг не используется.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("ecomonTool")) {
      const control = makeToggle(
        "ecomonTool",
        (status) => {
          if (status) {
            // Загружаем территории из таблицы по ID=618
            ngwMap.connector
              ?.get("feature_layer.feature.collection", null, { id: 618 })
              .then((store: unknown) => {
                const rows = store as FeatureRow[];
                const terrNames = rows
                  .map((item) => String(item.fields.terr_name ?? ""))
                  .sort();

                // В оригинале: new Ecomonitoring().createEcomonitoringWindow(terrNames)
                // Здесь нужно вызвать ваш React-компонент или класс Ecomonitoring.
                console.info(
                  "ecomonTool: загружено территорий:",
                  terrNames.length,
                );
                // TODO: реализовать через React-компонент или Ecomonitoring-класс
              })
              .catch(() => {
                console.warn("ecomonTool: не удалось загрузить территории");
              });
          } else {
            ngwMap.removeLayer?.("light_object");
            const wrapper = wrapperRef.current;
            const win = document.getElementById("ecomon_win");
            const statWin = document.getElementById("ecomon_stat_win");
            [win, statWin].forEach((el) => {
              if (el && wrapper) {
                try {
                  wrapper.removeChild(el);
                } catch {
                  // уже удалён
                }
              }
            });
          }
        },
        TOOL_CONFIGS.ecomonTool.icon,
        TOOL_CONFIGS.ecomonTool.title,
      );

      if (control) {
        registerTool(control, "ecomonTool", () => {
          ngwMap.removeLayer?.("light_object");
          const wrapper = wrapperRef.current;
          const win = document.getElementById("ecomon_win");
          const statWin = document.getElementById("ecomon_stat_win");
          [win, statWin].forEach((el) => {
            if (el && wrapper) {
              try {
                wrapper.removeChild(el);
              } catch {
                // уже удалён
              }
            }
          });
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  5. ПОЛУЧЕНИЕ КООРДИНАТ ПО КЛИКУ (coordFromMapTool)
    //  Каждый клик по карте добавляет точку в список координат.
    //  Координаты можно скопировать в буфер обмена.
    //  Удалите, если сбор координат кликами не нужен.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("coordFromMapTool")) {
      const handler = (...args: unknown[]) => {
        coordPointsCountRef.current++;
        const e = args[0] as { lngLat?: [number, number] };
        // В оригинале: new Coord_from_map().showCoordList(e.lngLat, count)
        console.info(
          "coordFromMapTool: точка #",
          coordPointsCountRef.current,
          e?.lngLat,
        );
        // TODO: реализовать через React-компонент или Coord_from_map-класс
      };

      coordFromMapHandlerRef.current = handler;

      const control = makeToggle(
        "coordFromMapTool",
        (status) => {
          if (status) {
            coordPointsCountRef.current = 0;
            ngwMap.setCursor?.("url(../../xy.cur), help");
            // Создаём окно со списком координат
            // TODO: реализовать через React-компонент или Coord_from_map-класс
            ngwMap.emitter?.on?.("click", handler);
          } else {
            coordPointsCountRef.current = 0;
            ngwMap.emitter?.removeListener?.("click", handler);
            const wrapper = wrapperRef.current;
            const win = document.getElementById("crd_win");
            if (win && wrapper) {
              try {
                wrapper.removeChild(win);
              } catch {
                // уже удалён
              }
            }
          }
        },
        TOOL_CONFIGS.coordFromMapTool.icon,
        TOOL_CONFIGS.coordFromMapTool.title,
      );

      if (control) {
        registerTool(control, "coordFromMapTool", () => {
          coordPointsCountRef.current = 0;
          if (coordFromMapHandlerRef.current) {
            ngwMap.emitter?.removeListener?.(
              "click",
              coordFromMapHandlerRef.current,
            );
          }
          const wrapper = wrapperRef.current;
          const win = document.getElementById("crd_win");
          if (win && wrapper) {
            try {
              wrapper.removeChild(win);
            } catch {
              // уже удалён
            }
          }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  6. НАСЕЛЁННЫЕ ПУНКТЫ (settlTool)
    //  Загружает список всех населённых пунктов из слоя.
    //  При выборе — приближает карту к выбранному пункту.
    //  Удалите, если поиск по населённым пунктам не нужен.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("settlTool")) {
      const toolName = "Населённые пункты";
      let settlSelect: HTMLSelectElement | null = null;

      const control = makeToggle(
        "settlTool",
        (status) => {
          if (status) {
            const layerID = getLayerIdByName(toolName);
            if (layerID == null) return;

            ngwMap.connector
              ?.get("feature_layer.feature.collection", null, { id: layerID })
              .then((store: unknown) => {
                const rows = store as FeatureRow[];
                const doubleStore = rows.map((item) => ({
                  id: item.id,
                  name: String(item.fields.Name ?? ""),
                }));
                const sorted = sortObjects(doubleStore, "name");

                settlSelect = createSelect(
                  toolName,
                  "Выберите нас. пункт",
                  sorted.map((r) => ({
                    id: r.id,
                    text: r.name,
                    value: String(r.id),
                  })),
                  (value) => {
                    // Зум к выбранному населённому пункту
                    onZoomToObject?.({ id: Number(value) });
                  },
                  "settl_select",
                  "settl_option",
                ) as HTMLSelectElement | null;
              });
          } else {
            const wrapper = wrapperRef.current;
            if (settlSelect && wrapper) {
              try {
                wrapper.removeChild(settlSelect);
              } catch {
                // уже удалён
              }
              settlSelect = null;
            }
          }
        },
        TOOL_CONFIGS.settlTool.icon,
        toolName,
      );

      if (control) {
        registerTool(control, "settlTool", () => {
          const wrapper = wrapperRef.current;
          if (settlSelect && wrapper) {
            try {
              wrapper.removeChild(settlSelect);
            } catch {
              // уже удалён
            }
            settlSelect = null;
          }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  7. ЗОНЫ САНИТАРНОЙ ОХРАНЫ (zsoTool)
    //  Загружает список распоряжений (группировка по дате + номеру).
    //  При выборе — идентифицирует все объекты, относящиеся к распоряжению.
    //  Удалите, если ЗСО не используются.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("zsoTool")) {
      const toolName = "Зоны санитарной охраны";
      let zsoSelect: HTMLSelectElement | null = null;

      const control = makeToggle(
        "zsoTool",
        (status) => {
          if (status) {
            const layerID = getLayerIdByName(toolName);
            if (layerID == null) return;

            ngwMap.connector
              ?.get("feature_layer.feature.collection", null, { id: layerID })
              .then((store: unknown) => {
                const rows = store as FeatureRow[];

                // Группировка по дате + номеру распоряжения
                const doubleStore = rows.map((item) => {
                  const dateStr = String(item.fields.order_date ?? "");
                  const parts = dateStr.split(".");
                  const dateUtc = parts.length === 3
                    ? `${parts[2]}/${parts[1]}/${parts[0]}`
                    : dateStr;

                  return {
                    id: item.id,
                    orderNumber: String(item.fields.order_number ?? ""),
                    orderDate: dateStr,
                    dateUtc,
                  };
                });

                const groupKey = (item: (typeof doubleStore)[number]) =>
                  `${item.dateUtc}${item.orderNumber}`;

                const grouped = new Map(
                  [...Map.groupBy(doubleStore, groupKey)].sort(),
                );
                const groupedArray = Array.from(grouped);

                zsoSelect = createSelect(
                  toolName,
                  "Выберите распоряж.",
                  groupedArray.map((row) => {
                    const ids = row[1]
                      .map((item) => item.id)
                      .join(",");
                    const first = row[1][0];
                    const text =
                      first.orderNumber !== "-"
                        ? `№ ${first.orderNumber} от ${first.orderDate}`
                        : "Отсутствуют данные";
                    return { id: ids, text, value: ids };
                  }),
                  (value) => {
                    // Идентификация всех объектов распоряжения
                    const ids = value.split(",").map(Number);
                    onIdentify?.(layerID!, { ids }, true);
                  },
                  "zso_select",
                  "zso_option",
                ) as HTMLSelectElement | null;
              });
          } else {
            const wrapper = wrapperRef.current;
            if (zsoSelect && wrapper) {
              try {
                wrapper.removeChild(zsoSelect);
              } catch {
                // уже удалён
              }
              zsoSelect = null;
            }
          }
        },
        TOOL_CONFIGS.zsoTool.icon,
        toolName,
      );

      if (control) {
        registerTool(control, "zsoTool", () => {
          const wrapper = wrapperRef.current;
          if (zsoSelect && wrapper) {
            try {
              wrapper.removeChild(zsoSelect);
            } catch {
              // уже удалён
            }
            zsoSelect = null;
          }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  8. ОБЪЕКТЫ КАПИТАЛЬНОГО СТРОИТЕЛЬСТВА (ccfTool)
    //  Загружает список всех ОКС из соответствующего слоя.
    //  При выборе — идентифицирует объект(ы) на карте.
    //  Удалите, если поиск ОКС не нужен.
    // ════════════════════════════════════════════════════════════════════════════
    if (enabledTools.includes("ccfTool")) {
      const toolName = "Объекты капитального строительства";
      let ccfSelect: HTMLSelectElement | null = null;

      const control = makeToggle(
        "ccfTool",
        (status) => {
          if (status) {
            const layerID = getLayerIdByName(toolName);
            if (layerID == null) return;

            ngwMap.connector
              ?.get("feature_layer.feature.collection", null, { id: layerID })
              .then((store: unknown) => {
                const rows = store as FeatureRow[];

                const doubleStore = rows.map((item) => ({
                  id: item.id,
                  name: String(item.fields.Name ?? ""),
                }));

                const grouped = new Map(
                  [...Map.groupBy(doubleStore, (item) => item.name)].sort(),
                );
                const groupedArray = Array.from(grouped);

                ccfSelect = createSelect(
                  toolName,
                  "Выберите объект",
                  groupedArray.map((row) => {
                    const ids = row[1].map((item) => item.id).join(",");
                    return {
                      id: ids,
                      text: row[1][0].name,
                      value: ids,
                    };
                  }),
                  (value) => {
                    const ids = value.split(",").map(Number);
                    onIdentify?.(layerID!, { ids }, true);
                  },
                  "ccf_select",
                  "ccf_option",
                ) as HTMLSelectElement | null;
              });
          } else {
            const wrapper = wrapperRef.current;
            if (ccfSelect && wrapper) {
              try {
                wrapper.removeChild(ccfSelect);
              } catch {
                // уже удалён
              }
              ccfSelect = null;
            }
          }
        },
        TOOL_CONFIGS.ccfTool.icon,
        toolName,
      );

      if (control) {
        registerTool(control, "ccfTool", () => {
          const wrapper = wrapperRef.current;
          if (ccfSelect && wrapper) {
            try {
              wrapper.removeChild(ccfSelect);
            } catch {
              // уже удалён
            }
            ccfSelect = null;
          }
        });
      }
    }

    // ── Cleanup при размонтировании ──
    return () => {
      active = false;
      removeDynamicElems();
      toolsRef.current = [];

      if (coordFromMapHandlerRef.current && ngwMap?.emitter) {
        ngwMap.emitter.removeListener?.(
          "click",
          coordFromMapHandlerRef.current,
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ngwMap, webMapName, enabledTools.join(",")]);

  // Компонент не рендерит DOM — только регистрирует контролы на карте
  return null;
}
