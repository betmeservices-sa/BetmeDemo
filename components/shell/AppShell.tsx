"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { StoreProvider } from "@/lib/store";
import { LiveProvider } from "@/lib/live-context";
import { Sidebar } from "./Sidebar";
import { LiveMount } from "./LiveMount";

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <StoreProvider>
      <LiveProvider>
        <LiveMount />
        <div className="flex h-screen overflow-hidden">
          {/* Overlay para cerrar el drawer en móvil */}
          {navOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setNavOpen(false)}
              aria-hidden
            />
          )}

          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Barra superior solo en móvil */}
            <div className="flex items-center gap-3 border-b border-line bg-card px-4 py-2.5 lg:hidden">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Abrir menú"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5b6b80] transition hover:bg-surface"
              >
                <Menu size={22} />
              </button>
              <span className="text-sm font-extrabold tracking-tight text-[#0f1b2d]">
                Centro Ginecológico
              </span>
            </div>

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
          </div>
        </div>
      </LiveProvider>
    </StoreProvider>
  );
}
