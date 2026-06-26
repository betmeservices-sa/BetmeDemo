// Respuesta automática de la IA con "debounce": espera un silencio antes de
// contestar, para que una ráfaga de mensajes del paciente se responda UNA vez.
import { addOutbound, getSince } from "./wa-store";
import { getChatAiActiva } from "./ai-store";
import { upsertContacto } from "./contacts-store";
import { generarRespuesta, type TurnoIA } from "./ai";
import { enviarTextoWa, mostrarEscribiendo, enviarReaccion } from "./wa-send";

// Espera ALEATORIA antes de responder, para que se sienta humano (a veces
// contesta rapido, a veces se tarda). Default 2-3s para que TODO el trabajo de
// `after` (espera + consultas + Claude + envio) quepa en el limite de 10s de
// Vercel Hobby. Para el rango completo 3-9s sube AI_DELAY_MIN_MS/MAX_MS con
// Vercel Pro (funciones de 60s).
const DELAY_MIN_MS = Number(process.env.AI_DELAY_MIN_MS) || 2000;
const DELAY_MAX_MS = Number(process.env.AI_DELAY_MAX_MS) || 3000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function esperaAleatoria(): number {
  const min = Math.min(DELAY_MIN_MS, DELAY_MAX_MS);
  const max = Math.max(DELAY_MIN_MS, DELAY_MAX_MS);
  return min + Math.floor(Math.random() * (max - min + 1));
}

export async function programarRespuestaIA(opts: {
  from: string;
  triggerWamid: string;
}): Promise<void> {
  try {
    // Activa si: override del chat (si existe) o, si no, el interruptor global.
    if (!(await getChatAiActiva(opts.from))) return;

    await sleep(esperaAleatoria());

    // ¿Sigo siendo el último mensaje de esta conversación? Si llegó uno más nuevo
    // (otra parte de la ráfaga) o ya hay respuesta, me retiro: otro handler responde.
    const conv = (await getSince(0))
      .filter((m) => m.from === opts.from)
      .sort((a, b) => a.seq - b.seq);
    // Si el ultimo mensaje ya no es mi disparador (llego otro o ya hay respuesta),
    // me retiro. Esto tambien cubre que un humano haya tomado el chat (su mensaje
    // saliente seria el ultimo, con direccion "out").
    const ultimo = conv.at(-1);
    if (!ultimo || ultimo.waId !== opts.triggerWamid || ultimo.direccion !== "in") return;

    const historial: TurnoIA[] = conv.map((m) => ({
      autor: m.direccion === "out" ? "staff" : "paciente",
      texto: m.texto,
    }));
    if (historial.length === 0) return;

    // "escribiendo..." mientras Claude redacta.
    await mostrarEscribiendo(opts.triggerWamid);

    const respuesta = await generarRespuesta(historial, {
      onGuardarContacto: (d) =>
        upsertContacto({ from: opts.from, nombre: d.nombre, correo: d.correo }),
      onReaccionar: (emoji) => enviarReaccion(opts.from, opts.triggerWamid, emoji),
    });
    const env = await enviarTextoWa(opts.from, respuesta);
    if (env.ok && env.id) {
      await addOutbound({ waId: env.id, to: opts.from, texto: respuesta, ts: new Date().toISOString() });
    } else {
      console.error("IA: falló el envío:", env.error);
    }
  } catch (e) {
    console.error("IA error:", e);
  }
}
