import { NextResponse } from "next/server";
import { addOutbound } from "@/lib/wa-store";
import { enviarTextoWa } from "@/lib/wa-send";
import { setChatOverride } from "@/lib/ai-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Envía un mensaje de texto de WhatsApp por la Cloud API.
// Body: { to, text, manual? }. Si `manual` es true (lo escribió un humano desde
// la plataforma), la IA se apaga para esa conversación.
export async function POST(req: Request) {
  let body: { to?: string; text?: string; manual?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const to = body.to?.trim();
  const text = body.text?.trim();
  if (!to || !text) {
    return NextResponse.json({ ok: false, error: "Faltan 'to' o 'text'" }, { status: 400 });
  }

  // Un humano tomó la conversación: la IA se apaga (override OFF) en este chat.
  if (body.manual) await setChatOverride(to, false);

  const env = await enviarTextoWa(to, text);
  if (!env.ok) {
    return NextResponse.json({ ok: false, error: env.error }, { status: 502 });
  }
  if (env.id) {
    await addOutbound({ waId: env.id, to, texto: text, ts: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true, id: env.id });
}
