import { describe, expect, it } from "vitest";
import {
  anclaSeed,
  construirHilo,
  conversacionesSociales,
  esCanalSocial,
  rebasarTs,
  semillaSocial,
} from "../social-seed";
import { conversations, socialLeads } from "../seed";

const MINUTO = 60_000;

describe("esCanalSocial", () => {
  it("acepta instagram y facebook, rechaza whatsapp e interno", () => {
    expect(esCanalSocial("instagram")).toBe(true);
    expect(esCanalSocial("facebook")).toBe(true);
    expect(esCanalSocial("whatsapp")).toBe(false);
    expect(esCanalSocial("internal")).toBe(false);
  });
});

describe("conversacionesSociales", () => {
  it("nunca devuelve una conversación de WhatsApp", () => {
    const social = conversacionesSociales(conversations);
    expect(social.length).toBeGreaterThan(0);
    expect(social.every((c) => c.canal !== "whatsapp")).toBe(true);
  });

  it("devuelve exactamente los hilos de Instagram y Facebook del seed", () => {
    const ids = conversacionesSociales(conversations).map((c) => c.id).sort();
    expect(ids).toEqual(["v10", "v13", "v3", "v5", "v7"].sort());
  });
});

describe("anclaSeed", () => {
  it("toma el mensaje más reciente del seed", () => {
    expect(anclaSeed(conversations)).toBe("2026-06-23T10:31:00");
  });
});

describe("rebasarTs", () => {
  const ancla = "2026-06-23T10:31:00";
  const ahora = Date.parse("2026-07-09T15:00:00.000Z");

  it("el mensaje del ancla cae exactamente en la hora actual", () => {
    expect(Date.parse(rebasarTs(ancla, ancla, ahora))).toBe(ahora);
  });

  it("conserva la distancia original al ancla", () => {
    // v13 es 10:27, cuatro minutos antes del ancla (10:31).
    const rebasado = Date.parse(rebasarTs("2026-06-23T10:27:00", ancla, ahora));
    expect(ahora - rebasado).toBe(4 * MINUTO);
  });

  it("conserva el orden relativo entre dos horas del seed", () => {
    const viejo = rebasarTs("2026-06-22T16:40:00", ancla, ahora);
    const nuevo = rebasarTs("2026-06-23T10:05:00", ancla, ahora);
    expect(viejo < nuevo).toBe(true);
  });

  it("devuelve ISO con zona (UTC), comparable con los timestamps reales de WhatsApp", () => {
    const salida = rebasarTs("2026-06-23T10:05:00", ancla, ahora);
    expect(salida.endsWith("Z")).toBe(true);
    // Un mensaje real de WhatsApp llegado "ahora" debe ordenar después.
    const real = "2026-07-09T15:00:00+00:00";
    expect(salida < real).toBe(true);
  });
});

describe("semillaSocial", () => {
  const ahora = Date.parse("2026-07-09T15:00:00.000Z");
  const semilla = semillaSocial(ahora);

  it("no incluye ninguna conversación de WhatsApp", () => {
    expect(semilla.conversations.every((c) => c.canal !== "whatsapp")).toBe(true);
  });

  it("todos los mensajes pertenecen a una conversación incluida", () => {
    const ids = new Set(semilla.conversations.map((c) => c.id));
    expect(semilla.messages.every((m) => ids.has(m.conversationId))).toBe(true);
  });

  it("todos los contactos pertenecen a una conversación incluida", () => {
    const ids = new Set(semilla.conversations.map((c) => c.contactId));
    expect(semilla.contacts.every((c) => ids.has(c.id))).toBe(true);
  });

  it("ninguna hora queda en el futuro y el hilo más reciente cae cerca de ahora", () => {
    const horas = semilla.conversations.map((c) => Date.parse(c.ultimoMensajeTs));
    expect(Math.max(...horas)).toBeLessThanOrEqual(ahora);
    // v13 (10:27) es el social más reciente: 4 min antes del ancla.
    expect(ahora - Math.max(...horas)).toBe(4 * MINUTO);
  });
});

describe("construirHilo", () => {
  it("genera ids estables y una conversación nueva sin leer", () => {
    const ts = "2026-07-09T15:00:00.000Z";
    const { contact, conversation } = construirHilo(socialLeads[0], 0, ts);
    expect(contact.id).toBe("sc0");
    expect(conversation.id).toBe("sv0");
    expect(conversation.contactId).toBe("sc0");
    expect(conversation.estado).toBe("nuevo");
    expect(conversation.noLeidos).toBe(1);
    expect(conversation.ultimoMensajeTs).toBe(ts);
  });

  it("ningún lead del pool es de WhatsApp", () => {
    expect(socialLeads.every((l) => esCanalSocial(l.canal))).toBe(true);
  });
});
