"use client";

import { cn } from "@/lib/cn";
import { useLive } from "@/lib/live-context";

// Solo pausa la simulacion de Facebook e Instagram. La etiqueta lo dice
// explicito: antes decia "En vivo / Pausado" y daba a entender que apagarlo
// tambien detenia WhatsApp, que es real y nunca se detiene.
export function LiveToggle() {
  const { enabled, toggle } = useLive();
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition",
        enabled
          ? "border-[#4ac12f]/30 bg-[#4ac12f]/10 text-[#2f9e2f]"
          : "border-line bg-surface text-[#94a3b4]",
      )}
      title={
        enabled
          ? "Simulando mensajes de Facebook e Instagram. WhatsApp siempre recibe mensajes reales."
          : "Simulación pausada. WhatsApp sigue recibiendo mensajes reales."
      }
    >
      <span className={cn("h-2 w-2 rounded-full", enabled ? "bg-[#4ac12f]" : "bg-[#94a3b4]")}>
        {enabled && <span className="block h-2 w-2 animate-ping rounded-full bg-[#4ac12f]" />}
      </span>
      {enabled ? "Simulando FB/IG" : "Simulación pausada"}
    </button>
  );
}
