"use client";

import { useEffect, useState } from "react";

/**
 * Страница панорамы (Pano2VR 5.2). Адрес открывается из карточки объекта в формате,
 * как в прежней версии: /panorama?<nodeID>&<название>
 *
 * Файлы лежат рядом со страницей, в src/app/panorama/, и отдаются как /panorama/…
 * (обработчик src/app/panorama/[...file]/route.ts):
 *   pano2vr_player.js  — плеер (pano2vrPlayer)
 *   skin.js            — скин (pano2vrSkin)
 *   pano.xml           — конфигурация узлов панорам (+ папки с тайлами, на которые она ссылается)
 *   images/            — иконки скина (fullscreen_off.svg и др.)
 * Другое расположение можно задать переменной NEXT_PUBLIC_PANORAMA_BASE.
 */

const PANORAMA_BASE = (
  process.env.NEXT_PUBLIC_PANORAMA_BASE ?? "/panorama"
).replace(/\/$/, "");

interface PanoPlayer {
  readConfigUrl: (url: string) => void;
  openNext: (node: string) => void;
}

interface PanoWindow {
  pano2vrPlayer?: new (containerId: string) => PanoPlayer;
  pano2vrSkin?: new (player: PanoPlayer, basePath?: string) => unknown;
}

const scriptCache = new Map<string, Promise<void>>();

/** Подключает скрипт один раз; повторные вызовы возвращают тот же промис. */
function loadScript(src: string): Promise<void> {
  const cached = scriptCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptCache.delete(src);

      // Выясняем, что на самом деле отвечает сервер по этому адресу
      void fetch(src)
        .then(async (response) => {
          const body = (await response.text())
            .replace(/\s+/g, " ")
            .slice(0, 160);
          reject(
            new Error(
              `${src} → ответ ${response.status} (${response.headers.get("content-type") ?? "без типа"}): ${body}`,
            ),
          );
        })
        .catch(() => reject(new Error(`не удалось запросить ${src}`)));
    };
    document.body.appendChild(script);
  });

  scriptCache.set(src, promise);
  return promise;
}

export default function PanoramaPage() {
  const [nodeName, setNodeName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Как в оригинале: параметры идут без ключей — ?<nodeID>&<название>
    const params = window.location.search.substring(1).split("&");
    const nodeID = decodeURIComponent(params[0] ?? "");
    setNodeName(decodeURIComponent(params[1] ?? ""));

    if (!nodeID) {
      setError("Не указан узел панорамы");
      return;
    }

    void (async () => {
      try {
        await loadScript(`${PANORAMA_BASE}/pano2vr_player.js`);
        await loadScript(`${PANORAMA_BASE}/skin.js`);

        if (cancelled) return;

        const w = window as unknown as PanoWindow;
        if (!w.pano2vrPlayer || !w.pano2vrSkin) {
          throw new Error(
            "скрипты загрузились, но pano2vrPlayer/pano2vrSkin не появились (проверьте содержимое файлов)",
          );
        }

        // Конфигурацию плеер читает сам и при ошибке молчит — проверяем заранее
        const xmlUrl = `${PANORAMA_BASE}/pano.xml`;
        const xmlResponse = await fetch(xmlUrl, { method: "GET" });
        if (!xmlResponse.ok) {
          throw new Error(
            `pano.xml не найден (${xmlResponse.status}): ${xmlUrl}`,
          );
        }

        const pano = new w.pano2vrPlayer("container");
        // Второй аргумент — папка скина, чтобы иконки images/… брались из <base>/images/
        new w.pano2vrSkin(pano, `${PANORAMA_BASE}/`);

        pano.readConfigUrl(`${PANORAMA_BASE}/pano.xml`);
        pano.openNext(`{${nodeID}}`);
      } catch (loadError) {
        console.error("Панорама:", loadError);
        if (!cancelled) {
          setError(
            `Не удалось загрузить панораму: ${loadError instanceof Error ? loadError.message : String(loadError)}`,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      const container = document.getElementById("container");
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <div id="container" className="h-full w-full" />

      {nodeName && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-[70%] truncate rounded-full bg-black/60 px-4 py-1.5 text-[13px] text-white">
          {nodeName}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] text-white">
          {error}
        </div>
      )}
    </div>
  );
}
