import { NextResponse } from "next/server";
import { getAiEnabled, setAiEnabled } from "@/lib/ai-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Estado actual del Modo IA (lo lee el toggle de la bandeja). Incluye un
// diagnostico de si las credenciales estan presentes en el server (sin exponerlas).
export async function GET() {
  return NextResponse.json({
    enabled: await getAiEnabled(),
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasWaToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    model: process.env.AI_MODEL || "claude-sonnet-4-6",
  });
}

// Enciende/apaga el Modo IA global.
export async function POST(req: Request) {
  let body: { enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const enabled = Boolean(body.enabled);
  await setAiEnabled(enabled);
  return NextResponse.json({ ok: true, enabled });
}
