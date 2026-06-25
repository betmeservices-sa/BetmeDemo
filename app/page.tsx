"use client";

import { useMemo, useState } from "react";
import { MessageSquareDashed } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { ME } from "@/lib/data/seed";
import { EmptyState } from "@/components/ui/EmptyState";
import { LiveToggle } from "@/components/shell/LiveToggle";
import { InboxFilters, type Filtros } from "@/components/inbox/InboxFilters";
import { ConversationList, type ListaItem } from "@/components/inbox/ConversationList";
import { Thread } from "@/components/inbox/Thread";
import { ContextPanel } from "@/components/inbox/ContextPanel";
import type { ConversationStatus, DepartmentId } from "@/lib/data/types";

const FILTROS_INICIALES: Filtros = {
  canal: "todos",
  estado: "todos",
  asignacion: "todas",
  departamento: "todos",
};

export default function BandejaPage() {
  const { state, dispatch } = useStore();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [activaId, setActivaId] = useState<string | null>(null);
  const [ctxOpen, setCtxOpen] = useState(false); // panel de contexto en móvil

  const contactoDe = useMemo(
    () => new Map(state.contacts.map((c) => [c.id, c])),
    [state.contacts],
  );

  // Último mensaje por conversación.
  const ultimoDe = useMemo(() => {
    const m = new Map<string, (typeof state.messages)[number]>();
    for (const msg of state.messages) {
      const prev = m.get(msg.conversationId);
      if (!prev || msg.ts > prev.ts) m.set(msg.conversationId, msg);
    }
    return m;
  }, [state.messages]);

  const items: ListaItem[] = useMemo(() => {
    return state.conversations
      .filter((c) => filtros.canal === "todos" || c.canal === filtros.canal)
      .filter((c) => filtros.estado === "todos" || c.estado === filtros.estado)
      .filter((c) => {
        if (filtros.asignacion === "mias") return c.asignadoA === ME;
        if (filtros.asignacion === "sin_asignar") return !c.asignadoA;
        return true;
      })
      .filter((c) => filtros.departamento === "todos" || c.departamento === filtros.departamento)
      .sort((a, b) => b.ultimoMensajeTs.localeCompare(a.ultimoMensajeTs))
      .map((conversation) => ({
        conversation,
        contact: contactoDe.get(conversation.contactId)!,
        ultimo: ultimoDe.get(conversation.id),
      }));
  }, [state.conversations, filtros, contactoDe, ultimoDe]);

  const activa = activaId ? state.conversations.find((c) => c.id === activaId) ?? null : null;
  const contactoActivo = activa ? contactoDe.get(activa.contactId)! : null;
  const mensajesActivos = useMemo(() => {
    if (!activa) return [];
    return state.messages
      .filter((m) => m.conversationId === activa.id)
      .sort((a, b) => a.ts.localeCompare(b.ts));
  }, [state.messages, activa]);

  function seleccionar(id: string) {
    setActivaId(id);
    dispatch({ type: "MARK_READ", conversationId: id });
  }

  const sinLeerTotal = state.conversations.reduce((sum, c) => sum + c.noLeidos, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar (se oculta en móvil cuando hay una conversación abierta) */}
      <header
        className={cn(
          "items-center justify-between border-b border-line bg-card px-5 py-3 lg:flex",
          activa ? "hidden lg:flex" : "flex",
        )}
      >
        <div>
          <h1 className="text-[17px] font-extrabold tracking-tight text-[#0f1b2d]">
            Bandeja unificada
          </h1>
          <p className="text-[12.5px] text-[#94a3b4]">
            {state.conversations.length} conversaciones · {sinLeerTotal} sin leer
          </p>
        </div>
        <LiveToggle />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Columna 1: lista */}
        <section
          className={cn(
            "shrink-0 flex-col border-r border-line bg-card lg:flex lg:w-[340px]",
            activa ? "hidden" : "flex w-full",
          )}
        >
          <InboxFilters filtros={filtros} onChange={setFiltros} />
          <ConversationList items={items} activaId={activaId} onSelect={seleccionar} />
        </section>

        {/* Columna 2: hilo */}
        <section className={cn("min-w-0 flex-1 flex-col", activa ? "flex" : "hidden lg:flex")}>
          {activa && contactoActivo ? (
            <Thread
              conversation={activa}
              contact={contactoActivo}
              messages={mensajesActivos}
              esMia={activa.asignadoA === ME}
              onBack={() => setActivaId(null)}
              onInfo={() => setCtxOpen(true)}
              onSend={(texto) => {
                dispatch({ type: "SEND_MESSAGE", conversationId: activa.id, texto, staffId: ME });
                if (activa.canal === "whatsapp" && contactoActivo.telefono) {
                  fetch("/api/whatsapp/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ to: contactoActivo.telefono, text: texto }),
                  })
                    .then((r) => r.json())
                    .then((d) => {
                      if (!d.ok) console.error("WhatsApp send falló:", d.error);
                    })
                    .catch((e) => console.error("WhatsApp send error:", e));
                }
              }}
              onAsignarme={() =>
                dispatch({ type: "ASSIGN", conversationId: activa.id, staffId: ME })
              }
              onResolver={() =>
                dispatch({
                  type: "SET_STATUS",
                  conversationId: activa.id,
                  estado: activa.estado === "resuelto" ? "en_progreso" : "resuelto",
                })
              }
            />
          ) : (
            <EmptyState
              Icon={MessageSquareDashed}
              titulo="Selecciona una conversación"
              descripcion="Elige un mensaje de la lista para ver y responder la conversación."
            />
          )}
        </section>

        {/* Columna 3: contexto (estática en desktop) */}
        {activa && contactoActivo && (
          <div className="hidden lg:flex">
            <ContextPanel
              conversation={activa}
              contact={contactoActivo}
              onAsignar={(staffId) =>
                dispatch({ type: "ASSIGN", conversationId: activa.id, staffId })
              }
              onEstado={(estado: ConversationStatus) =>
                dispatch({ type: "SET_STATUS", conversationId: activa.id, estado })
              }
              onDepartamento={(departamento: DepartmentId) =>
                dispatch({ type: "SET_DEPARTMENT", conversationId: activa.id, departamento })
              }
            />
          </div>
        )}
      </div>

      {/* Panel de contexto como slide-over en móvil */}
      {activa && contactoActivo && ctxOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCtxOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 right-0 w-[86%] max-w-xs shadow-xl">
            <ContextPanel
              conversation={activa}
              contact={contactoActivo}
              onClose={() => setCtxOpen(false)}
              onAsignar={(staffId) =>
                dispatch({ type: "ASSIGN", conversationId: activa.id, staffId })
              }
              onEstado={(estado: ConversationStatus) =>
                dispatch({ type: "SET_STATUS", conversationId: activa.id, estado })
              }
              onDepartamento={(departamento: DepartmentId) =>
                dispatch({ type: "SET_DEPARTMENT", conversationId: activa.id, departamento })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
