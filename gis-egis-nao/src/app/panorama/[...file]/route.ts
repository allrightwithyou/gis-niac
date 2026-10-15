import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Отдаёт файлы панорам из папки app/panorama/ по адресам /panorama/…
 * (плеер pano2vr_player.js, скин skin.js, pano.xml, images/*, тайлы) —
 * те же адреса, что были в прежней версии.
 *
 * Файлы из app/ браузеру напрямую не отдаются, поэтому нужен этот обработчик.
 * Отдаются только файлы известных типов (CONTENT_TYPES), исходники .ts/.tsx — никогда.
 * Для деплоя на Vercel папка должна быть включена в сборку через
 * outputFileTracingIncludes в next.config.ts.
 */

const cwd = process.cwd();

const SEARCH_DIRS = [
  path.join(cwd, "src", "app", "panorama"),
  path.join(cwd, "app", "panorama"),
];

const CONTENT_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string[] }> },
) {
  const { file } = await context.params;
  const relative = file.map(decodeURIComponent);

  const contentType =
    CONTENT_TYPES[path.extname(relative.join("/")).toLowerCase()];

  if (contentType) {
    for (const dir of SEARCH_DIRS) {
      // Защита от выхода за пределы папки (../)
      const requested = path.resolve(dir, ...relative);

      if (!requested.startsWith(dir + path.sep)) continue;

      try {
        const body = await readFile(requested);

        return new Response(new Uint8Array(body), {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        // в этой папке файла нет — пробуем следующую
      }
    }
  }

  return new Response(
    `Не найден: ${relative.join("/")}\nИскал в:\n${SEARCH_DIRS.join("\n")}`,
    { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
