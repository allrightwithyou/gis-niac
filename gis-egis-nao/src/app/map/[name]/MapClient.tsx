"use client"; // ТОЛЬКО здесь пишем "use client"

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useState } from "react";
import type { Layer, Marker } from "@/app/main/data";

// Пропсы, которые мы получаем от серверного родителя
interface MapClientProps {
  section: {
    name: string;
    category: string;
    shortName: string;
    img: string;
    layers: Layer[];
    markers: Marker[]; 
  };
}

export default function MapClient({ section }: MapClientProps) {
  // Состояние теперь живет здесь, и это нормально, так как компонент клиентский
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header 
        section={section} 
        onToggleSidebar={handleToggleSidebar} 
      />
      
      <Sidebar
        isOpen={isSidebarOpen}
        layers={section.layers}
        markers={section.markers}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 bg-gray-100">
        <p>Здесь будет карта</p>
      </div>
    </div>
  );
}
