// Respuesta automática de la IA con "debounce": espera un silencio antes de
// contestar, para que una ráfaga de mensajes del paciente se responda UNA vez.
import { addOutbound, getSince } from "./wa-store";
import { getAiEnabled, isPaused } from "./ai-store";
import { upsertContacto } from "./contacts-store";
import { generarRespuesta, type TurnoIA } from "./ai";
import { enviarTextoWa, mostrarEscribiendo, enviarReaccion } from "./wa-send";

// Espera ALEATORIA antes de responder, para que se sienta humano (a veces
// contesta rapido, a veces se tarda). Por defecto entre 3s y 9s.
// OJO Vercel: el trabajo de `after` esta limitado por maxDuration (10s en Hobby,
// 60s en Pro). La espera + la llamada a Claude debe caber ahi. Con el rango 3-9s
// necesitas Vercel Pro; en Hobby baja AI_DELAY_MAX_MS a ~5000.
const DELAY_MIN_MS = Number(process.env.AI_DELAY_MIN_MS) || 3000;
const DELAY_MAX_MS = Number(process.env.AI_DELAY_MAX_MS) || 9000;

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
    if (!(await getAiEnabled())) return;
    if (await isPaused(opts.from)) return;

    await sleep(esperaAleatoria());

    // ¿Sigo siendo el último mensaje de esta conversación? Si llegó uno más nuevo
    // (otra parte de la ráfaga) o ya hay respuesta, me retiro: otro handler responde.
    const conv = (await getSince(0))
      .filter((m) => m.from === opts.from)
      .sort((a, b) => a.seq - b.seq);
    const ultimo = conv.at(-1);
    if (!ultimo || ultimo.waId !== opts.triggerWamid || ultimo.direccion !== "in") return;

    // Reconfirmar estado tras la espera (pudo apagarse o tomarlo un humano).
    if (!(await getAiEnabled())) return;
    if (await isPaused(opts.from)) return;

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
