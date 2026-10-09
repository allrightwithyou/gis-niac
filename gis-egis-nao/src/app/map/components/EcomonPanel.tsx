"use client";

import { useEffect, useRef, useState } from "react";
import { ToolPanel } from "./MapToolPanels";

/**
 * Инструмент «Экологический мониторинг».
 * Каскад выбора: территория → тип точки → точка → год, затем окно с таблицей
 * показателей (с подсветкой превышений ПДК) и графиком по клику на показатель.
 * Запросы к NGW выполняет MapClient через EcomonApi — здесь только UI и разбор данных.
 */

// ── Конфигурация ─────────────────────────────────────────────────────────────

/** Ресурс-таблица со списком территорий (поле terr_name). */
export const ECOMON_TERRITORIES_RESOURCE_ID = 618;

const ECOMON_TYPES = {
  a: { name: "Атмосферный воздух", color: "#00ffeccc", pdkResourceId: 651 },
  bs: { name: "Донные отложения", color: "#ed5800cc", pdkResourceId: 654 },
  s: { name: "Почва", color: "#a66100cc", pdkResourceId: 657 },
  w: { name: "Поверхностная вода", color: "#0081eccc", pdkResourceId: 660 },
} as const;

type TypeKey = keyof typeof ECOMON_TYPES;

const PDK_COLORS = ["#af0808", "#ba6b03", "#bb05e8", "#ff9000", "#068900"];

/** Поля, которые не выводятся в таблицу показателей (без префикса типа). */
const EXCLUDED_SUFFIXES = [
  "area", "location", "name", "gsh", "msh", "ssh", "gdl", "mdl", "sdl", "namecode",
];

// ── Типы ─────────────────────────────────────────────────────────────────────

export interface EcomonFeature {
  id?: number | string;
  geometry?: unknown;
  properties: Record<string, unknown>;
}

export interface EcomonApi {
  fetchFeatures: (
    layerId: number,
    options?: { fields?: string[]; filters?: Array<[string, string, unknown]> },
  ) => Promise<EcomonFeature[]>;
  /** keyname → display_name полей слоя */
  fetchFieldNames: (layerId: number) => Promise<Record<string, string>>;
  /** ID векторного слоя по названию слоя в веб-карте */
  resolveLayerId: (layerName: string) => Promise<number | null>;
  /** Подсветить точки на карте и приблизить */
  showPoints: (features: EcomonFeature[], color: string) => Promise<void>;
}

interface PointRecord {
  year: string;
  area: unknown;
  type: string;
  name: unknown;
  location: unknown;
  lat: string;
  lng: string;
}

interface StatData {
  title: string;
  color: string;
  /** Записи по годам: «подпись показателя» → значение, отсортированы по «Год» */
  rows: Array<Record<string, unknown>>;
  /** Записи ПДК: «подпись» → значение */
  pdk: Array<Record<string, unknown>>;
}

interface PlotlyLike {
  newPlot: (el: HTMLElement, data: unknown[], layout: unknown, config: unknown) => unknown;
  purge: (el: HTMLElement) => void;
}

const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();

const formatValue = (value: unknown) =>
  value === -1 ? "н/д" : String(value ?? "").replace(".", ",");

const selectClass =
  "mb-2 w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100";

// ── Главная панель ───────────────────────────────────────────────────────────

export function EcomonPanel({ api }: { api: EcomonApi }) {
  const [territories, setTerritories] = useState<string[]>([]);
  const [typeLayers, setTypeLayers] = useState<Partial<Record<TypeKey, number>>>({});
  const [territory, setTerritory] = useState("");
  const [typeKey, setTypeKey] = useState<TypeKey | "">("");
  const [points, setPoints] = useState<Array<{ name: string; namecode: string }>>([]);
  const [pointCode, setPointCode] = useState("");
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [year, setYear] = useState("");
  const [stat, setStat] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);

  const layerId = typeKey ? typeLayers[typeKey] : undefined;

  // Начальная загрузка: список территорий и слои типов точек
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [terrFeatures, layerEntries] = await Promise.all([
          api.fetchFeatures(ECOMON_TERRITORIES_RESOURCE_ID, { fields: ["terr_name"] }),
          Promise.all(
            (Object.keys(ECOMON_TYPES) as TypeKey[]).map(
              async (key) => [key, await api.resolveLayerId(ECOMON_TYPES[key].name)] as const,
            ),
          ),
        ]);

        if (cancelled) return;

        setTerritories(
          terrFeatures
            .map((f) => String(f.properties.terr_name ?? ""))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "ru")),
        );

        const layers: Partial<Record<TypeKey, number>> = {};
        for (const [key, id] of layerEntries) {
          if (id !== null) layers[key] = id;
        }
        setTypeLayers(layers);
      } catch (error) {
        console.error("Экомониторинг: не удалось загрузить справочники:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Территория + тип → список точек (уникальные названия)
  useEffect(() => {
    setPoints([]);
    if (!territory || !typeKey || layerId === undefined) return;

    let cancelled = false;

    void (async () => {
      try {
        const features = await api.fetchFeatures(layerId, {
          fields: [`${typeKey}_name`, `${typeKey}_namecode`],
          filters: [[`${typeKey}_area`, "eq", territory]],
        });

        if (cancelled) return;

        const unique = new Map<string, { name: string; namecode: string }>();
        for (const f of features) {
          const name = String(f.properties[`${typeKey}_name`] ?? "");
          const namecode = String(f.properties[`${typeKey}_namecode`] ?? "").split("_")[0];
          if (name && !unique.has(name)) unique.set(name, { name, namecode });
        }

        setPoints([...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "ru")));
      } catch (error) {
        console.error("Экомониторинг: не удалось загрузить точки:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [territory, typeKey, layerId]);

  // Выбрана точка → подсвечиваем на карте, собираем годы
  useEffect(() => {
    setRecords([]);
    setYear("");
    if (!pointCode || !typeKey || layerId === undefined) return;

    let cancelled = false;
    const p = typeKey;

    void (async () => {
      try {
        const features = await api.fetchFeatures(layerId, {
          fields: ["area", "name", "year", "location", "gsh", "msh", "ssh", "gdl", "mdl", "sdl"].map(
            (s) => `${p}_${s}`,
          ),
          filters: [[`${p}_namecode`, "like", `${pointCode}_%`]],
        });

        if (cancelled) return;

        void api.showPoints(features, ECOMON_TYPES[p].color);

        const fmtSec = (v: unknown) => String(v ?? "").replace(".", ",");

        setRecords(
          features
            .map((f) => {
              const g = f.properties;
              return {
                year: String(g[`${p}_year`] ?? ""),
                area: g[`${p}_area`],
                type: ECOMON_TYPES[p].name,
                name: g[`${p}_name`],
                location: g[`${p}_location`],
                lat: `${g[`${p}_gsh`]}°${g[`${p}_msh`]}′${fmtSec(g[`${p}_ssh`])}″ СШ`,
                lng: `${g[`${p}_gdl`]}°${g[`${p}_mdl`]}′${fmtSec(g[`${p}_sdl`])}″ ВД`,
              };
            })
            .sort((a, b) => Number(a.year) - Number(b.year)),
        );
      } catch (error) {
        console.error("Экомониторинг: не удалось загрузить точку:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointCode, typeKey, layerId]);

  /** Кнопка «Данные мониторинга»: все показатели точки + ПДК по типу. */
  async function openStat() {
    if (!pointCode || !typeKey || layerId === undefined) return;

    const p = typeKey;
    const pdkId = ECOMON_TYPES[p].pdkResourceId;

    try {
      const [features, names, pdkFeatures, pdkNames] = await Promise.all([
        api.fetchFeatures(layerId, { filters: [[`${p}_namecode`, "like", `${pointCode}_%`]] }),
        api.fetchFieldNames(layerId),
        api.fetchFeatures(pdkId),
        api.fetchFieldNames(pdkId),
      ]);

      const excluded = new Set([...EXCLUDED_SUFFIXES.map((s) => `${p}_${s}`), "type"]);

      const rows = features
        .map((f) => {
          const row: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(f.properties)) {
            if (!excluded.has(key)) row[names[key] ?? key] = value;
          }
          return row;
        })
        .sort((a, b) => Number(a["Год"]) - Number(b["Год"]));

      const pdk = pdkFeatures.map((f) => {
        const row: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(f.properties)) {
          row[pdkNames[key] ?? key] = value;
        }
        return row;
      });

      const pointName = features[0]?.properties[`${p}_name`];

      setStat({
        title: `${ECOMON_TYPES[p].name} - ${pointName ?? ""}`,
        color: ECOMON_TYPES[p].color,
        rows,
        pdk,
      });
    } catch (error) {
      console.error("Экомониторинг: не удалось загрузить показатели:", error);
    }
  }

  const yearRecords = records.filter((r) => r.year === year);

  return (
    <>
      <ToolPanel title="Экологический мониторинг">
        {loading ? (
          <div className="text-gray-500">Загрузка…</div>
        ) : (
          <>
            <select
              className={selectClass}
              value={territory}
              onChange={(e) => {
                setTerritory(e.target.value);
                setTypeKey(""); // как в прежней версии: смена территории сбрасывает тип
                setPointCode("");
                setStat(null);
              }}
            >
              <option value="" disabled>Выберите территорию</option>
              {territories.map((t) => (
                <option key={t} value={t} title={t}>{t}</option>
              ))}
            </select>

            <select
              className={selectClass}
              value={typeKey}
              onChange={(e) => {
                setTypeKey(e.target.value as TypeKey);
                setPointCode("");
                setStat(null);
              }}
            >
              <option value="" disabled>Выберите тип точки</option>
              {(Object.keys(typeLayers) as TypeKey[]).map((key) => (
                <option key={key} value={key}>{ECOMON_TYPES[key].name}</option>
              ))}
            </select>

            <select
              className={selectClass}
              value={pointCode}
              disabled={points.length === 0}
              onChange={(e) => {
                setPointCode(e.target.value);
                setStat(null);
              }}
            >
              <option value="" disabled>Выберите название точки</option>
              {points.map((point) => (
                <option key={point.namecode} value={point.namecode}>{point.name}</option>
              ))}
            </select>

            <select
              className={selectClass}
              value={year}
              disabled={records.length === 0}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="" disabled>Выберите год</option>
              {records.map((r) => (
                <option key={r.year} value={r.year}>{r.year}</option>
              ))}
            </select>

            {yearRecords.length > 0 && (
              <ul className="mb-2 space-y-0.5 text-[12px]">
                {yearRecords.map((r) => (
                  <li key={r.year} className="space-y-0.5">
                    <div>{String(r.area ?? "")}</div>
                    <div>{r.type}</div>
                    <div>{String(r.name ?? "")}</div>
                    <div>{String(r.location ?? "")}</div>
                    <div>{r.lat}<br />{r.lng}</div>
                  </li>
                ))}
              </ul>
            )}

            <button
              className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
              disabled={!pointCode}
              onClick={() => void openStat()}
            >
              Данные мониторинга
            </button>
          </>
        )}
      </ToolPanel>

      {stat && <StatWindow stat={stat} onClose={() => setStat(null)} />}
    </>
  );
}

// ── Окно показателей: таблица ↔ график ───────────────────────────────────────

function StatWindow({ stat, onClose }: { stat: StatData; onClose: () => void }) {
  const [chartKey, setChartKey] = useState<string | null>(null);

  const keys = Object.keys(stat.rows[0] ?? {});

  /** Значение превышает хотя бы один ПДК по этому показателю. */
  const exceedsPdk = (key: string, value: unknown) =>
    typeof value === "number" &&
    stat.pdk.some((record) =>
      Object.entries(record).some(
        ([pdkKey, pdkValue]) =>
          normalize(pdkKey) === normalize(key) &&
          typeof pdkValue === "number" &&
          pdkValue !== -1 &&
          value > pdkValue,
      ),
    );

  return (
    <div className="absolute left-[348px] top-[10px] z-[1000] max-h-[75vh] max-w-[calc(100vw-380px)] overflow-auto rounded bg-white p-3 text-[13px] text-gray-800 shadow">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="font-semibold">{stat.title}</div>
        <button onClick={onClose} title="Закрыть" className="text-gray-500 hover:text-gray-800">
          ✕
        </button>
      </div>

      {chartKey === null ? (
        <table className="border-collapse text-[12px]">
          <tbody>
            {keys.map((key) => (
              <tr key={key}>
                <th className="sticky left-0 border border-gray-200 bg-gray-50 px-2 py-1 text-left font-normal">
                  {key === "Год" ? (
                    key
                  ) : (
                    <button
                      title={key}
                      className="text-left text-blue-700 hover:underline"
                      onClick={() => setChartKey(key)}
                    >
                      {key.length > 20 ? `${key.slice(0, 20)}...` : key}
                    </button>
                  )}
                </th>
                {stat.rows.map((row, i) => (
                  <td
                    key={i}
                    className={`border border-gray-200 px-2 py-1 text-right ${
                      exceedsPdk(key, row[key]) ? "bg-red-100 font-semibold text-red-700" : ""
                    }`}
                  >
                    {formatValue(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>
          <button
            className="mb-2 text-blue-700 hover:underline"
            onClick={() => setChartKey(null)}
          >
            ← Вернуться к таблице
          </button>
          <EcomonChart stat={stat} chartKey={chartKey} />
        </div>
      )}
    </div>
  );
}

/** Столбчатый график показателя по годам + линии ПДК (Plotly). */
function EcomonChart({ stat, chartKey }: { stat: StatData; chartKey: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const valid = stat.rows.filter((row) => row[chartKey] !== -1 && row[chartKey] != null);
  const years = valid.map((row) => `${row["Год"]} г.`);
  const values = valid.map((row) => Number(row[chartKey]));

  useEffect(() => {
    const element = ref.current;
    if (!element || values.length === 0) return;

    let cancelled = false;
    let plotly: PlotlyLike | undefined;

    const maxValue = Math.max(...values);
    const shapes: unknown[] = [];
    const annotations: unknown[] = [];

    // Линия ПДК рисуется, только если она в пределах графика (как раньше)
    stat.pdk.forEach((record, i) => {
      for (const [pdkKey, pdkValue] of Object.entries(record)) {
        if (
          typeof pdkValue === "number" &&
          pdkValue !== -1 &&
          normalize(pdkKey) === normalize(chartKey) &&
          maxValue > pdkValue
        ) {
          const color = PDK_COLORS[i % PDK_COLORS.length];

          shapes.push({
            type: "line", xref: "paper", x0: 0, x1: 1, y0: pdkValue, y1: pdkValue,
            line: { color, width: 1.5 },
          });
          annotations.push({
            showarrow: false, x: years[years.length - 1], y: pdkValue, text: pdkValue,
            hovertext: String(record["Название ПДК"] ?? "Нет данных"),
            font: { size: 14, color }, xanchor: "right", yanchor: "top",
          });
        }
      }
    });

    void import("plotly.js-dist-min").then((module) => {
      if (cancelled) return;
      plotly = ((module as { default?: PlotlyLike }).default ?? module) as PlotlyLike;

      plotly.newPlot(
        element,
        [{
          type: "bar", x: years, y: values, text: values, textposition: "auto", hoverinfo: "none",
          marker: { color: stat.color, opacity: 0.7, line: { color: "#000", width: 1.5 } },
        }],
        {
          title: chartKey, font: { size: 14 }, showlegend: false, shapes, annotations,
          paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
        },
        { displayModeBar: false, scrollZoom: false },
      );
    });

    return () => {
      cancelled = true;
      if (plotly) plotly.purge(element);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stat, chartKey]);

  if (values.length === 0) {
    return <div className="text-red-600">Данные для графика отсутствуют</div>;
  }

  return <div ref={ref} className="h-[320px] w-[480px] max-w-full" />;
}
