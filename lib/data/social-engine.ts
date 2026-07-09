"use client";

import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { StoreAction, StoreState } from "../store";
import { socialFollowUps, socialLeads } from "./seed";
import { construirHilo, conversacionesSociales, semillaSocial } from "./social-seed";

const INTERVALO_MS = 18_000;

// Tope de hilos nuevos por sesion: una pestana abierta media hora no debe
// dejar la bandeja con decenas de conversaciones inventadas.
const MAX_HILOS_NUEVOS = socialLeads.length;

// De cada 3 inyecciones, 2 son respuestas en hilos abiertos y 1 abre un hilo
// nuevo. Ciclo determinista por contador: sin Math.random, la demo es repetible.
const CADA_CUANTOS_HILO_NUEVO = 3;

// Motor de "vida" de la bandeja. Dos responsabilidades:
//   1. Backfill: al montar, mete los hilos de FB/IG del seed con horas de hoy.
//      Va en un efecto (solo cliente) porque createInitialState corre tambien
//      en el servidor durante el prerender, y usar la hora real ahi romperia
//      la hidratacion.
//   2. Stream: mientras el toggle este encendido, inyecta mensajes cada rato.
//
// El motor nunca elige objetivos de una lista fija: los deriva del estado
// filtrando por canal. Una conversacion de WhatsApp es inalcanzable por
// construccion, no por disciplina.
export function useSocialEngine(
  state: StoreState,
  dispatch: Dispatch<StoreAction>,
  enabled: boolean,
) {
  // Ref al estado mas reciente: el intervalo lo lee sin tener que reiniciarse
  // en cada dispatch.
  const estado = useRef(state);
  estado.current = state;

  const sembrado = useRef(false);
  const tick = useRef(0);
  const hilosNuevos = useRef(0);

  // 1. Backfill. Corre siempre, incluso con el motor pausado: el mock debe
  // verse al abrir el dashboard; el toggle solo controla el goteo.
  useEffect(() => {
    if (sembrado.current) return;
    sembrado.current = true;
    dispatch({ type: "SOCIAL_SEED", ...semillaSocial(Date.now()) });
  }, [dispatch]);

  // 2. Stream.
  useEffect(() => {
    if (!enabled) return;
    const handle = window.setInterval(() => {
      const i = tick.current++;
      const ts = new Date().toISOString();

      const tocaHiloNuevo =
        i % CADA_CUANTOS_HILO_NUEVO === CADA_CUANTOS_HILO_NUEVO - 1 &&
        hilosNuevos.current < MAX_HILOS_NUEVOS;

      if (tocaHiloNuevo) {
        const indice = hilosNuevos.current++;
        const { contact, conversation } = construirHilo(socialLeads[indice], indice, ts);
        dispatch({
          type: "SOCIAL_NEW_THREAD",
          contact,
          conversation,
          texto: socialLeads[indice].texto,
          ts,
        });
        return;
      }

      const objetivos = conversacionesSociales(estado.current.conversations);
      if (objetivos.length === 0) return;
      dispatch({
        type: "SOCIAL_INCOMING",
        conversationId: objetivos[i % objetivos.length].id,
        texto: socialFollowUps[i % socialFollowUps.length],
        ts,
      });
    }, INTERVALO_MS);

    return () => window.clearInterval(handle);
  }, [dispatch, enabled]);
}
