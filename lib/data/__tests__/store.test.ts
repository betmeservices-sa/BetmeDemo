import { describe, expect, it } from "vitest";
import { createInitialState, storeReducer, type StoreState } from "../../store";
import { contacts, conversations, messages } from "../seed";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// La bandeja real arranca vacía (createInitialState), así que para probar el
// reducer sembramos un estado con las conversaciones del seed.
function freshState(): StoreState {
  return {
    ...createInitialState(),
    conversations: clone(conversations),
    messages: clone(messages),
    contacts: clone(contacts),
  };
}

function conv(state: StoreState, id: string) {
  return state.conversations.find((c) => c.id === id)!;
}

function msgs(state: StoreState, id: string) {
  return state.messages.filter((m) => m.conversationId === id);
}

describe("storeReducer", () => {
  it("SEND_MESSAGE agrega un mensaje de staff y pasa 'nuevo' a 'en_progreso'", () => {
    const before = freshState();
    expect(conv(before, "v2").estado).toBe("nuevo");
    const after = storeReducer(before, {
      type: "SEND_MESSAGE",
      conversationId: "v2",
      texto: "Con gusto le ayudo.",
      staffId: "me",
    });
    const added = msgs(after, "v2").at(-1)!;
    expect(added.autor).toBe("staff");
    expect(added.texto).toBe("Con gusto le ayudo.");
    expect(conv(after, "v2").estado).toBe("en_progreso");
    expect(conv(after, "v2").ultimoMensajeTs).toBe(added.ts);
  });

  it("ASSIGN fija el responsable", () => {
    const after = storeReducer(freshState(), {
      type: "ASSIGN",
      conversationId: "v2",
      staffId: "s2",
    });
    expect(conv(after, "v2").asignadoA).toBe("s2");
  });

  it("SET_STATUS cambia el estado", () => {
    const after = storeReducer(freshState(), {
      type: "SET_STATUS",
      conversationId: "v1",
      estado: "resuelto",
    });
    expect(conv(after, "v1").estado).toBe("resuelto");
  });

  it("MARK_READ pone los no leídos en cero", () => {
    const before = freshState();
    expect(conv(before, "v2").noLeidos).toBeGreaterThan(0);
    const after = storeReducer(before, { type: "MARK_READ", conversationId: "v2" });
    expect(conv(after, "v2").noLeidos).toBe(0);
  });

  // v3 es Instagram, v1 es WhatsApp.
  it("SOCIAL_INCOMING agrega un mensaje de paciente e incrementa no leídos", () => {
    const before = freshState();
    const prev = conv(before, "v3").noLeidos;
    const after = storeReducer(before, {
      type: "SOCIAL_INCOMING",
      conversationId: "v3",
      texto: "Una última pregunta.",
      ts: "2026-06-23T11:00:00.000Z",
    });
    const added = msgs(after, "v3").at(-1)!;
    expect(added.autor).toBe("paciente");
    expect(added.ts).toBe("2026-06-23T11:00:00.000Z");
    expect(conv(after, "v3").noLeidos).toBe(prev + 1);
    expect(conv(after, "v3").ultimoMensajeTs).toBe(added.ts);
  });

  it("SOCIAL_INCOMING reabre un hilo resuelto", () => {
    const before = freshState();
    expect(conv(before, "v7").estado).toBe("resuelto"); // v7 = Instagram resuelto
    const after = storeReducer(before, {
      type: "SOCIAL_INCOMING",
      conversationId: "v7",
      texto: "Hola de nuevo.",
      ts: "2026-06-23T11:00:00.000Z",
    });
    expect(conv(after, "v7").estado).toBe("en_progreso");
  });

  it("SEND_INTERNAL agrega un mensaje al canal interno", () => {
    const before = freshState();
    const prev = before.internalMessages.filter((m) => m.channelId === "ic1").length;
    const after = storeReducer(before, {
      type: "SEND_INTERNAL",
      channelId: "ic1",
      texto: "Equipo, reunión a las 4.",
      staffId: "me",
    });
    expect(after.internalMessages.filter((m) => m.channelId === "ic1").length).toBe(prev + 1);
  });

  it("ADD_SOCIAL_POST agrega una publicación programada al inicio", () => {
    const after = storeReducer(freshState(), {
      type: "ADD_SOCIAL_POST",
      red: "instagram",
      texto: "Nueva campaña de control prenatal.",
      fecha: "2026-06-26T09:00:00",
    });
    expect(after.socialPosts[0].estado).toBe("programado");
    expect(after.socialPosts[0].texto).toBe("Nueva campaña de control prenatal.");
  });
});

// ---------------------------------------------------------------------------
// La simulacion es solo Facebook e Instagram. WhatsApp es un canal real y
// ninguna accion del motor puede tocarlo. Estos tests fijan esa garantia.
// ---------------------------------------------------------------------------
describe("storeReducer - la simulación nunca toca WhatsApp", () => {
  it("SOCIAL_INCOMING sobre una conversación de WhatsApp es no-op", () => {
    const before = freshState();
    expect(conv(before, "v1").canal).toBe("whatsapp");
    const after = storeReducer(before, {
      type: "SOCIAL_INCOMING",
      conversationId: "v1",
      texto: "Mensaje simulado que no debe entrar.",
      ts: "2026-06-23T11:00:00.000Z",
    });
    expect(after).toBe(before);
  });

  it("SOCIAL_INCOMING sobre una conversación inexistente es no-op", () => {
    const before = freshState();
    const after = storeReducer(before, {
      type: "SOCIAL_INCOMING",
      conversationId: "no-existe",
      texto: "Huérfano.",
      ts: "2026-06-23T11:00:00.000Z",
    });
    expect(after).toBe(before);
  });

  it("SOCIAL_NEW_THREAD con canal whatsapp es no-op", () => {
    const before = freshState();
    const after = storeReducer(before, {
      type: "SOCIAL_NEW_THREAD",
      contact: { id: "sc99", nombre: "Impostor", canal: "whatsapp" },
      conversation: {
        id: "sv99",
        canal: "whatsapp",
        contactId: "sc99",
        departamento: "recepcion",
        estado: "nuevo",
        noLeidos: 1,
        ultimoMensajeTs: "2026-06-23T11:00:00.000Z",
      },
      texto: "No debo existir.",
      ts: "2026-06-23T11:00:00.000Z",
    });
    expect(after).toBe(before);
  });

  it("SOCIAL_NEW_THREAD de Instagram crea contacto, conversación y primer mensaje", () => {
    const before = freshState();
    const after = storeReducer(before, {
      type: "SOCIAL_NEW_THREAD",
      contact: { id: "sc0", nombre: "Gabriela Martínez", handle: "@gaby.mart", canal: "instagram" },
      conversation: {
        id: "sv0",
        canal: "instagram",
        contactId: "sc0",
        departamento: "recepcion",
        estado: "nuevo",
        noLeidos: 1,
        ultimoMensajeTs: "2026-06-23T11:00:00.000Z",
      },
      texto: "Atienden sin cita previa?",
      ts: "2026-06-23T11:00:00.000Z",
    });
    expect(conv(after, "sv0").canal).toBe("instagram");
    expect(after.contacts.some((c) => c.id === "sc0")).toBe(true);
    expect(msgs(after, "sv0")).toHaveLength(1);
    expect(msgs(after, "sv0")[0].texto).toBe("Atienden sin cita previa?");
  });
});

describe("storeReducer - SOCIAL_SEED", () => {
  // El estado real arranca vacío; SOCIAL_SEED es quien mete los hilos sociales.
  const semilla = {
    contacts: clone(contacts),
    conversations: clone(conversations),
    messages: clone(messages),
  };

  it("carga solo hilos de Facebook e Instagram, descartando los de WhatsApp", () => {
    const after = storeReducer(createInitialState(), { type: "SOCIAL_SEED", ...semilla });
    expect(after.conversations.length).toBeGreaterThan(0);
    expect(after.conversations.every((c) => c.canal !== "whatsapp")).toBe(true);
    expect(after.messages.every((m) => after.conversations.some((c) => c.id === m.conversationId))).toBe(true);
  });

  it("es idempotente: aplicarlo dos veces no duplica nada", () => {
    const once = storeReducer(createInitialState(), { type: "SOCIAL_SEED", ...semilla });
    const twice = storeReducer(once, { type: "SOCIAL_SEED", ...semilla });
    expect(twice).toBe(once);
  });
});

// ---------------------------------------------------------------------------
// HIDRATAR_CONVERSACION
// Las conversaciones "wac-" no estan en el seed; se crean via WHATSAPP_INCOMING.
// ---------------------------------------------------------------------------
describe("storeReducer - HIDRATAR_CONVERSACION", () => {
  const TEST_FROM = "50376294980";

  // Crea un estado base que contiene una conversacion wac real.
  function stateWithWacConv(): StoreState {
    return storeReducer(freshState(), {
      type: "WHATSAPP_INCOMING",
      waId: "wamsg-test-1",
      from: TEST_FROM,
      nombre: "Paciente Test",
      texto: "Hola, tengo una consulta.",
      ts: "2026-06-23T11:00:00",
    });
  }

  it("aplica asignado_a, estado y departamento a una conversacion wac existente", () => {
    const before = stateWithWacConv();
    const after = storeReducer(before, {
      type: "HIDRATAR_CONVERSACION",
      wa_from: TEST_FROM,
      asignado_a: "s2",
      estado: "en_progreso",
      departamento: "ginecologia",
    });
    const c = after.conversations.find((x) => x.id === `wac-${TEST_FROM}`)!;
    expect(c.asignadoA).toBe("s2");
    expect(c.estado).toBe("en_progreso");
    expect(c.departamento).toBe("ginecologia");
  });

  it("es no-op si la conversacion wac no existe: retorna la misma referencia de estado", () => {
    const before = stateWithWacConv();
    const after = storeReducer(before, {
      type: "HIDRATAR_CONVERSACION",
      wa_from: "99999999999",
      asignado_a: "s2",
      estado: "en_progreso",
      departamento: "ginecologia",
    });
    // El reducer retorna `state` sin modificar cuando la conv no existe
    expect(after).toBe(before);
  });

  it("asignado_a null desasigna; estado/departamento null se conservan", () => {
    // Paso 1: establecer valores reales
    const withValues = storeReducer(stateWithWacConv(), {
      type: "HIDRATAR_CONVERSACION",
      wa_from: TEST_FROM,
      asignado_a: "s3",
      estado: "en_progreso",
      departamento: "obstetricia",
    });
    // Paso 2: hidratar con todos null
    const after = storeReducer(withValues, {
      type: "HIDRATAR_CONVERSACION",
      wa_from: TEST_FROM,
      asignado_a: null,
      estado: null,
      departamento: null,
    });
    const c = after.conversations.find((x) => x.id === `wac-${TEST_FROM}`)!;
    // asignado_a null = desasignar explicito; estado/departamento null no pisan.
    expect(c.asignadoA).toBeUndefined();
    expect(c.estado).toBe("en_progreso");
    expect(c.departamento).toBe("obstetricia");
  });

  it("actualiza solo los campos no-null dejando los null sin tocar", () => {
    // Conv recien creada: asignadoA=undefined, estado="nuevo", departamento="recepcion"
    const before = stateWithWacConv();
    const after = storeReducer(before, {
      type: "HIDRATAR_CONVERSACION",
      wa_from: TEST_FROM,
      asignado_a: "s4",
      estado: null,
      departamento: null,
    });
    const c = after.conversations.find((x) => x.id === `wac-${TEST_FROM}`)!;
    expect(c.asignadoA).toBe("s4");
    expect(c.estado).toBe("nuevo");       // no debe cambiar
    expect(c.departamento).toBe("recepcion"); // no debe cambiar
  });
});
