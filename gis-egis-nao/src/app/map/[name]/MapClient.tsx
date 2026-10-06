"use client";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useEffect, useRef, useState } from "react";

interface SectionData {
  name: string;
  category: string;
  shortName: string;
  img: string;
  resourceIds: number[];
  statistic?: string;
}

interface MapClientProps {
  section: SectionData;
  resourceId: number;
}

interface MapInstance {
  destroy?: () => void;
}

export default function MapClient({ section, resourceId }: MapClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<MapInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const target = mapElement.current;

      if (!target || !resourceId) {
        return;
      }

      try {
        const module = await import("@nextgis/ngw-leaflet");
        const NgwMap = module.default;

        if (cancelled || !mapElement.current) {
          return;
        }

        const map = await NgwMap.create({
          baseUrl: process.env.NEXT_PUBLIC_NGW_BASE_URL,
          target: mapElement.current,
          webmapId: resourceId,
        });

        if (cancelled) {
          map.destroy();
          return;
        }

        mapInstance.current = map;
      } catch (error) {
        console.error("Ошибка инициализации карты:", error);
      }
    }

    void initMap();
    console.log({
      baseUrl: process.env.NEXT_PUBLIC_NGW_BASE_URL,
      resourceId,
      width: mapElement.current?.clientWidth,
      height: mapElement.current?.clientHeight,
    });
    return () => {
      cancelled = true;
      mapInstance.current?.destroy();
      mapInstance.current = null;
    };
  }, [resourceId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        section={section}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex min-h-0 flex-1">
        <div ref={mapElement} className="h-full w-full flex-1" />
      </div>
    </div>
  );
}
