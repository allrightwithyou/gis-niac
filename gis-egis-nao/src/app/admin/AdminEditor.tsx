"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TOOL_IDS, TOOL_TITLES, isToolId, type ToolId } from "@/app/lib/tools";

interface AdminSection {
  /** Ключ для React; у новых разделов id ещё нет */
  key: string;
  id?: number;
  name: string;
  shortName: string;
  category: string;
  statistic: string;
  img: string;
  shadowColor: string;
  visible: boolean;
  maps: number[];
}

interface ServerData {
  sections: Array<Omit<AdminSection, "key">>;
  tools: Record<string, string[]>;
  /** ID карт, у которых задан пароль */
  protectedMaps?: number[];
}

interface NgwMapInfo {
  id: number;
  name: string;
}

type ToolsState = Record<number, ToolId[]>;

const inputClass =
  "w-full rounded-[8px] border border-black/10 bg-white px-[10px] py-[6px] text-[13px] outline-none focus:border-accent";
const buttonClass =
  "rounded-[8px] border border-black/10 bg-white px-[10px] py-[4px] text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-40";

let newKeyCounter = 0;

function move<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;

  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

function toState(data: ServerData): { sections: AdminSection[]; tools: ToolsState; protectedMaps: number[] } {
  const tools: ToolsState = {};

  for (const [key, value] of Object.entries(data.tools)) {
    tools[Number(key)] = value.filter(isToolId);
  }

  return {
    sections: data.sections.map((section) => ({ ...section, key: `s${section.id}` })),
    tools,
    protectedMaps: data.protectedMaps ?? [],
  };
}

export default function AdminEditor() {
  const router = useRouter();

  const [sections, setSections] = useState<AdminSection[]>([]);
  const [tools, setTools] = useState<ToolsState>({});
  // Пароли карт: у каких карт задан, и открытая сейчас форма ввода пароля
  const [protectedMaps, setProtectedMaps] = useState<number[]>([]);
  const [passwordEditor, setPasswordEditor] = useState<{ resourceId: number; value: string } | null>(null);
  const [ngwMaps, setNgwMaps] = useState<NgwMapInfo[]>([]);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [dataResponse, mapsResponse] = await Promise.all([
          fetch("/api/admin/sections", { cache: "no-store" }),
          fetch("/api/admin/maps", { cache: "no-store" }),
        ]);

        if (dataResponse.status === 401) {
          router.push("/admin/login");
          return;
        }

        if (!dataResponse.ok) {
          const details = (await dataResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(details?.error ?? `Сервер ответил ${dataResponse.status}`);
        }

        const next = toState((await dataResponse.json()) as ServerData);

        if (cancelled) return;

        setSections(next.sections);
        setTools(next.tools);
        setProtectedMaps(next.protectedMaps);
        setSelectedKey(next.sections[0]?.key ?? null);

        if (mapsResponse.ok) {
          setNgwMaps((await mapsResponse.json()) as NgwMapInfo[]);
        } else {
          const data = (await mapsResponse.json().catch(() => null)) as { error?: string } | null;
          setMapsError(data?.error ?? `Список карт NGW: ответ ${mapsResponse.status}`);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            text: `Не удалось загрузить данные: ${error instanceof Error ? error.message : String(error)}`,
            error: true,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const selected = sections.find((section) => section.key === selectedKey) ?? null;
  const mapName = (id: number) => ngwMaps.find((map) => map.id === id)?.name ?? `Карта #${id}`;

  function editSections(update: (current: AdminSection[]) => AdminSection[]) {
    setSections(update);
    setDirty(true);
    setMessage(null);
  }

  function editSelected(patch: Partial<AdminSection>) {
    editSections((current) =>
      current.map((section) => (section.key === selectedKey ? { ...section, ...patch } : section)),
    );
  }

  function addSection() {
    const key = `new-${++newKeyCounter}`;

    editSections((current) => [
      ...current,
      {
        key,
        name: "Новый раздел",
        shortName: "Новый",
        category: "Категория",
        statistic: "",
        img: "",
        shadowColor: "#42A5F540",
        visible: false,
        maps: [],
      },
    ]);
    setSelectedKey(key);
  }

  function deleteSelected() {
    if (!selected || !window.confirm(`Удалить раздел «${selected.name}»?`)) return;

    editSections((current) => current.filter((section) => section.key !== selected.key));
    setSelectedKey(null);
  }

  function toggleTool(resourceId: number, tool: ToolId) {
    setTools((current) => {
      const active = current[resourceId] ?? [];
      const next = active.includes(tool) ? active.filter((t) => t !== tool) : [...active, tool];
      return { ...current, [resourceId]: next };
    });
    setDirty(true);
    setMessage(null);
  }

  /** Пароль карты сохраняется сразу (отдельно от кнопки «Сохранить»), он не зависит от разделов. */
  async function savePassword() {
    if (!passwordEditor) return;

    const response = await fetch(`/api/admin/maps/${passwordEditor.resourceId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordEditor.value }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage({ text: data?.error ?? "Не удалось задать пароль", error: true });
      return;
    }

    setProtectedMaps((current) =>
      current.includes(passwordEditor.resourceId) ? current : [...current, passwordEditor.resourceId],
    );
    setPasswordEditor(null);
    setMessage({ text: "Пароль карты сохранён", error: false });
  }

  async function removePassword(resourceId: number) {
    if (!window.confirm("Снять пароль? Карта станет доступна всем без пароля.")) return;

    const response = await fetch(`/api/admin/maps/${resourceId}/password`, { method: "DELETE" });

    if (!response.ok) {
      setMessage({ text: "Не удалось снять пароль", error: true });
      return;
    }

    setProtectedMaps((current) => current.filter((id) => id !== resourceId));
    setPasswordEditor(null);
    setMessage({ text: "Пароль снят", error: false });
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: sections.map((section) => ({
            id: section.id,
            name: section.name,
            shortName: section.shortName,
            category: section.category,
            statistic: section.statistic,
            img: section.img,
            shadowColor: section.shadowColor,
            visible: section.visible,
            maps: section.maps,
          })),
          tools,
        }),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | (ServerData & { error?: string })
        | null;

      if (!response.ok || !data) {
        setMessage({ text: data?.error ?? "Не удалось сохранить", error: true });
        return;
      }

      // Сервер вернул актуальные данные (у новых разделов появились ID)
      const index = sections.findIndex((section) => section.key === selectedKey);
      const next = toState(data);

      setSections(next.sections);
      setTools(next.tools);
      setProtectedMaps(next.protectedMaps);
      setSelectedKey(next.sections[index]?.key ?? next.sections[0]?.key ?? null);
      setDirty(false);
      setMessage({ text: "Сохранено", error: false });
    } catch {
      setMessage({ text: "Нет связи с сервером", error: true });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (loading) {
    return <main className="p-[24px] text-[14px] text-gray-500">Загрузка…</main>;
  }

  const availableMaps = selected
    ? ngwMaps.filter((map) => !selected.maps.includes(map.id))
    : [];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Шапка */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-[12px] border-b border-gray-200 bg-white px-[24px] py-[12px]">
        <h1 className="text-[16px] font-semibold">Администрирование портала</h1>

        <div className="flex items-center gap-[12px]">
          {message && (
            <span className={`text-[13px] ${message.error ? "text-red-600" : "text-green-600"}`}>
              {message.text}
            </span>
          )}
          {dirty && !message && <span className="text-[13px] text-gray-500">Есть несохранённые изменения</span>}

          <button
            onClick={() => void save()}
            disabled={!dirty || saving}
            className="rounded-[8px] bg-accent px-[16px] py-[6px] text-[13px] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          <Link href="/admin/news" className={buttonClass}>
            Новости
          </Link>
          <button onClick={() => void logout()} className={buttonClass}>
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] grid-cols-[320px_1fr] gap-[24px] p-[24px]">
        {/* Список разделов */}
        <aside className="flex flex-col gap-[8px]">
          {sections.map((section, index) => (
            <div
              key={section.key}
              onClick={() => setSelectedKey(section.key)}
              className={`cursor-pointer rounded-[12px] border-[2px] bg-white p-[10px] ${
                section.key === selectedKey ? "border-accent/40" : "border-black/10"
              }`}
            >
              <div className="flex items-start justify-between gap-[8px]">
                <div className="min-w-0">
                  <div className={`truncate text-[14px] font-medium ${section.visible ? "" : "text-gray-400"}`}>
                    {section.name}
                  </div>
                  <div className="truncate text-[12px] text-gray-500">{section.category}</div>
                </div>

                <div className="flex shrink-0 gap-[4px]" onClick={(event) => event.stopPropagation()}>
                  <button
                    className={buttonClass}
                    title="Выше"
                    disabled={index === 0}
                    onClick={() => editSections((current) => move(current, index, -1))}
                  >
                    ↑
                  </button>
                  <button
                    className={buttonClass}
                    title="Ниже"
                    disabled={index === sections.length - 1}
                    onClick={() => editSections((current) => move(current, index, 1))}
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="mt-[4px] text-[11px] text-gray-500">
                {section.visible ? "Показывается" : "Скрыт"} · карт: {section.maps.length}
              </div>
            </div>
          ))}

          <button onClick={addSection} className={`${buttonClass} py-[8px]`}>
            + Добавить раздел
          </button>
        </aside>

        {/* Редактор раздела */}
        {selected ? (
          <section className="flex flex-col gap-[20px] rounded-[12px] border-[2px] border-black/10 bg-white p-[20px]">
            <div className="grid grid-cols-2 gap-[12px]">
              <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
                Название
                <input className={inputClass} value={selected.name} onChange={(e) => editSelected({ name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
                Краткое название
                <input className={inputClass} value={selected.shortName} onChange={(e) => editSelected({ shortName: e.target.value })} />
              </label>
              <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
                Категория
                <input className={inputClass} value={selected.category} onChange={(e) => editSelected({ category: e.target.value })} />
              </label>
              <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
                Статистика
                <input className={inputClass} value={selected.statistic} onChange={(e) => editSelected({ statistic: e.target.value })} />
              </label>
              <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
                Картинка (путь в /public)
                <input className={inputClass} placeholder="/apk.svg" value={selected.img} onChange={(e) => editSelected({ img: e.target.value })} />
              </label>
              <label className="flex flex-col gap-[4px] text-[12px] text-gray-500">
                Цвет тени
                <div className="flex gap-[8px]">
                  <input
                    type="color"
                    className="h-[32px] w-[44px] cursor-pointer rounded-[8px] border border-black/10"
                    value={selected.shadowColor.slice(0, 7)}
                    // Прозрачность (последние 2 символа, например «40») сохраняется
                    onChange={(e) => editSelected({ shadowColor: e.target.value + (selected.shadowColor.slice(7) || "40") })}
                  />
                  <input className={inputClass} value={selected.shadowColor} onChange={(e) => editSelected({ shadowColor: e.target.value })} />
                </div>
              </label>
            </div>

            <label className="flex items-center gap-[8px] text-[13px]">
              <input type="checkbox" checked={selected.visible} onChange={(e) => editSelected({ visible: e.target.checked })} />
              Показывать раздел на главной странице
            </label>

            {/* Карты раздела */}
            <div className="flex flex-col gap-[10px]">
              <h2 className="text-[14px] font-semibold">Карты раздела</h2>

              {mapsError && (
                <p className="text-[12px] text-amber-600">
                  Общий список карт NGW недоступен ({mapsError}) — названия карт не показаны.
                </p>
              )}

              {selected.maps.length === 0 && <p className="text-[13px] text-gray-500">В разделе пока нет карт.</p>}

              {selected.maps.map((resourceId, index) => (
                <div key={resourceId} className="rounded-[10px] border border-black/10 p-[10px]">
                  <div className="flex items-center justify-between gap-[8px]">
                    <div className="min-w-0 text-[13px]">
                      <span className="font-medium">{mapName(resourceId)}</span>
                      <span className="ml-[6px] text-[11px] text-gray-400">ID {resourceId}</span>
                    </div>

                    <div className="flex shrink-0 gap-[4px]">
                      <button className={buttonClass} disabled={index === 0} onClick={() => editSelected({ maps: move(selected.maps, index, -1) })}>↑</button>
                      <button className={buttonClass} disabled={index === selected.maps.length - 1} onClick={() => editSelected({ maps: move(selected.maps, index, 1) })}>↓</button>
                      <button
                        className={buttonClass}
                        title="Пароль для входа на эту карту"
                        onClick={() =>
                          setPasswordEditor(passwordEditor?.resourceId === resourceId ? null : { resourceId, value: "" })
                        }
                      >
                        {protectedMaps.includes(resourceId) ? "🔒 Пароль задан" : "Пароль"}
                      </button>
                      <button className={buttonClass} onClick={() => editSelected({ maps: selected.maps.filter((id) => id !== resourceId) })}>Убрать</button>
                    </div>
                  </div>

                  {/* Пароль карты: посетитель увидит форму ввода пароля вместо карты */}
                  {passwordEditor?.resourceId === resourceId && (
                    <div className="mt-[8px] flex flex-wrap items-center gap-[6px] rounded-[8px] bg-gray-50 p-[8px]">
                      <input
                        className={`${inputClass} max-w-[240px]`}
                        placeholder={protectedMaps.includes(resourceId) ? "Новый пароль" : "Пароль (не короче 4 символов)"}
                        autoComplete="off"
                        value={passwordEditor.value}
                        onChange={(e) => setPasswordEditor({ resourceId, value: e.target.value })}
                      />
                      <button className={buttonClass} disabled={passwordEditor.value.length < 4} onClick={() => void savePassword()}>
                        Сохранить пароль
                      </button>
                      {protectedMaps.includes(resourceId) && (
                        <button className={buttonClass} onClick={() => void removePassword(resourceId)}>
                          Снять пароль
                        </button>
                      )}
                      <button className={buttonClass} onClick={() => setPasswordEditor(null)}>
                        Отмена
                      </button>
                    </div>
                  )}

                  {/* Инструменты этой карты (настройка общая для карты во всех разделах) */}
                  <div className="mt-[8px] flex flex-wrap gap-[6px]">
                    {TOOL_IDS.map((tool) => {
                      const active = (tools[resourceId] ?? []).includes(tool);

                      return (
                        <button
                          key={tool}
                          onClick={() => toggleTool(resourceId, tool)}
                          className={`rounded-full border px-[10px] py-[3px] text-[11px] ${
                            active
                              ? "border-accent/30 bg-accent/10 text-accent"
                              : "border-black/10 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {TOOL_TITLES[tool]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-[8px]">
                <select
                  className={inputClass}
                  value=""
                  disabled={availableMaps.length === 0}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) editSelected({ maps: [...selected.maps, id] });
                  }}
                >
                  <option value="">+ Добавить карту из NGW…</option>
                  {availableMaps.map((map) => (
                    <option key={map.id} value={map.id}>
                      {map.name} (ID {map.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button onClick={deleteSelected} className="text-[12px] text-red-600 hover:underline">
                Удалить раздел
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-[12px] border-[2px] border-black/10 bg-white p-[20px] text-[13px] text-gray-500">
            Выберите раздел слева или добавьте новый.
          </section>
        )}
      </div>
    </main>
  );
}
