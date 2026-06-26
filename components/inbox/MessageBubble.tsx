"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/cn";
import { horaDe, nombreStaff } from "@/lib/format";
import type { Message } from "@/lib/data/types";

const EMOJIS = ["👍", "❤️", "🙏", "😊", "😮"];

export function MessageBubble({
  message,
  isNew,
  onReact,
}: {
  message: Message;
  isNew?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
}) {
  const esStaff = message.autor === "staff";
  const [abierto, setAbierto] = useState(false);
  const [reaccion, setReaccion] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Cierra el picker al hacer clic fuera de el.
  useEffect(() => {
    if (!abierto) return;
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [abierto]);

  function elegir(emoji: string) {
    setReaccion(emoji);
    setAbierto(false);
    onReact?.(message.id, emoji);
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        esStaff ? "items-end" : "items-start",
        isNew && "ccg-pop",
      )}
    >
      {/* Burbuja con picker de emojis */}
      <div className="group/bubble relative max-w-[78%]">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
            esStaff
              ? "rounded-br-sm bg-brand text-white"
              : "rounded-bl-sm bg-white text-[#0f1b2d] ring-1 ring-line",
            // Deja espacio inferior si hay una reaccion activa.
            reaccion && !esStaff && "mb-3",
          )}
        >
          {message.texto}
        </div>

        {/* Boton de reaccionar (solo mensajes del paciente) */}
        {!esStaff && onReact && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Reaccionar"
            className="absolute -right-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-[#94a3b4] opacity-0 shadow-sm transition hover:border-brand hover:text-brand group-hover/bubble:opacity-100"
          >
            <Smile size={13} />
          </button>
        )}

        {/* Picker de emojis */}
        {abierto && !esStaff && (
          <div
            ref={pickerRef}
            className="absolute left-0 top-full z-20 mt-1.5 flex gap-0.5 rounded-xl border border-line bg-white p-1.5 shadow-lg"
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => elegir(e)}
                aria-label={`Reaccionar con ${e}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition hover:bg-surface"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Reaccion activa pegada a la burbuja */}
        {reaccion && !esStaff && (
          <span className="absolute -bottom-2.5 left-2 rounded-full border border-line bg-white px-1.5 py-0.5 text-[12px] leading-none shadow-sm">
            {reaccion}
          </span>
        )}
      </div>

      <span className="mt-1 px-1 text-[10.5px] text-[#94a3b4]">
        {esStaff && message.staffId ? `${nombreStaff(message.staffId)} · ` : ""}
        {horaDe(message.ts)}
      </span>
    </div>
  );
}
