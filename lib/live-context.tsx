"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface LiveContextValue {
  enabled: boolean;
  toggle: () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  // Encendido por defecto: la bandeja se siente viva al abrir la demo.
  // OJO: este toggle solo controla la SIMULACION de Facebook e Instagram.
  // Los mensajes de WhatsApp son reales y entran siempre, sin importar esto.
  const [enabled, setEnabled] = useState(true);
  return (
    <LiveContext.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive debe usarse dentro de <LiveProvider>");
  return ctx;
}
