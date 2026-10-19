"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Медиа объекта в карточке идентификации (вкладка «Параметры» в сайдбаре):
 *  - фотографии из хранилища bgstorage (одна или несколько) — небольшие миниатюры,
 *    по клику увеличение со стрелками;
 *  - онлайн-камера (cam.ncec.ru), если у объекта есть camId.
 *
 * Фотографии в данных хранятся в полях-значениях с префиксами (как в прежней версии):
 *   bg_picture_link:имя.jpg                      — одно фото
 *   bg_track_picture_link:имя1.jpg___имя2.jpg    — несколько фото
 * Значения читаются из «сырых» свойств объекта (item.feature.properties): скрытые поля
 * не попадают в item.fields, но в свойствах остаются.
 */

// ── Настройки ────────────────────────────────────────────────────────────────

/** Адрес хранилища фотографий (можно переопределить через NEXT_PUBLIC_BGSTORAGE_URL). */
const BGSTORAGE_URL = (
  process.env.NEXT_PUBLIC_BGSTORAGE_URL ?? "https://geoportal.adm-nao.ru/bgstorage"
).replace(/\/$/, "");

const PHOTO_PREFIX = "bg_picture_link:";
const TRACK_PHOTOS_PREFIX = "bg_track_picture_link:";
const TRACK_PHOTOS_SEPARATOR = "___";

/**
 * Признак камеры — значение поля, начинающееся с «camid:» (как в прежней версии).
 * Номер берётся из самого значения («camid:68»), а если там только «camid:» —
 * из отдельного свойства объекта camid.
 */
const CAM_ID_PATTERN = /^\s*camid\s*:\s*(\d+)/i;
const CAM_MARKER_PATTERN = /^\s*camid\s*:/i;

/** Значение — служебная ссылка на медиа (фото/камера): в карточке текстом не показывается. */
export function isMediaValue(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (value.startsWith(PHOTO_PREFIX) ||
      value.startsWith(TRACK_PHOTOS_PREFIX) ||
      CAM_MARKER_PATTERN.test(value))
  );
}

/** Размеры плеера камеры в сайдбаре (передаются во встраиваемую страницу). */
const CAM_WIDTH = 338;
const CAM_HEIGHT = 190;

const CAM_EMBED_URL = "https://cam.ncec.ru/site/embed.html";

// ── Извлечение данных из объекта ─────────────────────────────────────────────

interface MediaItem {
  feature?: { properties?: Record<string, unknown> };
}

interface Photo {
  url: string;
  /** Подпись: имя файла без .jpg (как в прежней версии) */
  title: string;
}

function findValue(
  properties: Record<string, unknown>,
  matcher: (key: string) => boolean,
): unknown {
  const key = Object.keys(properties).find(matcher);
  return key === undefined ? undefined : properties[key];
}

/** Строка, массив или JSON-массив → список непустых строк. */
function toList(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap(toList);
  }

  const text = String(value).trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      return toList(JSON.parse(text));
    } catch {
      // не JSON — разбираем как обычную строку
    }
  }

  return text
    .split(/[\n;,|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const toPhoto = (fileName: string): Photo => ({
  url: `${BGSTORAGE_URL}/${fileName}`,
  title: fileName.replace(".jpg", ""),
});

export function getItemMedia(item: MediaItem): {
  photos: Photo[];
  camId: string | null;
  seeAlsoCamIds: string[];
} {
  const properties = item.feature?.properties ?? {};
  const fileNames: string[] = [];
  let camFromValue: string | null = null;
  let camMarkerSeen = false;

  // Фото лежат в значениях с префиксами — проверяем все свойства объекта
  for (const value of Object.values(properties)) {
    if (typeof value !== "string") continue;

    if (CAM_MARKER_PATTERN.test(value)) {
      camMarkerSeen = true;
      const camMatch = value.match(CAM_ID_PATTERN);
      if (camMatch && !camFromValue) camFromValue = camMatch[1];
      continue;
    }

    if (value.startsWith(PHOTO_PREFIX)) {
      fileNames.push(value.slice(PHOTO_PREFIX.length));
    } else if (value.startsWith(TRACK_PHOTOS_PREFIX)) {
      fileNames.push(
        ...value
          .slice(TRACK_PHOTOS_PREFIX.length)
          .split(TRACK_PHOTOS_SEPARATOR),
      );
    }
  }

  const photos = [...new Set(fileNames.map((name) => name.trim()).filter(Boolean))].map(
    toPhoto,
  );

  const camRaw = toList(findValue(properties, (key) => /^cam[_-]?id$/i.test(key)));

  // «camid:» без номера в значении — номер лежит в отдельном свойстве camid (как в оригинале)
  const camFromProperty = camMarkerSeen
    ? String(camRaw[0] ?? "").replace(/^\s*camid\s*:\s*/i, "").trim() || null
    : null;
  const seeAlso = toList(findValue(properties, (key) => /^cam[_-]?ids$/i.test(key)));

  return {
    photos,
    camId: camFromValue ?? camFromProperty ?? camRaw[0] ?? null,
    seeAlsoCamIds: seeAlso,
  };
}

// ── Компоненты ───────────────────────────────────────────────────────────────

export default function IdentifyMedia({ item }: { item: MediaItem }) {
  const { photos, camId, seeAlsoCamIds } = getItemMedia(item);

  if (photos.length === 0 && !camId) return null;

  return (
    <div className="mb-3 space-y-3">
      {photos.length > 0 && <PhotoGallery photos={photos} />}
      {camId && <CameraEmbed camId={camId} seeAlsoCamIds={seeAlsoCamIds} />}
    </div>
  );
}

/** Миниатюры фотографий; по клику — просмотр на весь экран со стрелками. */
function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  const visible = photos.filter((photo) => !broken.has(photo.url));

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % visible.length));
      if (event.key === "ArrowLeft") {
        setOpenIndex((i) => (i === null ? i : (i - 1 + visible.length) % visible.length));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, visible.length]);

  if (photos.length === 0) return null;

  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
        Фото{photos.length > 1 ? ` (${photos.length})` : ""}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo) =>
          broken.has(photo.url) ? (
            // Фото не загрузилось — показываем заметную плитку со ссылкой, а не скрываем молча
            <a
              key={photo.url}
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Фото недоступно: ${photo.url}`}
              className="flex h-[72px] w-[96px] shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-red-300 bg-red-50 px-1 text-center text-[10px] leading-tight text-red-600"
            >
              <span className="text-[14px]">⚠</span>
              не загрузилось
              <span className="underline">открыть ссылку</span>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.url}
              src={photo.url}
              alt={photo.title}
              title={photo.title}
              loading="lazy"
              onClick={() => setOpenIndex(visible.indexOf(photo))}
              onError={() => {
                console.warn("Фото не загрузилось:", photo.url);
                setBroken((prev) => new Set(prev).add(photo.url));
              }}
              className="h-[72px] w-[96px] shrink-0 cursor-zoom-in rounded-md border border-gray-200 object-cover shadow-sm transition hover:opacity-90"
            />
          ),
        )}
      </div>

      {/* Просмотр выносим в <body>: внутри сайдбара его перекрывают панели инструментов карты */}
      {openIndex !== null &&
        visible[openIndex] &&
        createPortal(
          <div
            data-photo-viewer="portal"
            className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
            // Максимальный z-index инлайном (не классом Tailwind): окно должно быть выше
            // панелей инструментов и кнопок Leaflet при любых настройках сборки стилей
            style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
            onClick={() => setOpenIndex(null)}
          >
            {/* Пока открыто фото, скрываем элементы карты: панели инструментов, кнопки, координаты */}
            <style>{`.leaflet-control-container, [data-map-overlay] { visibility: hidden !important; }`}</style>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={visible[openIndex].url}
              alt={visible[openIndex].title}
              className="max-h-full max-w-full rounded shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />

            <div className="absolute left-1/2 top-4 max-w-[80%] -translate-x-1/2 truncate rounded-full bg-black/50 px-3 py-1 text-[12px] text-white">
              {visible[openIndex].title}
            </div>

            {visible.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-xl text-white hover:bg-white/30"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenIndex((openIndex - 1 + visible.length) % visible.length);
                  }}
                >
                  ‹
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-xl text-white hover:bg-white/30"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenIndex((openIndex + 1) % visible.length);
                  }}
                >
                  ›
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[12px] text-white">
                  {openIndex + 1} / {visible.length}
                </div>
              </>
            )}

            <button
              className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white/30"
              onClick={() => setOpenIndex(null)}
            >
              ✕
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Онлайн-камера cam.ncec.ru: тот же iframe, что собирал исходный скрипт
 * (document.write), но как обычный React-элемент.
 */
function CameraEmbed({
  camId,
  seeAlsoCamIds,
}: {
  camId: string;
  seeAlsoCamIds: string[];
}) {
  const params = new URLSearchParams({
    id: camId,
    autostart: "true",
    html5: "true",
    logo: "",
    w: String(CAM_WIDTH),
    h: String(CAM_HEIGHT),
    ids: seeAlsoCamIds.length ? JSON.stringify(seeAlsoCamIds) : "",
  });

  const height = CAM_HEIGHT + (seeAlsoCamIds.length ? 200 : 0);

  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
        Онлайн-камера
      </div>

      <iframe
        title={`Камера ${camId}`}
        src={`${CAM_EMBED_URL}?${params.toString()}`}
        // Минимум прав: скрипты и same-origin нужны плееру. Без allow-top-navigation и allow-popups
        // плеер не может ни перенаправить страницу карты, ни открыть сайт камер в новой вкладке.
        sandbox="allow-same-origin allow-scripts"
        loading="lazy"
        scrolling="no"
        allowFullScreen
        style={{
          width: CAM_WIDTH,
          maxWidth: "100%",
          height,
          border: "1px solid rgba(91, 91, 91, 0.1)",
          boxSizing: "border-box",
        }}
        className="rounded-md bg-black"
      />
    </div>
  );
}

// ── Значения полей со ссылками (как в прежней версии) ─────────────────────────

const iconClass = "inline-block align-middle";

function ShareIcon() {
  return (
    <svg className={iconClass} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function PanoramaIcon() {
  return (
    <svg className={iconClass} width="24" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 6c6 2.5 14 2.5 20 0v12c-6-2.5-14-2.5-20 0z" />
      <circle cx="8" cy="10.5" r="1.3" />
      <path d="M4 16l5-4 3 2.5 3-3 5 4" />
    </svg>
  );
}

const linkClass = "text-accent/70 hover:text-accent";

/**
 * Значение поля в карточке объекта:
 *  - http(s)://…           → значок-ссылка «Подробнее» (в новой вкладке);
 *  - redbook_link:ID       → ссылка на запись Красной книги /redbook/ID/view;
 *  - panorama_nodeX        → значок «Панорама» → /panorama?<nodeID>&<название>
 *    (nodeID берётся из свойства `nodes`: «…_<nodeID>», название — из `name`;
 *    значение panorama_node0 означает «панорамы нет»);
 *  - иначе — обычный текст.
 *
 * properties — «сырые» свойства объекта (item.feature.properties).
 */
export function IdentifyFieldValue({
  value,
  properties,
}: {
  value: unknown;
  properties?: Record<string, unknown>;
}) {
  const text = value == null ? "" : String(value);

  if (/^https?:\/\//.test(text)) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" title="Подробнее" className={linkClass}>
        <ShareIcon />
      </a>
    );
  }

  if (text.startsWith("redbook_link:")) {
    return (
      <a href={`/redbook/${text.replace("redbook_link:", "")}/view`} title="Подробнее" className={linkClass}>
        <ShareIcon />
      </a>
    );
  }

  if (text.startsWith("panorama_node")) {
    if (text === "panorama_node0") return null;

    const nodeId = String(properties?.nodes ?? "").split("_")[1];
    const nodeName = String(properties?.name ?? "");

    if (!nodeId) return null;

    return (
      <a
        href={`/panorama?${encodeURIComponent(nodeId)}&${encodeURIComponent(nodeName)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Панорама"
        className={linkClass}
      >
        <PanoramaIcon />
      </a>
    );
  }

  return <>{text}</>;
}
