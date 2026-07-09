// Semilla y helpers puros del motor de simulacion social.
//
// Por que existe este archivo aparte del motor: aca no hay React ni "use client",
// asi que los tests pueden ejercitar la logica de fechas sin montar hooks.
//
// Regla del demo: WhatsApp es un canal REAL (webhook de Meta -> wa-bridge).
// Facebook e Instagram no estan conectados, asi que los simulamos. Nada de lo
// que vive aca puede tocar una conversacion de WhatsApp.

import { fakeProvider } from "./provider";
import { CANALES_SOCIALES } from "./types";
import type { Contact, Conversation, Message, SocialLead } from "./types";

export function esCanalSocial(canal: string): boolean {
  return (CANALES_SOCIALES as readonly string[]).includes(canal);
}

export function conversacionesSociales(convs: Conversation[]): Conversation[] {
  return convs.filter((c) => esCanalSocial(c.canal));
}

// El seed tiene horas congeladas (2026-06-23). El ancla es el mensaje mas
// reciente de todo el seed: contra el se mide la antiguedad de los demas.
export function anclaSeed(convs: Conversation[]): string {
  return convs.reduce((max, c) => (c.ultimoMensajeTs > max ? c.ultimoMensajeTs : max), "");
}

// Reproyecta una hora del seed contra la hora real, conservando la distancia
// original al ancla. Un mensaje que en el seed era "4 minutos antes del ultimo"
// pasa a ser "4 minutos antes de ahora". Devuelve ISO con zona (UTC), igual que
// los timestamps reales de WhatsApp, para que la lista ordene bien al mezclarlos.
export function rebasarTs(seedTs: string, ancla: string, ahoraMs: number): string {
  const distancia = Date.parse(ancla) - Date.parse(seedTs);
  return new Date(ahoraMs - distancia).toISOString();
}

export interface SemillaSocial {
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
}

// Los hilos de Facebook e Instagram del seed, con las horas traidas a hoy.
export function semillaSocial(ahoraMs: number): SemillaSocial {
  const todas = fakeProvider.listConversations();
  const ancla = anclaSeed(todas);
  const conversations = conversacionesSociales(todas);
  const idsContacto = new Set(conversations.map((c) => c.contactId));

  return {
    contacts: fakeProvider.listContacts().filter((c) => idsContacto.has(c.id)),
    conversations: conversations.map((c) => ({
      ...c,
      ultimoMensajeTs: rebasarTs(c.ultimoMensajeTs, ancla, ahoraMs),
    })),
    messages: conversations
      .flatMap((c) => fakeProvider.getMessages(c.id))
      .map((m) => ({ ...m, ts: rebasarTs(m.ts, ancla, ahoraMs) })),
  };
}

// Contacto + conversacion para un hilo social nuevo. El indice hace los ids
// unicos y estables (sin Math.random, para que la demo sea reproducible).
export function construirHilo(
  lead: SocialLead,
  indice: number,
  ts: string,
): { contact: Contact; conversation: Conversation } {
  const contact: Contact = {
    id: `sc${indice}`,
    nombre: lead.nombre,
    handle: lead.handle,
    canal: lead.canal,
  };
  const conversation: Conversation = {
    id: `sv${indice}`,
    canal: lead.canal,
    contactId: contact.id,
    departamento: lead.departamento,
    estado: "nuevo",
    noLeidos: 1,
    ultimoMensajeTs: ts,
  };
  return { contact, conversation };
}
