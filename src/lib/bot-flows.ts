import {
  Asistencia,
  CircuitoBarrial,
  Jornada,
  Participante,
  SEED_IDS,
  SystemSnapshot,
  WhatsAppReplyButton,
} from "@/types/domain";
import { phonesMatch } from "@/lib/domain-helpers";
import {
  addLog,
  appendBotMessage,
  appendUserMessage,
  generateUuid,
  readStateAsync,
  syncToSupabaseIfConfigured,
  writeState,
} from "@/lib/state-persistence";

function buildConvocatoriaButtons(jornadaId: string): WhatsAppReplyButton[] {
  return [
    { id: `btn_nivel_1:${jornadaId}`, title: "Pasen a buscarme", variant: "primary" },
    { id: `btn_nivel_2:${jornadaId}`, title: "Voy a la esquina", variant: "primary" },
    { id: `btn_nivel_3:${jornadaId}`, title: "Voy directo al club", variant: "primary" },
  ];
}

interface ParsedButton {
  baseAction: string;
  targetArgId?: string;
  jornadaId?: string;
}

function parseButtonId(buttonId: string): ParsedButton {
  const parts = (buttonId || "").split(":");
  const baseAction = parts[0];

  if (
    baseAction === "btn_parada" ||
    baseAction === "btn_padrino_acepta" ||
    baseAction === "btn_padrino_rechaza" ||
    baseAction === "btn_padrino_imprevisto"
  ) {
    return {
      baseAction,
      targetArgId: parts[1],
      jornadaId: parts[2],
    };
  }

  return {
    baseAction,
    jornadaId: parts[1],
  };
}

function resolveEventContext(
  state: SystemSnapshot,
  explicitJornadaId?: string,
  actorId?: string
): { targetJornada: Jornada; targetCircuito: CircuitoBarrial } {
  let targetJornada: Jornada | undefined;

  if (explicitJornadaId) {
    targetJornada = (state.jornadas || []).find((j) => j.id === explicitJornadaId);
  }

  if (!targetJornada && actorId) {
    const actorJornadaIds = new Set(
      state.asistencias
        .filter((a) => a.participante_id === actorId)
        .map((a) => a.jornada_id)
    );
    const candidateJornadas = (state.jornadas || []).filter((j) =>
      actorJornadaIds.has(j.id)
    );
    targetJornada =
      candidateJornadas.find((j) => j.estado === "convocando") ||
      candidateJornadas[0];
  }

  if (!targetJornada) {
    targetJornada = state.jornada;
  }

  const targetCircuito =
    (state.circuitos || []).find((c) => c.id === targetJornada!.circuito_id) ||
    state.circuito;

  return { targetJornada, targetCircuito };
}

function upsertAsistencia(
  state: SystemSnapshot,
  jornadaId: string,
  actor: Participante,
  updates: Partial<Asistencia>
): Asistencia {
  let asis = state.asistencias.find(
    (a) => a.jornada_id === jornadaId && a.participante_id === actor.id
  );
  if (!asis) {
    asis = {
      id: generateUuid(),
      jornada_id: jornadaId,
      participante_id: actor.id,
      modalidad_elegida: "sin_respuesta",
      parada_esquina_id: null,
      padrino_asignado_id: actor.padrino_preferido_id || null,
      estado_padrino: "no_aplica",
      acuse_suspension_leido: false,
      presente_validado_en_club: false,
      codigo_canje_farmacia: null,
      updated_at: new Date().toISOString(),
      ...updates,
    };
    state.asistencias.push(asis);
  } else {
    Object.assign(asis, updates, { updated_at: new Date().toISOString() });
  }
  return asis;
}

export async function dispararConvocatoriaJornada(
  jornadaId?: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventContext(state, jornadaId);

  targetJornada.estado = "convocando";
  targetJornada.motivo_suspension = null;
  targetJornada.updated_at = new Date().toISOString();
  state.jornada = targetJornada;
  state.circuito = targetCircuito;

  const jIdx = state.jornadas.findIndex((j) => j.id === targetJornada.id);
  if (jIdx >= 0) state.jornadas[jIdx] = targetJornada;

  const asistenciasDelEvento = state.asistencias.filter(
    (a) => a.jornada_id === targetJornada.id
  );
  const idsDelEvento = new Set(asistenciasDelEvento.map((a) => a.participante_id));

  const adultosActivos = state.participantes.filter(
    (p) =>
      p.rol === "adulto_mayor" &&
      p.estado_alta === "activo" &&
      idsDelEvento.has(p.id)
  );

  for (const adulto of adultosActivos) {
    const asis = upsertAsistencia(state, targetJornada.id, adulto, {
      acuse_suspension_leido: false,
    });

    if (
      asis.modalidad_elegida === "sin_respuesta" ||
      asis.modalidad_elegida === "no_asiste"
    ) {
      asis.modalidad_elegida = "sin_respuesta";
      asis.estado_padrino = "no_aplica";
      const primerNombre = adulto.nombre.split(" ")[0];
      await appendBotMessage(
        state,
        adulto,
        `Buen dia, ${primerNombre}. Hoy ${targetJornada.hora_inicio_caminata} hs nos encontramos en ${targetCircuito.nombre_club} (${targetCircuito.direccion_club}) para caminar juntos y cerrar con ${targetJornada.actividad_cierre}. ¿Como te sumas hoy?`,
        { buttons: buildConvocatoriaButtons(targetJornada.id) }
      );
    }
  }

  addLog(
    state,
    targetCircuito.nombre_club,
    "Flujo 1: Convocatoria Disparada",
    `Mensajes 1 a 1 enviados a ${adultosActivos.length} abuelo(s) de ${targetCircuito.nombre_club}.`,
    "info"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function procesarEventoWebhookWhatsApp(params: {
  fromPhone?: string;
  participanteId?: string;
  buttonId: string;
  buttonTitle?: string;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();

  const actor = state.participantes.find((p) => {
    if (params.participanteId && p.id === params.participanteId) return true;
    if (params.fromPhone && phonesMatch(p.telefono, params.fromPhone)) return true;
    return false;
  });

  if (!actor) {
    addLog(
      state,
      params.fromPhone || "Desconocido",
      "Webhook recibido de numero no registrado",
      `Llego evento (${params.buttonId}) desde ${
        params.fromPhone || "sin telefono"
      } que no coincide con ningun participante.`,
      "warning"
    );
    writeState(state);
    return state;
  }

  const parsed = parseButtonId(params.buttonId);
  const { targetJornada, targetCircuito } = resolveEventContext(
    state,
    parsed.jornadaId,
    actor.id
  );
  const primerNombre = actor.nombre.split(" ")[0];

  appendUserMessage(state, actor, params.buttonTitle || params.buttonId);

  if (parsed.baseAction === "btn_menu_convocatoria") {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === actor.id
    );
    if (asis && asis.modalidad_elegida === "no_asiste") {
      asis.modalidad_elegida = "sin_respuesta";
      asis.estado_padrino = "no_aplica";
      asis.updated_at = new Date().toISOString();
    }

    await appendBotMessage(
      state,
      actor,
      `Hola ${primerNombre}. Hoy ${targetJornada.hora_inicio_caminata} hs nos encontramos en ${targetCircuito.nombre_club} para caminar y cerrar con ${targetJornada.actividad_cierre}. ¿Como te sumas hoy?`,
      { buttons: buildConvocatoriaButtons(targetJornada.id) }
    );
  } else if (parsed.baseAction === "btn_nivel_1") {
    const padrinoId = actor.padrino_preferido_id || SEED_IDS.padrinoCarlos;
    const padrino = state.participantes.find((p) => p.id === padrinoId);

    upsertAsistencia(state, targetJornada.id, actor, {
      modalidad_elegida: "nivel_1_puerta",
      parada_esquina_id: null,
      padrino_asignado_id: padrinoId,
      estado_padrino: "esperando_confirmacion",
    });

    await appendBotMessage(
      state,
      actor,
      `Barbaro, ${primerNombre}. Ya le estamos avisando a tu vecino padrino para confirmar el horario rumbo a ${targetCircuito.nombre_club}. Quedate atenta.`,
      {
        buttons: [
          {
            id: `btn_adulto_cancela:${targetJornada.id}`,
            title: "No voy hoy",
            variant: "danger",
          },
        ],
      }
    );

    if (padrino) {
      const nombrePadrino = padrino.nombre.split(" ")[0];
      await appendBotMessage(
        state,
        padrino,
        `Hola ${nombrePadrino}. Tu vecina *${actor.nombre}* (${actor.direccion}) pidio acompanamiento puerta a puerta para ir a *${targetCircuito.nombre_club}*. ¿Podes pasar por su casa a las ${targetJornada.hora_inicio_caminata} hs?`,
        {
          buttons: [
            {
              id: `btn_padrino_acepta:${actor.id}:${targetJornada.id}`,
              title: "Si, paso por ahi",
              variant: "success",
            },
            {
              id: `btn_padrino_rechaza:${actor.id}:${targetJornada.id}`,
              title: "Hoy no puedo",
              variant: "warning",
            },
          ],
        }
      );

      addLog(
        state,
        actor.nombre,
        "Flujo 2: Solicitud Nivel 1 (Puerta a Puerta)",
        `${actor.nombre} pidio acompanamiento domiciliario (${targetCircuito.nombre_club}). Se notifico a ${padrino.nombre} (${padrino.credencial_nro}).`,
        "warning"
      );
    }
  } else if (parsed.baseAction === "btn_padrino_acepta") {
    const adultoId = parsed.targetArgId;
    const adulto = state.participantes.find((p) => p.id === adultoId);
    const asis = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === adultoId
    );

    if (adulto && asis) {
      asis.padrino_asignado_id = actor.id;
      asis.estado_padrino = "confirmado";
      asis.updated_at = new Date().toISOString();

      const nombreAdulto = adulto.nombre.split(" ")[0];

      await appendBotMessage(
        state,
        actor,
        `Muchas gracias, ${primerNombre}. Quedo confirmado tu acompanamiento puerta a puerta para *${adulto.nombre}* (${adulto.direccion}) hoy a las ${targetJornada.hora_inicio_caminata} hs rumbo a ${targetCircuito.nombre_club}. Ya le enviamos tu Ficha de Seguridad Oficial.`,
        {
          buttons: [
            {
              id: `btn_padrino_imprevisto:${adulto.id}:${targetJornada.id}`,
              title: "Tuve un imprevisto",
              variant: "danger",
            },
          ],
        }
      );

      await appendBotMessage(
        state,
        adulto,
        `Confirmado, ${nombreAdulto}. Hoy a las ${targetJornada.hora_inicio_caminata} hs pasa por tu puerta *${actor.nombre}* (Padrino Acreditado - Credencial ${actor.credencial_nro}) rumbo a ${targetCircuito.nombre_club}. A preparar el equipo de mate.`,
        {
          fichaSeguridad: {
            padrinoNombre: actor.nombre,
            credencialNro: actor.credencial_nro || "#104",
            dni: actor.dni,
            horarioPuerta: `${targetJornada.hora_inicio_caminata} hs`,
            clubAcreditador: targetCircuito.nombre_club,
          },
          buttons: [
            {
              id: `btn_adulto_cancela:${targetJornada.id}`,
              title: "No voy hoy",
              variant: "danger",
            },
          ],
        }
      );

      addLog(
        state,
        `${actor.nombre} (${actor.credencial_nro})`,
        "Flujo 2: Padrino Confirmado",
        `${actor.nombre} confirmo pasar por la puerta de ${adulto.nombre} (${targetCircuito.nombre_club}).`,
        "success"
      );
    }
  } else if (
    parsed.baseAction === "btn_padrino_rechaza" ||
    parsed.baseAction === "btn_padrino_imprevisto"
  ) {
    const adultoId = parsed.targetArgId;
    const adulto = state.participantes.find((p) => p.id === adultoId);
    const asis = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === adultoId
    );

    if (adulto && asis) {
      asis.estado_padrino = "rechazado_buscando_reemplazo";
      asis.updated_at = new Date().toISOString();

      await appendBotMessage(
        state,
        actor,
        `Gracias por avisar, ${primerNombre}. Ya activamos el protocolo de reemplazo en el Panel del Coordinador para cuidar a ${adulto.nombre}.`
      );

      const padrinoReemplazo = state.participantes.find(
        (p) => p.rol === "padrino" && p.acreditado_por_club && p.id !== actor.id
      );

      if (padrinoReemplazo) {
        const nombreReemplazo = padrinoReemplazo.nombre.split(" ")[0];
        await appendBotMessage(
          state,
          padrinoReemplazo,
          `*REEMPLAZO DE CERCANIA URGENTE (${targetCircuito.nombre_club}):* Hola ${nombreReemplazo}, el padrino ${actor.nombre} tuvo un imprevisto de ultimo momento. ¿Podes pasar a buscar a *${adulto.nombre}* (${adulto.direccion}) hoy a las ${targetJornada.hora_inicio_caminata} hs?`,
          {
            esAlertaPrioritaria: true,
            buttons: [
              {
                id: `btn_padrino_acepta:${adulto.id}:${targetJornada.id}`,
                title: "Si, paso por ahi",
                variant: "success",
              },
              {
                id: `btn_padrino_rechaza:${adulto.id}:${targetJornada.id}`,
                title: "Hoy no puedo",
                variant: "warning",
              },
            ],
          }
        );
      }

      addLog(
        state,
        `${actor.nombre} (${actor.credencial_nro})`,
        "Caso 4B: Padrino Caido a Ultimo Momento",
        `${actor.nombre} reporto imprevisto para ${adulto.nombre} en ${targetCircuito.nombre_club}.`,
        "danger"
      );
    }
  } else if (parsed.baseAction === "btn_adulto_cancela") {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === actor.id
    );

    if (asis) {
      const teniaPadrinoId = asis.padrino_asignado_id || actor.padrino_preferido_id;
      const eraNivel1 = asis.modalidad_elegida === "nivel_1_puerta";

      asis.modalidad_elegida = "no_asiste";
      asis.parada_esquina_id = null;
      asis.estado_padrino = "no_aplica";
      asis.updated_at = new Date().toISOString();

      const cancelMsg =
        eraNivel1 && teniaPadrinoId
          ? `Entendido, ${primerNombre}. Ya registramos que hoy no asistis a ${targetCircuito.nombre_club} y le avisamos a tu vecino padrino para que no pase por tu casa. Te esperamos en la proxima jornada.`
          : `Entendido, ${primerNombre}. Ya registramos que hoy no asistis a ${targetCircuito.nombre_club}. Te esperamos en la proxima jornada.`;

      await appendBotMessage(state, actor, cancelMsg, {
        buttons: [
          {
            id: `btn_menu_convocatoria:${targetJornada.id}`,
            title: "Volver a sumarme",
            variant: "neutral",
          },
        ],
      });

      if (eraNivel1 && teniaPadrinoId) {
        const padrino = state.participantes.find((p) => p.id === teniaPadrinoId);
        if (padrino) {
          const nombrePadrino = padrino.nombre.split(" ")[0];
          await appendBotMessage(
            state,
            padrino,
            `Aviso a tiempo, ${nombrePadrino}: Tu vecina *${primerNombre}* aviso que hoy no se suma a la caminata hacia ${targetCircuito.nombre_club}, asi que no hace falta que pases por su domicilio.`
          );
        }
      }

      addLog(
        state,
        actor.nombre,
        "Caso 4C: Cancelacion de Adulto Mayor",
        `${actor.nombre} aviso que hoy no asiste a ${targetCircuito.nombre_club}.`,
        "warning"
      );
    }
  } else if (parsed.baseAction === "btn_nivel_2") {
    const paradaButtons: WhatsAppReplyButton[] = targetCircuito.paradas_seguras.map(
      (parada, idx) => ({
        id: `btn_parada:${parada.id}:${targetJornada.id}`,
        title: `Parada ${idx + 1} (${parada.horario_paso})`,
        variant: "primary",
      })
    );

    paradaButtons.push({
      id: `btn_adulto_cancela:${targetJornada.id}`,
      title: "No voy hoy",
      variant: "danger",
    });

    const detalleParadas = targetCircuito.paradas_seguras
      .map(
        (p, idx) =>
          `• *Parada ${idx + 1}:* ${p.nombre_esquina.replace(
            /^Parada \d+:\s*/,
            ""
          )} (${p.horario_paso})`
      )
      .join("\n");

    await appendBotMessage(
      state,
      actor,
      `Muy bien, ${primerNombre}. Elegi en cual de las *Paradas Seguras relevadas por Sancor* hacia ${targetCircuito.nombre_club} te sumas hoy:\n${detalleParadas}`,
      { buttons: paradaButtons }
    );

    addLog(
      state,
      actor.nombre,
      "Flujo 3: Consulta de Paradas Seguras (Nivel 2)",
      `${actor.nombre} solicito ver las esquinas seguras de ${targetCircuito.nombre_club}.`,
      "info"
    );
  } else if (parsed.baseAction === "btn_parada") {
    const paradaId = parsed.targetArgId || "";
    const parada = targetCircuito.paradas_seguras.find((p) => p.id === paradaId);

    upsertAsistencia(state, targetJornada.id, actor, {
      modalidad_elegida: "nivel_2_esquina",
      parada_esquina_id: paradaId,
      padrino_asignado_id: null,
      estado_padrino: "no_aplica",
    });

    if (parada) {
      await appendBotMessage(
        state,
        actor,
        `Agendado, ${primerNombre}. Te esperamos en *${parada.nombre_esquina}* a las *${parada.horario_paso}* para sumarte rumbo a ${targetCircuito.nombre_club}.`,
        {
          buttons: [
            {
              id: `btn_adulto_cancela:${targetJornada.id}`,
              title: "No voy hoy",
              variant: "danger",
            },
          ],
        }
      );

      addLog(
        state,
        actor.nombre,
        "Flujo 3: Parada Segura Confirmada",
        `${actor.nombre} confirmo espera en ${parada.nombre_esquina} (${targetCircuito.nombre_club}).`,
        "success"
      );
    }
  } else if (parsed.baseAction === "btn_nivel_3") {
    upsertAsistencia(state, targetJornada.id, actor, {
      modalidad_elegida: "nivel_3_directo",
      parada_esquina_id: null,
      padrino_asignado_id: null,
      estado_padrino: "no_aplica",
    });

    await appendBotMessage(
      state,
      actor,
      `Excelente, ${primerNombre}. Te esperamos directamente a las *${targetJornada.hora_encuentro_club} hs* en *${targetCircuito.nombre_club}* (${targetCircuito.direccion_club}) para compartir ${targetJornada.actividad_cierre}.`,
      {
        buttons: [
          {
            id: `btn_adulto_cancela:${targetJornada.id}`,
            title: "No voy hoy",
            variant: "danger",
          },
        ],
      }
    );

    addLog(
      state,
      actor.nombre,
      "Anillo Nivel 3 Confirmado",
      `${actor.nombre} confirmo asistencia directa a ${targetCircuito.nombre_club} a las ${targetJornada.hora_encuentro_club} hs.`,
      "success"
    );
  } else if (parsed.baseAction === "btn_acuse_suspension") {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === actor.id
    );
    if (asis) {
      asis.acuse_suspension_leido = true;
      asis.updated_at = new Date().toISOString();
    }

    await appendBotMessage(
      state,
      actor,
      `Gracias por confirmar, ${primerNombre}. Ya registramos que recibiste el aviso de suspension de ${targetCircuito.nombre_club} (${targetJornada.actividad_cierre}). Nos vemos en la proxima salida.`
    );

    addLog(
      state,
      actor.nombre,
      "Acuse de Suspension Recibido",
      `${actor.nombre} confirmo lectura del aviso de suspension (${targetCircuito.nombre_club}).`,
      "success"
    );
  }

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}
