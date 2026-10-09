"use client";

import { useState, type ReactNode } from "react";

/**
 * UI-панели инструментов карты. Вся логика (запросы, слои, выделение)
 * остаётся в MapClient — здесь только отображение и локальное состояние форм.
 */

export interface SelectOption {
  value: string;
  label: string;
}

interface PanelPoint {
  lat: number;
  lng: number;
}

export function ToolPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute left-[56px] top-[10px] z-[1000] w-[280px] rounded bg-white p-3 text-[13px] text-gray-800 shadow">
      <div className="mb-2 font-semibold">{title}</div>
      {children}
    </div>
  );
}

const buttonClass =
  "rounded border border-gray-300 bg-gray-50 px-2 py-1 text-[12px] hover:bg-gray-100";

// ── Выбор объекта из списка (рыболовные участки, нас. пункты, ЗСО, ОКС) ──────

export function SelectToolPanel({
  title,
  placeholder,
  options,
  loading,
  message,
  onChange,
}: {
  title: string;
  placeholder: string;
  options: SelectOption[];
  loading: boolean;
  message?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <ToolPanel title={title}>
      {loading ? (
        <div className="text-gray-500">Загрузка…</div>
      ) : message ? (
        <div className="text-red-600">{message}</div>
      ) : (
        <select
          defaultValue=""
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </ToolPanel>
  );
}

// ── Добавление объектов по координатам ───────────────────────────────────────

export function CoordInputPanel({
  onDraw,
  onClear,
}: {
  onDraw: (
    kind: "points" | "lines" | "polygons",
    text: string,
    color: string,
  ) => Promise<string | null>;
  onClear: () => void;
}) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#ff0000");
  const [error, setError] = useState<string | null>(null);

  async function draw(kind: "points" | "lines" | "polygons") {
    setError(await onDraw(kind, text, color));
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setText(await file.text());
    setError(null);
  }

  return (
    <ToolPanel title="Добавить объекты по координатам">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"По одной точке в строке:\n69.0417 33.0833\n69°02′30″ 33°05′00″"}
        rows={6}
        className="mb-2 w-full rounded border border-gray-300 p-2 font-mono text-[12px]"
      />

      <div className="mb-2 flex items-center gap-2">
        <input
          type="file"
          accept=".txt,.csv"
          onChange={(e) => void handleFile(e.target.files?.[0])}
          className="min-w-0 flex-1 text-[12px]"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Цвет"
          className="h-7 w-9 cursor-pointer"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <button className={buttonClass} onClick={() => void draw("points")}>
          Точки
        </button>
        <button className={buttonClass} onClick={() => void draw("lines")}>
          Линия
        </button>
        <button className={buttonClass} onClick={() => void draw("polygons")}>
          Полигон
        </button>
        <button className={buttonClass} onClick={onClear}>
          Очистить
        </button>
      </div>

      {error && <div className="mt-2 text-red-600">{error}</div>}
    </ToolPanel>
  );
}

// ── Получение координат по клику на карте ────────────────────────────────────

export function CoordPickerPanel({
  points,
  onClear,
}: {
  points: PanelPoint[];
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // Тот же формат («широта долгота»), что принимает инструмент добавления по координатам
  const textValue = points
    .map((p) => `${p.lat.toFixed(6)} ${p.lng.toFixed(6)}`)
    .join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(textValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Не удалось скопировать координаты:", error);
    }
  }

  return (
    <ToolPanel title="Координаты по клику">
      <pre className="mb-2 max-h-[200px] min-h-[48px] overflow-auto rounded border border-gray-200 bg-gray-50 p-2 font-mono text-[12px]">
        {textValue || "Кликните по карте"}
      </pre>
      <div className="flex gap-1">
        <button
          className={buttonClass}
          onClick={() => void copy()}
          disabled={points.length === 0}
        >
          {copied ? "Скопировано" : "Копировать"}
        </button>
        <button
          className={buttonClass}
          onClick={onClear}
          disabled={points.length === 0}
        >
          Очистить
        </button>
      </div>
    </ToolPanel>
  );
}
