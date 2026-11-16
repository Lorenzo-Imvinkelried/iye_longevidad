import {
  SEED_IDS,
  SystemSnapshot,
  WhatsAppReplyButton,
} from "@/types/domain";
import {
  addLog,
  appendBotMessage,
  appendUserMessage,
  formatPesos,
  readState,
  syncToSupabaseIfConfigured,
  writeState,
} from "@/lib/state-persistence";

export async function dispararConvocatoriaJornada(): Promise<SystemSnapshot> {
  const state = readState();
  state.jornada.estado = "convocando";
  state.jornada.motivo_suspension = null;
  state.jornada.updated_at = new Date().toISOString();

  const adultosActivos = state.participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );

  const convocatoriaButtons: WhatsAppReplyButton[] = [
    { id: "btn_nivel_1", title: "Pasen a buscarme", variant: "primary" },
    { id: "btn_nivel_2", title: "Voy a la esquina", variant: "primary" },
    { id: "btn_nivel_3", title: "Voy directo al club", variant: "primary" },
  ];

  for (const adulto of adultosActivos) {
    let asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === adulto.id
    );
    if (!asis) {
      asis = {
        id: `asis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        jornada_id: state.jornada.id,
        participante_id: adulto.id,
        modalidad_elegida: "sin_respuesta",
        parada_esquina_id: null,
        padrino_asignado_id: adulto.padrino_preferido_id,
        estado_padrino: "no_aplica",
        acuse_suspension_leido: false,
        presente_validado_en_club: false,
        codigo_canje_farmacia: null,
        updated_at: new Date().toISOString(),
      };
      state.asistencias.push(asis);
    } else {
      asis.acuse_suspension_leido = false;
    }

    if (asis.modalidad_elegida === "sin_respuesta" || asis.modalidad_elegida === "no_asiste") {
      asis.modalidad_elegida = "sin_respuesta";
      asis.estado_padrino = "no_aplica";
      const primerNombre = adulto.nombre.split(" ")[0];
      await appendBotMessage(
        state,
        adulto,
        `Buen dia, ${primerNombre}. Hoy ${state.jornada.hora_inicio_caminata} hs nos encontramos en el ${state.circuito.nombre_club} para caminar juntos y cerrar con ${state.jornada.actividad_cierre}. Asistiendo hoy sumas *$${formatPesos(
          state.jornada.monto_reintegro_asistencia
        )} de reintegro Sancor en Farmacias*. ¿Como te sumas hoy?`,
        { buttons: convocatoriaButtons }
      );
    }
  }

  addLog(
    state,
    "Coordinadora Marta Rios",
    "Flujo 1: Convocatoria Disparada",
    `Mensajes 1 a 1 enviados a los adultos mayores del circuito ${state.circuito.nombre_barrio}.`,
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
  const state = readState();

  const actor = state.participantes.find((p) => {
    if (params.participanteId && p.id === params.participanteId) return true;
    if (params.fromPhone) {
      const pDigits = p.telefono.replace(/[^0-9]/g, "").slice(-6);
      const fromDigits = params.fromPhone.replace(/[^0-9]/g, "").slice(-6);
      if (pDigits && pDigits === fromDigits) return true;
    }
    return false;
  });

  if (!actor) return state;

  const { buttonId } = params;
  const primerNombre = actor.nombre.split(" ")[0];

  appendUserMessage(state, actor, params.buttonTitle || buttonId);

  // FLUJO 2: NIVEL 1 (PUERTA A PUERTA)
  if (buttonId === "btn_nivel_1") {
    let asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === actor.id
    );
    const padrinoId = actor.padrino_preferido_id || SEED_IDS.padrinoCarlos;
    const padrino = state.participantes.find((p) => p.id === padrinoId);

    if (!asis) {
      asis = {
        id: `asis-${Date.now()}`,
        jornada_id: state.jornada.id,
        participante_id: actor.id,
        modalidad_elegida: "nivel_1_puerta",
        parada_esquina_id: null,
        padrino_asignado_id: padrinoId,
        estado_padrino: "esperando_confirmacion",
        acuse_suspension_leido: false,
        presente_validado_en_club: false,
        codigo_canje_farmacia: null,
        updated_at: new Date().toISOString(),
      };
      state.asistencias.push(asis);
    } else {
      asis.modalidad_elegida = "nivel_1_puerta";
      asis.parada_esquina_id = null;
      asis.padrino_asignado_id = padrinoId;
      asis.estado_padrino = "esperando_confirmacion";
      asis.updated_at = new Date().toISOString();
    }

    await appendBotMessage(
      state,
      actor,
      `Barbaro, ${primerNombre}. Ya le estamos avisando a tu vecino padrino para confirmar el horario. Quedate atenta.`,
      {
        buttons: [
          {
            id: "btn_adulto_cancela",
            title: "Cambio de planes, no voy",
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
        `Hola ${nombrePadrino}. Tu vecina *${actor.nombre}* (${actor.direccion}) pidio acompanamiento puerta a puerta para la salida de hoy. Si la acompanas sumas tu *Plus de Padrinazgo (+$${formatPesos(
          state.jornada.plus_reintegro_padrino
        )})*. ¿Podes pasar por su casa a las ${state.jornada.hora_inicio_caminata} hs?`,
        {
          buttons: [
            {
              id: `btn_padrino_acepta:${actor.id}`,
              title: "Si, paso por ahi",
              variant: "success",
            },
            {
              id: `btn_padrino_rechaza:${actor.id}`,
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
        `${actor.nombre} pidio acompanamiento domiciliario. Se notifico a ${padrino.nombre} (${padrino.credencial_nro}).`,
        "warning"
      );
    }
  }

  // FLUJO 2: PADRINO CONFIRMA
  else if (buttonId.startsWith("btn_padrino_acepta:")) {
    const adultoId = buttonId.split(":")[1];
    const adulto = state.participantes.find((p) => p.id === adultoId);
    const asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === adultoId
    );

    if (adulto && asis) {
      asis.padrino_asignado_id = actor.id;
      asis.estado_padrino = "confirmado";
      asis.updated_at = new Date().toISOString();

      const nombreAdulto = adulto.nombre.split(" ")[0];

      await appendBotMessage(
        state,
        actor,
        `Muchas gracias, ${primerNombre}. Quedo confirmado tu acompanamiento puerta a puerta para *${adulto.nombre}* (${adulto.direccion}) hoy a las ${state.jornada.hora_inicio_caminata} hs. Ya le enviamos tu Ficha de Seguridad Oficial.`,
        {
          buttons: [
            {
              id: `btn_padrino_imprevisto:${adulto.id}`,
              title: "Tuve un imprevisto, no puedo ir",
              variant: "danger",
            },
          ],
        }
      );

      await appendBotMessage(
        state,
        adulto,
        `Confirmado, ${nombreAdulto}. Hoy a las ${state.jornada.hora_inicio_caminata} hs pasa por tu puerta *${actor.nombre}* (Padrino Acreditado del Club - Credencial ${actor.credencial_nro}). A preparar el equipo de mate.`,
        {
          fichaSeguridad: {
            padrinoNombre: actor.nombre,
            credencialNro: actor.credencial_nro || "#104",
            dni: actor.dni,
            horarioPuerta: `${state.jornada.hora_inicio_caminata} hs`,
            clubAcreditador: state.circuito.nombre_club,
          },
          buttons: [
            {
              id: "btn_adulto_cancela",
              title: "Cambio de planes, no voy",
              variant: "danger",
            },
          ],
        }
      );

      addLog(
        state,
        `${actor.nombre} (${actor.credencial_nro})`,
        "Flujo 2: Padrino Confirmado",
        `${actor.nombre} confirmo pasar por la puerta de ${adulto.nombre}. Ficha de Seguridad enviada.`,
        "success"
      );
    }
  }

  // FLUJO 4B: PADRINO RECHAZA O SE BAJA A ULTIMO MOMENTO
  else if (
    buttonId.startsWith("btn_padrino_rechaza:") ||
    buttonId.startsWith("btn_padrino_imprevisto:")
  ) {
    const adultoId = buttonId.split(":")[1];
    const adulto = state.participantes.find((p) => p.id === adultoId);
    const asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === adultoId
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
          `*REEMPLAZO DE CERCANIA URGENTE:* Hola ${nombreReemplazo}, el padrino ${actor.nombre} tuvo un imprevisto de ultimo momento. ¿Podes pasar a buscar a *${adulto.nombre}* (${adulto.direccion}) hoy a las ${state.jornada.hora_inicio_caminata} hs? Sumas *Plus de Padrinazgo (+$${formatPesos(
            state.jornada.plus_reintegro_padrino
          )})*.`,
          {
            esAlertaPrioritaria: true,
            buttons: [
              {
                id: `btn_padrino_acepta:${adulto.id}`,
                title: "Si, paso por ahi",
                variant: "success",
              },
              {
                id: `btn_padrino_rechaza:${adulto.id}`,
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
        `${actor.nombre} reporto un imprevisto para buscar a ${adulto.nombre}. Se activo alerta en el Panel del Coordinador.`,
        "danger"
      );
    }
  }

  // FLUJO 4C: ADULTO MAYOR CANCELA A ULTIMO MOMENTO
  else if (buttonId === "btn_adulto_cancela") {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === actor.id
    );

    if (asis) {
      const teniaPadrinoId = asis.padrino_asignado_id || actor.padrino_preferido_id;
      const eraNivel1 = asis.modalidad_elegida === "nivel_1_puerta";

      asis.modalidad_elegida = "no_asiste";
      asis.parada_esquina_id = null;
      asis.estado_padrino = "no_aplica";
      asis.updated_at = new Date().toISOString();

      await appendBotMessage(
        state,
        actor,
        `Entendido, ${primerNombre}. Ya registramos que hoy no asistis y le avisamos a tu vecino padrino para que no pase por tu casa. Te esperamos en la proxima jornada.`,
        {
          buttons: [
            {
              id: "btn_nivel_1",
              title: "Quiero volver a sumarme hoy",
              variant: "neutral",
            },
          ],
        }
      );

      if (eraNivel1 && teniaPadrinoId) {
        const padrino = state.participantes.find((p) => p.id === teniaPadrinoId);
        if (padrino) {
          const nombrePadrino = padrino.nombre.split(" ")[0];
          await appendBotMessage(
            state,
            padrino,
            `Aviso a tiempo, ${nombrePadrino}: Tu vecina *${primerNombre}* aviso que hoy no se suma a la caminata, asi que no hace falta que pases por su domicilio.`
          );
        }
      }

      addLog(
        state,
        actor.nombre,
        "Caso 4C: Cancelacion de Adulto Mayor",
        `${actor.nombre} aviso que hoy no asiste. Se notifico instantaneamente a su Padrino.`,
        "warning"
      );
    }
  }

  // FLUJO 3: SELECCION DE PARADA SEGURA (NIVEL 2)
  else if (buttonId === "btn_nivel_2") {
    const paradaButtons: WhatsAppReplyButton[] = state.circuito.paradas_seguras.map(
      (parada, idx) => ({
        id: `btn_parada:${parada.id}`,
        title: `Parada ${idx + 1}: ${parada.nombre_esquina.replace(
          /^Parada \d+:\s*/,
          ""
        )} (${parada.horario_paso})`,
        variant: "primary",
      })
    );

    paradaButtons.push({
      id: "btn_adulto_cancela",
      title: "Cambio de planes, no voy",
      variant: "danger",
    });

    await appendBotMessage(
      state,
      actor,
      `Muy bien, ${primerNombre}. Elegi en cual de las *Paradas Seguras relevadas por Sancor* (esquinas con rampa peatonal, veredas sanas y buena iluminacion) te sumas hoy al paso de la caravana:`,
      { buttons: paradaButtons }
    );

    addLog(
      state,
      actor.nombre,
      "Flujo 3: Consulta de Paradas Seguras (Nivel 2)",
      `${actor.nombre} solicito ver las esquinas seguras del circuito.`,
      "info"
    );
  }

  // FLUJO 3: CONFIRMACION DE ESQUINA
  else if (buttonId.startsWith("btn_parada:")) {
    const paradaId = buttonId.split(":")[1];
    const parada = state.circuito.paradas_seguras.find((p) => p.id === paradaId);

    let asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === actor.id
    );
    if (!asis) {
      asis = {
        id: `asis-${Date.now()}`,
        jornada_id: state.jornada.id,
        participante_id: actor.id,
        modalidad_elegida: "nivel_2_esquina",
        parada_esquina_id: paradaId,
        padrino_asignado_id: null,
        estado_padrino: "no_aplica",
        acuse_suspension_leido: false,
        presente_validado_en_club: false,
        codigo_canje_farmacia: null,
        updated_at: new Date().toISOString(),
      };
      state.asistencias.push(asis);
    } else {
      asis.modalidad_elegida = "nivel_2_esquina";
      asis.parada_esquina_id = paradaId;
      asis.estado_padrino = "no_aplica";
      asis.updated_at = new Date().toISOString();
    }

    if (parada) {
      await appendBotMessage(
        state,
        actor,
        `Agendado, ${primerNombre}. Te esperamos en *${parada.nombre_esquina}* a las *${parada.horario_paso}* para sumarte a la caravana rumbo al ${state.circuito.nombre_club}.`,
        {
          buttons: [
            {
              id: "btn_adulto_cancela",
              title: "Cambio de planes, no voy",
              variant: "danger",
            },
          ],
        }
      );

      addLog(
        state,
        actor.nombre,
        "Flujo 3: Parada Segura Confirmada",
        `${actor.nombre} confirmo espera en ${parada.nombre_esquina} (${parada.horario_paso}).`,
        "success"
      );
    }
  }

  // NIVEL 3: DIRECTO AL CLUB
  else if (buttonId === "btn_nivel_3") {
    let asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === actor.id
    );
    if (!asis) {
      asis = {
        id: `asis-${Date.now()}`,
        jornada_id: state.jornada.id,
        participante_id: actor.id,
        modalidad_elegida: "nivel_3_directo",
        parada_esquina_id: null,
        padrino_asignado_id: null,
        estado_padrino: "no_aplica",
        acuse_suspension_leido: false,
        presente_validado_en_club: false,
        codigo_canje_farmacia: null,
        updated_at: new Date().toISOString(),
      };
      state.asistencias.push(asis);
    } else {
      asis.modalidad_elegida = "nivel_3_directo";
      asis.parada_esquina_id = null;
      asis.estado_padrino = "no_aplica";
      asis.updated_at = new Date().toISOString();
    }

    await appendBotMessage(
      state,
      actor,
      `Excelente, ${primerNombre}. Te esperamos directamente a las *${state.jornada.hora_encuentro_club} hs* en el *${state.circuito.nombre_club}* (${state.circuito.direccion_club}) para compartir el ${state.jornada.actividad_cierre}.`,
      {
        buttons: [
          {
            id: "btn_adulto_cancela",
            title: "Cambio de planes, no voy",
            variant: "danger",
          },
        ],
      }
    );

    addLog(
      state,
      actor.nombre,
      "Anillo Nivel 3 Confirmado",
      `${actor.nombre} confirmo asistencia directa al Club a las ${state.jornada.hora_encuentro_club} hs.`,
      "success"
    );
  }

  // FLUJO 4A: ACUSE DE RECIBO DE SUSPENSION
  else if (buttonId === "btn_acuse_suspension") {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === actor.id
    );
    if (asis) {
      asis.acuse_suspension_leido = true;
      asis.updated_at = new Date().toISOString();
    }

    await appendBotMessage(
      state,
      actor,
      `Gracias por confirmar, ${primerNombre}. Ya le avisamos a la coordinadora Marta que leiste el mensaje y te quedas en casa. Nos vemos en la proxima salida.`
    );

    addLog(
      state,
      actor.nombre,
      "Caso 4A: Acuse de Suspension Recibido",
      `${actor.nombre} confirmo lectura de suspension climatica.`,
      "success"
    );
  }

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}
