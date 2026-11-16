import {
  Participante,
  SEED_IDS,
  SystemSnapshot,
} from "@/types/domain";
import {
  addLog,
  appendBotMessage,
  formatPesos,
  generateUuid,
  readStateAsync,
  syncToSupabaseIfConfigured,
  writeState,
} from "@/lib/state-persistence";

export async function suspenderJornadaPorEmergencia(
  motivo?: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  state.jornada.estado = "suspendida_emergencia";
  state.jornada.motivo_suspension =
    motivo || "Condiciones climaticas adversas y riesgo de resbalones en veredas";
  state.jornada.updated_at = new Date().toISOString();

  const participantesNotificables = state.participantes.filter(
    (p) =>
      p.estado_alta === "activo" &&
      (p.rol === "adulto_mayor" || p.rol === "padrino")
  );

  for (const part of participantesNotificables) {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === part.id
    );
    if (asis) {
      asis.acuse_suspension_leido = false;
      asis.updated_at = new Date().toISOString();
    }

    const primerNombre = part.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      part,
      `*AVISO IMPORTANTE DEL CLUB:* ${primerNombre}, por condiciones climaticas y para cuidar tu seguridad en las veredas, *SE SUSPENDE el encuentro de hoy*. Quedate en casa. Por favor toca el boton de abajo para que sepamos que leiste este aviso.`,
      {
        esAlertaPrioritaria: true,
        buttons: [
          {
            id: "btn_acuse_suspension",
            title: "Me quedo en casa",
            variant: "success",
          },
        ],
      }
    );
  }

  addLog(
    state,
    "Coordinadora Marta Rios",
    "Caso 4A: Jornada Suspendida por Clima",
    "Se enviaron alertas prioritarias con requerimiento de acuse de recibo a los participantes.",
    "danger"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function reasignarTutorManualCoordinador(
  adultoId: string,
  nuevoPadrinoId?: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const adulto = state.participantes.find((p) => p.id === adultoId);
  const asis = state.asistencias.find(
    (a) => a.jornada_id === state.jornada.id && a.participante_id === adultoId
  );

  const padrinoReemplazo =
    state.participantes.find((p) => p.id === nuevoPadrinoId) ||
    state.participantes.find(
      (p) =>
        p.rol === "padrino" &&
        p.acreditado_por_club &&
        p.id !== asis?.padrino_asignado_id
    ) ||
    state.participantes.find((p) => p.id === SEED_IDS.padrinoHector);

  if (adulto && asis && padrinoReemplazo) {
    asis.padrino_asignado_id = padrinoReemplazo.id;
    asis.estado_padrino = "confirmado";
    asis.updated_at = new Date().toISOString();

    const nombreAdulto = adulto.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      adulto,
      `Confirmado, ${nombreAdulto}. La coordinadora del Club te asigno un Tutor Acreditado de reemplazo: hoy a las ${state.jornada.hora_inicio_caminata} hs pasa por tu puerta *${padrinoReemplazo.nombre}* (Padrino Acreditado del Club - Credencial ${padrinoReemplazo.credencial_nro}). A preparar el equipo de mate.`,
      {
        fichaSeguridad: {
          padrinoNombre: padrinoReemplazo.nombre,
          credencialNro: padrinoReemplazo.credencial_nro || "#108",
          dni: padrinoReemplazo.dni,
          horarioPuerta: `${state.jornada.hora_inicio_caminata} hs`,
          clubAcreditador: state.circuito.nombre_club,
        },
        buttons: [
          {
            id: "btn_adulto_cancela",
            title: "No voy hoy",
            variant: "danger",
          },
        ],
      }
    );

    addLog(
      state,
      "Coordinadora Marta Rios",
      "Caso 4B Resuelto: Tutor Reasignado",
      `Se asigno a ${padrinoReemplazo.nombre} (${padrinoReemplazo.credencial_nro}) para buscar a ${adulto.nombre}.`,
      "success"
    );
  }

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function frenarSalidaAdultoPorSeguridad(
  adultoId: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const adulto = state.participantes.find((p) => p.id === adultoId);
  const asis = state.asistencias.find(
    (a) => a.jornada_id === state.jornada.id && a.participante_id === adultoId
  );

  if (adulto && asis) {
    asis.estado_padrino = "sin_padrino_frenado";
    asis.updated_at = new Date().toISOString();

    const nombreAdulto = adulto.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      adulto,
      `*Cuidado Preventivo del Club:* Hola ${nombreAdulto}, hoy tu vecino padrino tuvo un imprevisto de ultimo momento. Por tu seguridad en las veredas, *te pedimos que hoy no salgas sola a la calle*. La coordinadora Marta te llamara en unos minutos.`,
      {
        esAlertaPrioritaria: true,
        buttons: [
          {
            id: "btn_acuse_suspension",
            title: "Me quedo en casa",
            variant: "success",
          },
        ],
      }
    );

    addLog(
      state,
      "Coordinadora Marta Rios",
      "Caso 4B Resuelto: Salida Frenada",
      `Se freno preventivamente la salida de ${adulto.nombre} por falta de padrino.`,
      "warning"
    );
  }

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function validarPresenciaEnClub(
  participanteIds: string[]
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const padrinosBonificadosEnLote = new Set<string>();

  for (const partId of participanteIds) {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === state.jornada.id && a.participante_id === partId
    );
    const adulto = state.participantes.find((p) => p.id === partId);

    if (!asis || !adulto || asis.presente_validado_en_club) continue;

    if (
      asis.modalidad_elegida === "sin_respuesta" ||
      asis.modalidad_elegida === "no_asiste"
    ) {
      asis.modalidad_elegida =
        adulto.nivel_autonomia_habitual === 1
          ? "nivel_1_puerta"
          : adulto.nivel_autonomia_habitual === 2
          ? "nivel_2_esquina"
          : "nivel_3_directo";
      if (asis.modalidad_elegida === "nivel_1_puerta") {
        asis.estado_padrino = "confirmado";
        asis.padrino_asignado_id =
          adulto.padrino_preferido_id || SEED_IDS.padrinoCarlos;
      }
    }

    const randomCode = Math.floor(100 + Math.random() * 900);
    const codigoCanje = `SANCOR-FARMA-${randomCode}`;

    asis.presente_validado_en_club = true;
    asis.codigo_canje_farmacia = codigoCanje;
    asis.updated_at = new Date().toISOString();

    const montoAdulto = state.jornada.monto_reintegro_asistencia;
    adulto.saldo_reintegro_sancor += montoAdulto;

    const primerNombre = adulto.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      adulto,
      `Que linda tarde compartimos en el club, ${primerNombre}. Por tu participacion de hoy ya tenes acreditados *$${formatPesos(
        montoAdulto
      )} de reintegro directo en Farmacias adheridas del barrio*. Tu saldo acumulado en Sancor es de *$${formatPesos(
        adulto.saldo_reintegro_sancor
      )}*. Mostra este codigo en la farmacia: *${codigoCanje}*.`,
      {
        recompensaSancor: {
          montoAcreditado: montoAdulto,
          saldoTotal: adulto.saldo_reintegro_sancor,
          codigoCanje,
        },
      }
    );

    if (
      asis.modalidad_elegida === "nivel_1_puerta" &&
      asis.padrino_asignado_id &&
      !padrinosBonificadosEnLote.has(`${asis.padrino_asignado_id}-${adulto.id}`)
    ) {
      const padrino = state.participantes.find(
        (p) => p.id === asis.padrino_asignado_id
      );
      if (padrino) {
        padrinosBonificadosEnLote.add(`${padrino.id}-${adulto.id}`);
        const plus = state.jornada.plus_reintegro_padrino;
        const base = state.jornada.monto_reintegro_asistencia;
        const totalPadrinoHoy = base + plus;
        padrino.saldo_reintegro_sancor += totalPadrinoHoy;
        const codigoPadrino = `SANCOR-FARMA-P${Math.floor(
          100 + Math.random() * 899
        )}`;

        const nombrePadrino = padrino.nombre.split(" ")[0];
        await appendBotMessage(
          state,
          padrino,
          `*Gracias por tu compromiso barrial, ${nombrePadrino}.* Validamos en el Club tu llegada acompanando a *${adulto.nombre}*. Se acreditaron *$${formatPesos(
            base
          )}* de asistencia + *$${formatPesos(
            plus
          )} de Plus de Padrinazgo*. Tu saldo acumulado Sancor en Farmacias es de *$${formatPesos(
            padrino.saldo_reintegro_sancor
          )}*. Codigo de canje: *${codigoPadrino}*.`,
          {
            recompensaSancor: {
              montoAcreditado: totalPadrinoHoy,
              plusPadrinazgo: plus,
              saldoTotal: padrino.saldo_reintegro_sancor,
              codigoCanje: codigoPadrino,
            },
          }
        );
      }
    }

    addLog(
      state,
      adulto.nombre,
      "Flujo 5: Llegada Validada en Club",
      `Se acreditaron $${formatPesos(montoAdulto)} en Farmacias Sancor (Codigo ${codigoCanje}).`,
      "success"
    );
  }

  state.jornada.estado = "en_club";
  state.jornada.updated_at = new Date().toISOString();

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function aprobarAltaDerivacionFamiliar(
  participanteId: string,
  padrinoAsignadoId: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const adulto = state.participantes.find((p) => p.id === participanteId);
  const padrino = state.participantes.find((p) => p.id === padrinoAsignadoId);

  if (adulto && padrino) {
    adulto.estado_alta = "activo";
    adulto.padrino_preferido_id = padrino.id;

    const existeAsis = state.asistencias.find(
      (a) =>
        a.jornada_id === state.jornada.id && a.participante_id === adulto.id
    );
    if (!existeAsis) {
      state.asistencias.push({
        id: generateUuid(),
        jornada_id: state.jornada.id,
        participante_id: adulto.id,
        modalidad_elegida: "nivel_1_puerta",
        parada_esquina_id: null,
        padrino_asignado_id: padrino.id,
        estado_padrino: "esperando_confirmacion",
        acuse_suspension_leido: false,
        presente_validado_en_club: false,
        codigo_canje_farmacia: null,
        updated_at: new Date().toISOString(),
      });
    }

    const nombrePadrino = padrino.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      padrino,
      `*Nueva Asignacion de Cercania:* Hola ${nombrePadrino}, la coordinadora Marta aprobo la incorporacion de tu vecino *${adulto.nombre}* (${adulto.direccion}), inscripto por su familiar (${adulto.contacto_familiar_nombre}). ¿Podes pasar a buscarlo hoy a las ${state.jornada.hora_inicio_caminata} hs para su primer encuentro?`,
      {
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

    addLog(
      state,
      "Coordinadora Marta Rios",
      "Solicitud Familiar Aprobada",
      `Se aprobo el alta de ${adulto.nombre} con el Padrino ${padrino.nombre} (${padrino.credencial_nro}).`,
      "success"
    );
  }

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function crearSolicitudNietoFamiliar(input: {
  nombreAdulto: string;
  edad: number;
  dni: string;
  telefonoAdulto: string;
  direccion: string;
  nombreFamiliar: string;
  vinculo: string;
  telefonoFamiliar: string;
  notas: string;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();

  const jitterLat = (Math.random() - 0.5) * 0.0025;
  const jitterLng = (Math.random() - 0.5) * 0.0025;

  const nuevo: Participante = {
    id: generateUuid(),
    nombre: input.nombreAdulto,
    edad: Number(input.edad) || 76,
    dni: input.dni || "09.123.456",
    telefono:
      input.telefonoAdulto ||
      `+5493424${Math.floor(100000 + Math.random() * 899999)}`,
    rol: "adulto_mayor",
    direccion: input.direccion || "Marcial Candioti 3510, Barrio Candioti",
    coords_domicilio: {
      lat: Number((-31.6355 + jitterLat).toFixed(5)),
      lng: Number((-60.6895 + jitterLng).toFixed(5)),
    },
    nivel_autonomia_habitual: 1,
    padrino_preferido_id: null,
    acreditado_por_club: false,
    credencial_nro: null,
    saldo_reintegro_sancor: 0,
    contacto_familiar_nombre: `${input.nombreFamiliar} (${
      input.vinculo || "Nieto/a"
    })`,
    contacto_familiar_tel: input.telefonoFamiliar || "+5493425998877",
    notas_vulnerabilidad:
      input.notas ||
      "Inscripto desde el Formulario Familiar. Requiere acompanamiento puerta a puerta (Nivel 1).",
    estado_alta: "pendiente_aprobacion",
  };

  state.participantes.push(nuevo);

  addLog(
    state,
    nuevo.contacto_familiar_nombre,
    "Nueva Solicitud Familiar",
    `Se cargo solicitud de incorporacion para ${nuevo.nombre} (${nuevo.direccion}).`,
    "info"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function acreditarNuevoVecinoPadrino(input: {
  nombre: string;
  edad: number;
  dni: string;
  telefono: string;
  direccion: string;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const padrinosCount = state.participantes.filter(
    (p) => p.rol === "padrino"
  ).length;
  const nuevaCredencial = `#${104 + padrinosCount * 4 + 1}`;

  const nuevoPadrino: Participante = {
    id: generateUuid(),
    nombre: input.nombre,
    edad: Number(input.edad) || 65,
    dni: input.dni,
    telefono:
      input.telefono ||
      `+5493424${Math.floor(100000 + Math.random() * 899999)}`,
    rol: "padrino",
    direccion: input.direccion,
    coords_domicilio: {
      lat: -31.6358,
      lng: -60.6902,
    },
    nivel_autonomia_habitual: 3,
    padrino_preferido_id: null,
    acreditado_por_club: true,
    credencial_nro: nuevaCredencial,
    saldo_reintegro_sancor: 2500,
    contacto_familiar_nombre: "Acreditacion Presencial Club Candioti",
    contacto_familiar_tel: "+5493424551234",
    notas_vulnerabilidad:
      "Vecino acreditado presencialmente verificando DNI y domicilio barrial.",
    estado_alta: "activo",
  };

  state.participantes.push(nuevoPadrino);

  addLog(
    state,
    "Coordinadora Marta Rios",
    "Nuevo Vecino Padrino Acreditado",
    `Se valido DNI ${nuevoPadrino.dni} de ${nuevoPadrino.nombre} con Credencial ${nuevaCredencial}.`,
    "success"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}
