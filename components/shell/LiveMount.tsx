"use client";

import { useStore } from "@/lib/store";
import { useLive } from "@/lib/live-context";
import { useSocialEngine } from "@/lib/data/social-engine";
import { useWhatsappBridge } from "@/lib/wa-bridge";

// Punto único donde corren los dos motores, dentro de los providers.
export function LiveMount() {
  const { state, dispatch } = useStore();
  const { enabled } = useLive();
  useSocialEngine(state, dispatch, enabled); // Facebook e Instagram: simulados
  useWhatsappBridge(dispatch); // WhatsApp: real, siempre
  return null;
}
