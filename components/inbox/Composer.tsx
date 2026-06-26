"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Loader2, Paperclip, SendHorizonal } from "lucide-react";

export function Composer({
  onSend,
  onTyping,
  onAttach,
  placeholder = "Escribe una respuesta...",
}: {
  onSend: (texto: string) => void | Promise<void>;
  onTyping?: () => void;
  onAttach?: (file: File) => void | Promise<void>;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [adjuntando, setAdjuntando] = useState(false);
  const ultimoTyping = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value);
    // Dispara "escribiendo..." en WhatsApp, maximo una vez cada 10s.
    if (e.target.value.trim() && onTyping) {
      const ahora = Date.now();
      if (ahora - ultimoTyping.current > 10000) {
        ultimoTyping.current = ahora;
        onTyping();
      }
    }
  }

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    try {
      await onSend(limpio);
      setTexto(""); // solo limpia si se envio bien
    } catch {
      // deja el texto para reintentar
    } finally {
      setEnviando(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || adjuntando || !onAttach) return;
    setAdjuntando(true);
    try {
      await onAttach(file);
    } catch {
      // no romper: el error lo maneja el caller
    } finally {
      setAdjuntando(false);
      // Resetea el input para poder seleccionar el mismo archivo de nuevo.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-line bg-card px-4 py-3">
      {/* Boton de adjuntar */}
      {onAttach && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={adjuntando}
            aria-label="Adjuntar archivo"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-[#5b6b80] transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {adjuntando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Paperclip size={18} />
            )}
          </button>
        </>
      )}

      <textarea
        value={texto}
        onChange={onChange}
        onKeyDown={onKey}
        rows={1}
        placeholder={placeholder}
        className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-[#0f1b2d] outline-none transition placeholder:text-[#94a3b4] focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
      />
      <button
        type="button"
        onClick={enviar}
        disabled={!texto.trim() || enviando}
        aria-label="Enviar"
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SendHorizonal size={18} />
      </button>
    </div>
  );
}
