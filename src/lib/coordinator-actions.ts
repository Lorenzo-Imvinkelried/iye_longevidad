import crypto from "crypto";
import {
  Asistencia,
  CircuitoBarrial,
  Coords,
  Jornada,
  ModalidadElegida,
  ParadaSegura,
  Participante,
  SEED_IDS,
  SystemSnapshot,
} from "@/types/domain";
import {
  CANDIOTI_STREET_ROUTE,
  CENTRO_STREET_ROUTE,
  fetchStreetWalkingRoute,
  GUADALUPE_STREET_ROUTE,
  PARQUE_FEDERAL_STREET_ROUTE,
} from "@/lib/street-routing";
import {
  encodeNotasWithFoto,
  findExistingSeniorByDniOrPhone,
  findScheduleConflict,
  formatPolizaWithTutores,
  getCircuitoTutoresIds,
  normalizeDni,
  phonesMatch,
} from "@/lib/domain-helpers";
import {
  addLog,
  appendBotMessage,
  generateUuid,
  readStateAsync,
  syncToSupabaseIfConfigured,
  writeState,
} from "@/lib/state-persistence";

function hashPin(pin: string): string {
  return crypto
    .createHash("sha256")
    .update(`sancor-longevidad:${pin.trim()}`)
    .digest("hex")
    .slice(0, 16);
}

function verifyTutorPin(tutor: Participante, clave: string): boolean {
  const match = (tutor.notas_vulnerabilidad || "").match(/\|pin:([a-f0-9]+)/i);
  if (match) {
    return match[1] === hashPin(clave);
  }
  return clave.trim() === "1234";
}

function ensureUniquePhone(
  participantes: Participante[],
  preferred?: string
): string {
  const candidate = (preferred || "").trim();
  const isTaken = (tel: string) =>
    participantes.some((p) => p.telefono.trim() === tel);
  if (candidate && !isTaken(candidate)) {
    return candidate;
  }
  let generated = "";
  do {
    generated = `+5493424${Math.floor(100000 + Math.random() * 899999)}`;
  } while (isTaken(generated));
  return generated;
}

function resolveEventForCoordinator(
  state: SystemSnapshot,
  jornadaId?: string
): { targetJornada: Jornada; targetCircuito: CircuitoBarrial } {
  const targetJornada =
    (jornadaId && state.jornadas.find((j) => j.id === jornadaId)) ||
    state.jornada;
  const targetCircuito =
    state.circuitos.find((c) => c.id === targetJornada.circuito_id) ||
    state.circuito;
  state.jornada = targetJornada;
  state.circuito = targetCircuito;
  return { targetJornada, targetCircuito };
}

export const BARRIOS_SANTA_FE_PRESETS: Record<
  string,
  {
    label: string;
    coordsClub: { lat: number; lng: number };
    parada1: { nombre: string; lat: number; lng: number };
    parada2: { nombre: string; lat: number; lng: number };
    ruta: [number, number][];
  }
> = {
  candioti: {
    label: "Barrio Candioti Sur / Bv. Galvez",
    coordsClub: { lat: -31.6388, lng: -60.6915 },
    parada1: {
      nombre: "Parada 1: Bv. Galvez y Sarmiento",
      lat: -31.6362,
      lng: -60.6882,
    },
    parada2: {
      nombre: "Parada 2: Plaza Pueyrredon",
      lat: -31.6366,
      lng: -60.6928,
    },
    ruta: CANDIOTI_STREET_ROUTE,
  },
  guadalupe: {
    label: "Barrio Guadalupe / Costanera Este",
    coordsClub: { lat: -31.601512, lng: -60.672738 },
    parada1: {
      nombre: "Parada 1: Av. Galicia y Gral. Paz",
      lat: -31.604156,
      lng: -60.676388,
    },
    parada2: {
      nombre: "Parada 2: Plaza Del Folklore",
      lat: -31.602536,
      lng: -60.67302,
    },
    ruta: GUADALUPE_STREET_ROUTE,
  },
  centro: {
    label: "Centro / Parque Sur (Santa Fe Capital)",
    coordsClub: { lat: -31.651324, lng: -60.708533 },
    parada1: {
      nombre: "Parada 1: Peatonal San Martin y Tucuman",
      lat: -31.646921,
      lng: -60.706242,
    },
    parada2: {
      nombre: "Parada 2: Plaza 25 de Mayo",
      lat: -31.651415,
      lng: -60.708065,
    },
    ruta: CENTRO_STREET_ROUTE,
  },
  parque_federal: {
    label: "Parque Federal / Sargento Cabral",
    coordsClub: { lat: -31.622503, lng: -60.691187 },
    parada1: {
      nombre: "Parada 1: Salvador del Carril y Alvear",
      lat: -31.620064,
      lng: -60.688566,
    },
    parada2: {
      nombre: "Parada 2: Mirador Parque Federal (Pedro Vittori)",
      lat: -31.62418,
      lng: -60.693893,
    },
    ruta: PARQUE_FEDERAL_STREET_ROUTE,
  },
};

function syncActiveJornadaIntoArray(state: SystemSnapshot) {
  const idx = state.jornadas.findIndex((j) => j.id === state.jornada.id);
  if (idx >= 0) {
    state.jornadas[idx] = state.jornada;
  } else {
    state.jornadas.unshift(state.jornada);
  }
}

export async function loginTutorConClave(input: {
  identificador: string;
  clave: string;
}): Promise<{ ok: boolean; tutorId?: string; snapshot?: SystemSnapshot; error?: string }> {
  const state = await readStateAsync();
  const qNorm = normalizeDni(input.identificador);
  const qLower = (input.identificador || "").trim().toLowerCase();

  const tutor = state.participantes.find((p) => {
    if (p.rol !== "coordinador") return false;
    if (qNorm && normalizeDni(p.dni) === qNorm) return true;
    return p.nombre.toLowerCase() === qLower;
  });

  if (!tutor || !verifyTutorPin(tutor, input.clave || "")) {
    return {
      ok: false,
      error: "DNI / Usuario o clave incorrectos. Podes crear una cuenta nueva o usar el acceso Demo.",
    };
  }

  state.tutorActivoId = tutor.id;
  const tutorCircuitos = state.circuitos
    .filter((c) => (c.poliza_nro || "").includes(`tutor:${tutor.id}`))
    .map((c) => c.id);
  const targetJornada =
    state.jornadas.find((j) => tutorCircuitos.includes(j.circuito_id)) ||
    state.jornada;

  state.jornada = targetJornada;
  state.circuito =
    state.circuitos.find((c) => c.id === targetJornada.circuito_id) ||
    state.circuito;

  writeState(state);
  return { ok: true, tutorId: tutor.id, snapshot: state };
}

export async function seleccionarEventoActivo(params: {
  jornadaId?: string;
  tutorId?: string;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();

  if (params.tutorId) {
    state.tutorActivoId = params.tutorId;
  }

  let targetJornada: Jornada | undefined;
  if (params.jornadaId) {
    targetJornada = state.jornadas.find((j) => j.id === params.jornadaId);
  } else if (params.tutorId) {
    const tutorCircuitos = state.circuitos
      .filter((c) => (c.poliza_nro || "").includes(`tutor:${params.tutorId}`))
      .map((c) => c.id);
    targetJornada = state.jornadas.find((j) =>
      tutorCircuitos.includes(j.circuito_id)
    );
  }

  if (targetJornada) {
    targetJornada.updated_at = new Date().toISOString();
    state.jornada = targetJornada;
    const circ = state.circuitos.find((c) => c.id === targetJornada!.circuito_id);
    if (circ) {
      state.circuito = circ;
    }
    syncActiveJornadaIntoArray(state);
  }

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

async function buildCircuitoFromLocation(input: {
  id: string;
  tutorId: string;
  nombreLugar: string;
  direccionLugar: string;
  zonaKey?: string;
  coordsCustom?: { lat: number; lng: number } | null;
  barrioCustom?: string;
  horaCaminata: string;
  horaEncuentro: string;
}): Promise<CircuitoBarrial> {
  const preset =
    BARRIOS_SANTA_FE_PRESETS[input.zonaKey || "candioti"] ||
    BARRIOS_SANTA_FE_PRESETS.candioti;

  const hasCustom = Boolean(
    input.coordsCustom &&
      Number.isFinite(input.coordsCustom.lat) &&
      Number.isFinite(input.coordsCustom.lng)
  );

  const coordsClub = hasCustom
    ? {
        lat: Number(input.coordsCustom!.lat.toFixed(6)),
        lng: Number(input.coordsCustom!.lng.toFixed(6)),
      }
    : preset.coordsClub;

  const parada1Coords = hasCustom
    ? {
        lat: Number((coordsClub.lat + 0.0022).toFixed(6)),
        lng: Number((coordsClub.lng - 0.002).toFixed(6)),
      }
    : { lat: preset.parada1.lat, lng: preset.parada1.lng };

  const parada2Coords = hasCustom
    ? {
        lat: Number((coordsClub.lat + 0.0011).toFixed(6)),
        lng: Number((coordsClub.lng - 0.0009).toFixed(6)),
      }
    : { lat: preset.parada2.lat, lng: preset.parada2.lng };

  let ruta: [number, number][] = preset.ruta;
  if (hasCustom) {
    const waypoints: [number, number][] = [
      [parada1Coords.lat, parada1Coords.lng],
      [parada2Coords.lat, parada2Coords.lng],
      [coordsClub.lat, coordsClub.lng],
    ];
    const streetRes = await fetchStreetWalkingRoute(waypoints);
    ruta = streetRes.coords;
  }

  return {
    id: input.id,
    nombre_barrio: input.barrioCustom?.trim() || preset.label,
    nombre_club: input.nombreLugar,
    direccion_club: input.direccionLugar || "Santa Fe Capital",
    coords_club: coordsClub,
    poliza_sancor_activa: true,
    poliza_nro: `SANCOR-RC-${Math.floor(10000 + Math.random() * 89999)}|tutor:${input.tutorId}`,
    paradas_seguras: [
      {
        id: "parada_1",
        nombre_esquina: hasCustom
          ? `Parada 1: Punto de encuentro cercano a ${input.nombreLugar}`
          : preset.parada1.nombre,
        lat: parada1Coords.lat,
        lng: parada1Coords.lng,
        horario_paso: `${input.horaCaminata || "16:00"} hs`,
        estado_veredas: "Esquina relevada con acceso seguro",
        tiene_rampa: true,
        iluminacion_ok: true,
      },
      {
        id: "parada_2",
        nombre_esquina: hasCustom
          ? `Parada 2: Acceso principal (${input.direccionLugar || input.nombreLugar})`
          : preset.parada2.nombre,
        lat: parada2Coords.lat,
        lng: parada2Coords.lng,
        horario_paso: `${input.horaEncuentro || "16:20"} hs`,
        estado_veredas: "Corredor seguro iluminado",
        tiene_rampa: true,
        iluminacion_ok: true,
      },
    ],
    ruta_polilinea: ruta,
  };
}

export async function registrarNuevoTutorYLugar(input: {
  nombreTutor: string;
  dniTutor: string;
  claveTutor: string;
  telefonoTutor: string;
  especialidad: string;
  nombreLugar: string;
  direccionLugar: string;
  zonaKey: string;
  coordsCustom?: { lat: number; lng: number } | null;
  barrioCustom?: string;
  actividadInicial: string;
  horaCaminata: string;
  horaEncuentro: string;
  keepCurrentSession?: boolean;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();

  const dniNorm = normalizeDni(input.dniTutor);
  const yaExiste = state.participantes.find(
    (p) => p.rol === "coordinador" && dniNorm && normalizeDni(p.dni) === dniNorm
  );
  if (yaExiste) {
    throw new Error(
      `Ya existe una cuenta registrada con el DNI/Usuario "${input.dniTutor}". Ingresa con tu clave en "Ingresar con mi cuenta".`
    );
  }

  const tutorId = generateUuid();
  const circuitoId = generateUuid();
  const jornadaId = generateUuid();
  const pinHash = hashPin(input.claveTutor || "1234");
  const telefonoUnico = ensureUniquePhone(state.participantes, input.telefonoTutor);

  const nuevoCircuito = await buildCircuitoFromLocation({
    id: circuitoId,
    tutorId,
    nombreLugar: input.nombreLugar,
    direccionLugar: input.direccionLugar,
    zonaKey: input.zonaKey,
    coordsCustom: input.coordsCustom,
    barrioCustom: input.barrioCustom,
    horaCaminata: input.horaCaminata || "18:00",
    horaEncuentro: input.horaEncuentro || "18:20",
  });

  const nuevoTutor: Participante = {
    id: tutorId,
    nombre: input.nombreTutor,
    edad: 45,
    dni: input.dniTutor || "25.100.200",
    telefono: telefonoUnico,
    rol: "coordinador",
    direccion: input.direccionLugar,
    coords_domicilio: nuevoCircuito.coords_club,
    nivel_autonomia_habitual: 3,
    padrino_preferido_id: null,
    acreditado_por_club: true,
    credencial_nro: input.especialidad || "Encargado de Club / Sala",
    saldo_reintegro_sancor: 0,
    contacto_familiar_nombre: input.nombreLugar,
    contacto_familiar_tel: input.telefonoTutor || "+5493424551234",
    notas_vulnerabilidad: `Responsable de ${input.nombreLugar} |pin:${pinHash}`,
    estado_alta: "activo",
  };

  const nuevaJornada: Jornada = {
    id: jornadaId,
    circuito_id: circuitoId,
    fecha: new Date().toISOString().split("T")[0],
    hora_inicio_caminata: input.horaCaminata || "18:00",
    hora_encuentro_club: input.horaEncuentro || "18:20",
    actividad_cierre:
      input.actividadInicial || "Encuentro Recreativo, Juegos de Mesa y Mateada",
    monto_reintegro_asistencia: 0,
    plus_reintegro_padrino: 0,
    estado: "programada",
    motivo_suspension: null,
    updated_at: new Date().toISOString(),
  };

  state.participantes.push(nuevoTutor);
  state.circuitos.unshift(nuevoCircuito);
  state.jornadas.unshift(nuevaJornada);
  if (!input.keepCurrentSession) {
    state.tutorActivoId = tutorId;
    state.circuito = nuevoCircuito;
    state.jornada = nuevaJornada;
  }

  // Vincular a Rosa y Jorge solo si no tienen conflicto horario en esa franja
  const adultosBase = [SEED_IDS.rosa, SEED_IDS.jorge];
  const vinculados: string[] = [];
  for (const adId of adultosBase) {
    const ad = state.participantes.find((p) => p.id === adId);
    if (!ad) continue;
    const conflicto = findScheduleConflict(
      ad.id,
      nuevaJornada,
      state.jornadas,
      state.asistencias,
      state.circuitos
    );
    if (!conflicto) {
      state.asistencias.push({
        id: generateUuid(),
        jornada_id: jornadaId,
        participante_id: ad.id,
        modalidad_elegida: "sin_respuesta",
        parada_esquina_id: null,
        padrino_asignado_id: ad.padrino_preferido_id || SEED_IDS.padrinoCarlos,
        estado_padrino: "no_aplica",
        acuse_suspension_leido: false,
        presente_validado_en_club: false,
        codigo_canje_farmacia: null,
        updated_at: new Date().toISOString(),
      });
      vinculados.push(ad.nombre);
    }
  }

  addLog(
    state,
    nuevoTutor.nombre,
    "Nuevo Perfil y Lugar Creado",
    `Se registro ${nuevoTutor.nombre} con sede en ${nuevoCircuito.nombre_club}. ${
      vinculados.length > 0
        ? `Participantes iniciales sin superposicion: ${vinculados.join(", ")}.`
        : "Podes sumar abuelos a tu lista desde + Sumar Abuelo."
    }`,
    "success"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function crearNuevoEventoOLugar(input: {
  tutorId: string;
  modoLugar: "existente" | "nuevo";
  circuitoExistenteId?: string;
  nombreNuevoLugar?: string;
  direccionNuevoLugar?: string;
  zonaKey?: string;
  coordsCustom?: { lat: number; lng: number } | null;
  barrioCustom?: string;
  actividad: string;
  fecha: string;
  horaCaminata: string;
  horaEncuentro: string;
  montoReintegro: number;
  plusPadrino: number;
  incluirAbuelosDelTutor: boolean;
  coCoordinadoresIds?: string[];
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  let targetCircuito: CircuitoBarrial | undefined;
  const activeTutor = input.tutorId || state.tutorActivoId;
  const allTutoresForCenter = Array.from(
    new Set([activeTutor, ...(input.coCoordinadoresIds || [])].filter(Boolean))
  );

  if (input.modoLugar === "nuevo" && input.nombreNuevoLugar) {
    targetCircuito = await buildCircuitoFromLocation({
      id: generateUuid(),
      tutorId: activeTutor,
      nombreLugar: input.nombreNuevoLugar,
      direccionLugar: input.direccionNuevoLugar || "Santa Fe Capital",
      zonaKey: input.zonaKey,
      coordsCustom: input.coordsCustom,
      barrioCustom: input.barrioCustom,
      horaCaminata: input.horaCaminata || "16:00",
      horaEncuentro: input.horaEncuentro || "16:20",
    });
    targetCircuito.poliza_nro = formatPolizaWithTutores(
      targetCircuito.poliza_nro,
      allTutoresForCenter
    );
    state.circuitos.unshift(targetCircuito);
  } else {
    targetCircuito =
      state.circuitos.find((c) => c.id === input.circuitoExistenteId) ||
      state.circuito;
    if (input.coCoordinadoresIds && input.coCoordinadoresIds.length > 0) {
      const merged = Array.from(
        new Set([...getCircuitoTutoresIds(targetCircuito), ...allTutoresForCenter])
      );
      targetCircuito.poliza_nro = formatPolizaWithTutores(
        targetCircuito.poliza_nro,
        merged
      );
    }
  }

  const nuevaJornada: Jornada = {
    id: generateUuid(),
    circuito_id: targetCircuito.id,
    fecha: input.fecha || new Date().toISOString().split("T")[0],
    hora_inicio_caminata: input.horaCaminata || "16:00",
    hora_encuentro_club: input.horaEncuentro || "16:20",
    actividad_cierre:
      input.actividad || "Torneo de Truco, Canasta y Bingo Recreativo",
    monto_reintegro_asistencia: Number(input.montoReintegro) || 0,
    plus_reintegro_padrino: Number(input.plusPadrino) || 0,
    estado: "programada",
    motivo_suspension: null,
    updated_at: new Date().toISOString(),
  };

  state.jornadas.unshift(nuevaJornada);
  state.jornada = nuevaJornada;
  state.circuito = targetCircuito;

  // Copiar el padron de adultos mayores activos de este lugar / tutor evitando superposicion horaria
  const idsAdultosEnLugar = new Set<string>();
  if (input.incluirAbuelosDelTutor) {
    const jornadasDelMismoLugar = state.jornadas
      .filter((j) => j.circuito_id === targetCircuito.id && j.id !== nuevaJornada.id)
      .map((j) => j.id);
    if (jornadasDelMismoLugar.length > 0) {
      state.asistencias
        .filter((a) => jornadasDelMismoLugar.includes(a.jornada_id))
        .forEach((a) => idsAdultosEnLugar.add(a.participante_id));
    } else {
      const circuitosDelTutor = state.circuitos
        .filter((c) => (c.poliza_nro || "").includes(input.tutorId || state.tutorActivoId))
        .map((c) => c.id);
      const jornadasTutor = state.jornadas
        .filter((j) => circuitosDelTutor.includes(j.circuito_id) && j.id !== nuevaJornada.id)
        .map((j) => j.id);
      state.asistencias
        .filter((a) => jornadasTutor.includes(a.jornada_id))
        .forEach((a) => idsAdultosEnLugar.add(a.participante_id));
    }
  }

  const adultosParaInscribir = state.participantes.filter(
    (p) =>
      p.rol === "adulto_mayor" &&
      p.estado_alta === "activo" &&
      idsAdultosEnLugar.has(p.id)
  );

  const omitidosPorConflicto: string[] = [];
  for (const ad of adultosParaInscribir) {
    const conflicto = findScheduleConflict(
      ad.id,
      nuevaJornada,
      state.jornadas,
      state.asistencias,
      state.circuitos
    );
    if (conflicto) {
      omitidosPorConflicto.push(`${ad.nombre} (${conflicto.circuito?.nombre_club || "otro evento"})`);
      continue;
    }

    state.asistencias.push({
      id: generateUuid(),
      jornada_id: nuevaJornada.id,
      participante_id: ad.id,
      modalidad_elegida: "sin_respuesta",
      parada_esquina_id: null,
      padrino_asignado_id: ad.padrino_preferido_id || SEED_IDS.padrinoCarlos,
      estado_padrino: "no_aplica",
      acuse_suspension_leido: false,
      presente_validado_en_club: false,
      codigo_canje_farmacia: null,
      updated_at: new Date().toISOString(),
    });
  }

  addLog(
    state,
    targetCircuito.nombre_club,
    "Nuevo Evento Creado",
    `Se programo "${nuevaJornada.actividad_cierre}" (${nuevaJornada.fecha} ${nuevaJornada.hora_inicio_caminata} hs) en ${targetCircuito.nombre_club}.${
      omitidosPorConflicto.length > 0
        ? ` Omitidos por superposicion horaria: ${omitidosPorConflicto.join(", ")}.`
        : ""
    }`,
    omitidosPorConflicto.length > 0 ? "warning" : "success"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function actualizarRutaCircuito(input: {
  circuitoId: string;
  paradasSeguras: ParadaSegura[];
  rutaPolilinea: [number, number][];
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const target = state.circuitos.find((c) => c.id === input.circuitoId);
  if (!target) {
    throw new Error("No se encontro la sede para actualizar la ruta.");
  }

  target.paradas_seguras = input.paradasSeguras;
  target.ruta_polilinea = input.rutaPolilinea;

  if (state.circuito.id === target.id) {
    state.circuito = target;
  }

  addLog(
    state,
    target.nombre_club,
    "Ruta Segura Actualizada",
    `Se actualizo el recorrido por calles (${input.rutaPolilinea.length} puntos) y ${input.paradasSeguras.length} parada(s) segura(s) en ${target.nombre_club}.`,
    "success"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function vincularAbueloExistenteAEvento(input: {
  adultoId: string;
  jornadaId?: string;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventForCoordinator(
    state,
    input.jornadaId
  );

  const adulto = state.participantes.find(
    (p) => p.id === input.adultoId && p.rol === "adulto_mayor"
  );
  if (!adulto) {
    throw new Error("No se encontro el adulto mayor seleccionado.");
  }

  const yaEnEsteEvento = state.asistencias.find(
    (a) => a.jornada_id === targetJornada.id && a.participante_id === adulto.id
  );
  if (yaEnEsteEvento) {
    return state;
  }

  const conflicto = findScheduleConflict(
    adulto.id,
    targetJornada,
    state.jornadas,
    state.asistencias,
    state.circuitos
  );
  if (conflicto) {
    throw new Error(
      `No se puede agendar a ${adulto.nombre} en este horario: ${conflicto.mensaje}`
    );
  }

  adulto.estado_alta = "activo";
  state.asistencias.push({
    id: generateUuid(),
    jornada_id: targetJornada.id,
    participante_id: adulto.id,
    modalidad_elegida: "sin_respuesta",
    parada_esquina_id: null,
    padrino_asignado_id: adulto.padrino_preferido_id || SEED_IDS.padrinoCarlos,
    estado_padrino: "no_aplica",
    acuse_suspension_leido: false,
    presente_validado_en_club: false,
    codigo_canje_farmacia: null,
    updated_at: new Date().toISOString(),
  });

  addLog(
    state,
    targetCircuito.nombre_club,
    "Abuelo Existente Vinculado",
    `Se vinculo a ${adulto.nombre} (DNI ${adulto.dni}) a ${targetCircuito.nombre_club} sin duplicar su padron.`,
    "success"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function suspenderJornadaPorEmergencia(
  motivo?: string,
  jornadaId?: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventForCoordinator(
    state,
    jornadaId
  );
  const mensajePersonalizado =
    (motivo || "").trim() || "Hoy suspendemos la actividad.";

  targetJornada.estado = "suspendida_emergencia";
  targetJornada.motivo_suspension = mensajePersonalizado;
  targetJornada.updated_at = new Date().toISOString();
  syncActiveJornadaIntoArray(state);

  const asistenciasDelEvento = state.asistencias.filter(
    (a) => a.jornada_id === targetJornada.id
  );
  const idsAdultosEvento = new Set(
    asistenciasDelEvento.map((a) => a.participante_id)
  );
  const idsPadrinosEvento = new Set(
    asistenciasDelEvento
      .filter((a) => a.modalidad_elegida === "nivel_1_puerta" && a.padrino_asignado_id)
      .map((a) => a.padrino_asignado_id as string)
  );

  const participantesNotificables = state.participantes.filter(
    (p) =>
      p.estado_alta === "activo" &&
      ((p.rol === "adulto_mayor" && idsAdultosEvento.has(p.id)) ||
        (p.rol === "padrino" && idsPadrinosEvento.has(p.id)))
  );

  for (const part of participantesNotificables) {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === part.id
    );
    if (asis) {
      asis.acuse_suspension_leido = false;
      asis.updated_at = new Date().toISOString();
    }

    const primerNombre = part.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      part,
      `*AVISO DE SUSPENSION — ${targetCircuito.nombre_club}:* Hola ${primerNombre}, te avisamos que se *SUSPENDE* la actividad *"${targetJornada.actividad_cierre}"* del *${targetJornada.fecha}* a las *${targetJornada.hora_inicio_caminata} hs*.\n\n*Mensaje del organizador:* ${mensajePersonalizado}\n\nPor favor toca el boton de abajo para confirmar que leiste este aviso.`,
      {
        esAlertaPrioritaria: true,
        buttons: [
          {
            id: `btn_acuse_suspension:${targetJornada.id}`,
            title: "Entendido, recibido",
            variant: "success",
          },
        ],
      }
    );
  }

  addLog(
    state,
    targetCircuito.nombre_club,
    "Actividad Suspendida y Avisos Enviados",
    `Se suspendio "${targetJornada.actividad_cierre}" (${targetJornada.hora_inicio_caminata} hs): "${mensajePersonalizado}". Notificados: ${participantesNotificables.length}.`,
    "danger"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function reasignarTutorManualCoordinador(
  adultoId: string,
  nuevoPadrinoId?: string,
  jornadaId?: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventForCoordinator(
    state,
    jornadaId
  );
  const adulto = state.participantes.find((p) => p.id === adultoId);
  const asis = state.asistencias.find(
    (a) => a.jornada_id === targetJornada.id && a.participante_id === adultoId
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
      `Confirmado, ${nombreAdulto}. Te asignamos un Tutor Acreditado de reemplazo rumbo a ${targetCircuito.nombre_club}: hoy a las ${targetJornada.hora_inicio_caminata} hs pasa por tu puerta *${padrinoReemplazo.nombre}* (Credencial ${padrinoReemplazo.credencial_nro}). A preparar el equipo de mate.`,
      {
        fichaSeguridad: {
          padrinoNombre: padrinoReemplazo.nombre,
          credencialNro: padrinoReemplazo.credencial_nro || "#108",
          dni: padrinoReemplazo.dni,
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
      targetCircuito.nombre_club,
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
  adultoId: string,
  jornadaId?: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventForCoordinator(
    state,
    jornadaId
  );
  const adulto = state.participantes.find((p) => p.id === adultoId);
  const asis = state.asistencias.find(
    (a) => a.jornada_id === targetJornada.id && a.participante_id === adultoId
  );

  if (adulto && asis) {
    asis.estado_padrino = "sin_padrino_frenado";
    asis.updated_at = new Date().toISOString();

    const nombreAdulto = adulto.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      adulto,
      `*Cuidado Preventivo (${targetCircuito.nombre_club}):* Hola ${nombreAdulto}, hoy tu vecino padrino tuvo un imprevisto de ultimo momento. Por tu seguridad en las veredas, *te pedimos que hoy no salgas sola a la calle*. El coordinador te llamara en unos minutos.`,
      {
        esAlertaPrioritaria: true,
        buttons: [
          {
            id: `btn_acuse_suspension:${targetJornada.id}`,
            title: "Me quedo en casa",
            variant: "success",
          },
        ],
      }
    );

    addLog(
      state,
      targetCircuito.nombre_club,
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
  participanteIds: string[],
  jornadaId?: string,
  presente: boolean = true
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventForCoordinator(
    state,
    jornadaId
  );
  const padrinosBonificadosEnLote = new Set<string>();

  for (const partId of participanteIds) {
    const asis = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === partId
    );
    const adulto = state.participantes.find((p) => p.id === partId);

    if (!asis || !adulto) continue;

    if (!presente) {
      if (!asis.presente_validado_en_club) continue;
      asis.presente_validado_en_club = false;
      asis.updated_at = new Date().toISOString();

      addLog(
        state,
        adulto.nombre,
        "Presencia quitada (Ausente)",
        `Se quito la validacion de asistencia para ${adulto.nombre} en ${targetCircuito.nombre_club}.`,
        "warning"
      );
      continue;
    }

    if (asis.presente_validado_en_club) continue;

    asis.presente_validado_en_club = true;
    asis.updated_at = new Date().toISOString();

    const primerNombre = adulto.nombre.split(" ")[0];
    await appendBotMessage(
      state,
      adulto,
      `Que linda jornada compartimos en ${targetCircuito.nombre_club}, ${primerNombre}. Ya quedo registrada tu asistencia en el encuentro de hoy (${targetJornada.actividad_cierre}). Gracias por participar.`
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
        const nombrePadrino = padrino.nombre.split(" ")[0];
        await appendBotMessage(
          state,
          padrino,
          `*Gracias por tu compromiso barrial, ${nombrePadrino}.* Validamos en ${targetCircuito.nombre_club} tu llegada acompanando a *${adulto.nombre}*.`
        );
      }
    }

    addLog(
      state,
      adulto.nombre,
      "Flujo 5: Llegada Validada",
      `Se registro la asistencia de ${adulto.nombre} en ${targetCircuito.nombre_club}.`,
      "success"
    );
  }

  if (presente) {
    targetJornada.estado = "en_club";
  } else {
    const quedaAlguienValidado = state.asistencias.some(
      (a) => a.jornada_id === targetJornada.id && a.presente_validado_en_club
    );
    if (!quedaAlguienValidado && targetJornada.estado === "en_club") {
      targetJornada.estado = "convocando";
    }
  }
  targetJornada.updated_at = new Date().toISOString();
  syncActiveJornadaIntoArray(state);

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function aprobarAltaDerivacionFamiliar(
  participanteId: string,
  padrinoAsignadoId: string,
  jornadaId?: string
): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventForCoordinator(
    state,
    jornadaId
  );
  const adulto = state.participantes.find((p) => p.id === participanteId);
  const padrino = state.participantes.find((p) => p.id === padrinoAsignadoId);

  if (adulto && padrino) {
    const conflicto = findScheduleConflict(
      adulto.id,
      targetJornada,
      state.jornadas,
      state.asistencias,
      state.circuitos
    );
    if (conflicto) {
      throw new Error(
        `No se puede aprobar para este horario: ${adulto.nombre} ${conflicto.mensaje}`
      );
    }

    adulto.estado_alta = "activo";
    adulto.padrino_preferido_id = padrino.id;

    const existeAsis = state.asistencias.find(
      (a) =>
        a.jornada_id === targetJornada.id && a.participante_id === adulto.id
    );
    if (!existeAsis) {
      state.asistencias.push({
        id: generateUuid(),
        jornada_id: targetJornada.id,
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
      `*Nueva Asignacion de Cercania:* Hola ${nombrePadrino}, se aprobo la incorporacion de tu vecino *${adulto.nombre}* (${adulto.direccion}) en ${targetCircuito.nombre_club}. ¿Podes pasar a buscarlo hoy a las ${targetJornada.hora_inicio_caminata} hs para su primer encuentro?`,
      {
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

    addLog(
      state,
      targetCircuito.nombre_club,
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
  jornadaId?: string;
  nombreAdulto: string;
  edad: number;
  dni: string;
  telefonoAdulto: string;
  direccion: string;
  nombreFamiliar: string;
  vinculo: string;
  telefonoFamiliar: string;
  notas: string;
  avatarUrl?: string;
  aprobarDirecto?: boolean;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const { targetJornada, targetCircuito } = resolveEventForCoordinator(
    state,
    input.jornadaId
  );

  // Evitar duplicar si el adulto mayor ya existe en la base por DNI o WhatsApp
  const existente = findExistingSeniorByDniOrPhone(
    state.participantes,
    input.dni,
    input.telefonoAdulto
  );

  if (existente) {
    const conflicto = findScheduleConflict(
      existente.id,
      targetJornada,
      state.jornadas,
      state.asistencias,
      state.circuitos
    );
    if (conflicto) {
      throw new Error(
        `Superposicion horaria para ${existente.nombre} (DNI ${existente.dni}): ${conflicto.mensaje}`
      );
    }

    if (input.aprobarDirecto) {
      existente.estado_alta = "activo";
    }
    if (input.avatarUrl) {
      existente.avatar_url = input.avatarUrl;
      existente.notas_vulnerabilidad = encodeNotasWithFoto(
        existente.notas_vulnerabilidad || "",
        existente.notas_vulnerabilidad,
        input.avatarUrl
      );
    }

    const yaInscripto = state.asistencias.find(
      (a) => a.jornada_id === targetJornada.id && a.participante_id === existente.id
    );
    if (!yaInscripto) {
      state.asistencias.push({
        id: generateUuid(),
        jornada_id: targetJornada.id,
        participante_id: existente.id,
        modalidad_elegida: "sin_respuesta",
        parada_esquina_id: null,
        padrino_asignado_id:
          existente.padrino_preferido_id || SEED_IDS.padrinoCarlos,
        estado_padrino: "no_aplica",
        acuse_suspension_leido: false,
        presente_validado_en_club: false,
        codigo_canje_farmacia: null,
        updated_at: new Date().toISOString(),
      });
    }

    addLog(
      state,
      targetCircuito.nombre_club,
      "Abuelo Existente Vinculado (Sin Duplicar)",
      `${existente.nombre} ya figuraba en el sistema (DNI ${existente.dni}); se vinculo directamente a ${targetCircuito.nombre_club}.`,
      "success"
    );

    writeState(state);
    await syncToSupabaseIfConfigured(state);
    return state;
  }

  const jitterLat = (Math.random() - 0.5) * 0.0025;
  const jitterLng = (Math.random() - 0.5) * 0.0025;

  const nuevo: Participante = {
    id: generateUuid(),
    nombre: input.nombreAdulto,
    edad: Number(input.edad) || 76,
    dni: input.dni || "09.123.456",
    telefono: ensureUniquePhone(state.participantes, input.telefonoAdulto),
    rol: "adulto_mayor",
    direccion: input.direccion || "Marcial Candioti 3510, Barrio Candioti",
    coords_domicilio: {
      lat: Number((targetCircuito.coords_club.lat - 0.002 + jitterLat).toFixed(5)),
      lng: Number((targetCircuito.coords_club.lng + 0.001 + jitterLng).toFixed(5)),
    },
    nivel_autonomia_habitual: 1,
    padrino_preferido_id: SEED_IDS.padrinoCarlos,
    acreditado_por_club: false,
    credencial_nro: null,
    saldo_reintegro_sancor: 0,
    contacto_familiar_nombre: `${input.nombreFamiliar} (${
      input.vinculo || "Familiar"
    })`,
    contacto_familiar_tel: input.telefonoFamiliar || "+5493425998877",
    notas_vulnerabilidad: encodeNotasWithFoto(
      input.notas ||
        "Inscripto al padron del lugar. Requiere acompanamiento puerta a puerta (Nivel 1).",
      undefined,
      input.avatarUrl
    ),
    avatar_url: input.avatarUrl || null,
    estado_alta: input.aprobarDirecto ? "activo" : "pendiente_aprobacion",
  };

  state.participantes.push(nuevo);

  if (input.aprobarDirecto) {
    state.asistencias.push({
      id: generateUuid(),
      jornada_id: targetJornada.id,
      participante_id: nuevo.id,
      modalidad_elegida: "sin_respuesta",
      parada_esquina_id: null,
      padrino_asignado_id: SEED_IDS.padrinoCarlos,
      estado_padrino: "no_aplica",
      acuse_suspension_leido: false,
      presente_validado_en_club: false,
      codigo_canje_farmacia: null,
      updated_at: new Date().toISOString(),
    });
  }

  addLog(
    state,
    nuevo.contacto_familiar_nombre,
    input.aprobarDirecto ? "Adulto Mayor Sumado al Padron" : "Nueva Solicitud Familiar",
    `Se incorporo a ${nuevo.nombre} (${nuevo.direccion}) en ${targetCircuito.nombre_club}.`,
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
    telefono: ensureUniquePhone(state.participantes, input.telefono),
    rol: "padrino",
    direccion: input.direccion,
    coords_domicilio: {
      lat: Number((state.circuito.coords_club.lat - 0.0025).toFixed(5)),
      lng: Number((state.circuito.coords_club.lng + 0.0015).toFixed(5)),
    },
    nivel_autonomia_habitual: 3,
    padrino_preferido_id: null,
    acreditado_por_club: true,
    credencial_nro: nuevaCredencial,
    saldo_reintegro_sancor: 2500,
    contacto_familiar_nombre: `Acreditacion ${state.circuito.nombre_club}`,
    contacto_familiar_tel: "+5493424551234",
    notas_vulnerabilidad:
      "Vecino acreditado presencialmente verificando DNI y domicilio barrial.",
    estado_alta: "activo",
  };

  state.participantes.push(nuevoPadrino);

  addLog(
    state,
    state.circuito.nombre_club,
    "Nuevo Vecino Padrino Acreditado",
    `Se valido DNI ${nuevoPadrino.dni} de ${nuevoPadrino.nombre} con Credencial ${nuevaCredencial}.`,
    "success"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function actualizarParticipanteAdulto(input: {
  participanteId: string;
  jornadaId?: string;
  nombre: string;
  edad: number;
  dni: string;
  telefono: string;
  direccion: string;
  coordsDomicilio?: Coords;
  padrinoPreferidoId?: string | null;
  contactoFamiliarNombre?: string;
  contactoFamiliarTel?: string;
  notasVulnerabilidad?: string;
  avatarUrl?: string | null;
  modalidadElegida?: ModalidadElegida;
  paradaEsquinaId?: string | null;
}): Promise<{
  ok: boolean;
  snapshot?: SystemSnapshot;
  error?: string;
  status?: number;
}> {
  const state = await readStateAsync();
  const adulto = state.participantes.find(
    (p) => p.id === input.participanteId && p.rol === "adulto_mayor"
  );

  if (!adulto) {
    return {
      ok: false,
      status: 404,
      error: "No se encontro el adulto mayor seleccionado.",
    };
  }

  const nombreClean = (input.nombre || "").trim();
  const dniClean = (input.dni || "").trim();
  const telClean = (input.telefono || "").trim();
  const dirClean = (input.direccion || "").trim();

  if (!nombreClean || !telClean || !dirClean) {
    return {
      ok: false,
      status: 400,
      error: "Nombre, telefono WhatsApp y domicilio son obligatorios.",
    };
  }

  const dniNorm = normalizeDni(dniClean);
  const duplicado = state.participantes.find((p) => {
    if (p.id === adulto.id) return false;
    if (dniNorm && normalizeDni(p.dni) === dniNorm) return true;
    return phonesMatch(p.telefono, telClean);
  });

  if (duplicado) {
    return {
      ok: false,
      status: 409,
      error: `El DNI o telefono ya pertenece a ${duplicado.nombre}.`,
    };
  }

  adulto.nombre = nombreClean;
  adulto.edad = Number(input.edad) > 0 ? Number(input.edad) : adulto.edad;
  adulto.dni = dniClean || adulto.dni;
  adulto.telefono = telClean;
  adulto.direccion = dirClean;
  if (
    input.coordsDomicilio &&
    Number.isFinite(input.coordsDomicilio.lat) &&
    Number.isFinite(input.coordsDomicilio.lng)
  ) {
    adulto.coords_domicilio = input.coordsDomicilio;
  }
  if (input.padrinoPreferidoId !== undefined) {
    adulto.padrino_preferido_id = input.padrinoPreferidoId || null;
  }
  if (input.contactoFamiliarNombre !== undefined) {
    adulto.contacto_familiar_nombre =
      input.contactoFamiliarNombre.trim() || adulto.contacto_familiar_nombre;
  }
  if (input.contactoFamiliarTel !== undefined) {
    adulto.contacto_familiar_tel =
      input.contactoFamiliarTel.trim() || adulto.contacto_familiar_tel;
  }
  if (input.notasVulnerabilidad !== undefined || input.avatarUrl !== undefined) {
    adulto.notas_vulnerabilidad = encodeNotasWithFoto(
      input.notasVulnerabilidad !== undefined
        ? input.notasVulnerabilidad.trim()
        : adulto.notas_vulnerabilidad || "",
      adulto.notas_vulnerabilidad,
      input.avatarUrl
    );
    if (input.avatarUrl !== undefined) {
      adulto.avatar_url = input.avatarUrl || null;
    }
  }

  if (input.modalidadElegida === "nivel_1_puerta") {
    adulto.nivel_autonomia_habitual = 1;
  } else if (input.modalidadElegida === "nivel_2_esquina") {
    adulto.nivel_autonomia_habitual = 2;
  } else if (input.modalidadElegida === "nivel_3_directo") {
    adulto.nivel_autonomia_habitual = 3;
  }

  if (input.jornadaId) {
    const asis: Asistencia | undefined = state.asistencias.find(
      (a) =>
        a.jornada_id === input.jornadaId && a.participante_id === adulto.id
    );
    if (asis) {
      if (input.modalidadElegida) {
        asis.modalidad_elegida = input.modalidadElegida;
      }
      if (asis.modalidad_elegida === "nivel_1_puerta") {
        asis.parada_esquina_id = null;
        asis.padrino_asignado_id =
          input.padrinoPreferidoId ||
          adulto.padrino_preferido_id ||
          SEED_IDS.padrinoCarlos;
        if (
          asis.estado_padrino === "no_aplica" ||
          asis.estado_padrino === "rechazado_buscando_reemplazo"
        ) {
          asis.estado_padrino = "confirmado";
        }
      } else if (asis.modalidad_elegida === "nivel_2_esquina") {
        asis.parada_esquina_id =
          input.paradaEsquinaId || asis.parada_esquina_id || null;
        asis.padrino_asignado_id = null;
        asis.estado_padrino = "no_aplica";
      } else {
        asis.parada_esquina_id = null;
        asis.padrino_asignado_id = null;
        asis.estado_padrino = "no_aplica";
      }
      asis.updated_at = new Date().toISOString();
    }
  }

  addLog(
    state,
    adulto.nombre,
    "Ficha de Adulto Mayor Editada",
    `Se actualizaron los datos de ${adulto.nombre} (Tel: ${adulto.telefono}, ${adulto.direccion}).`,
    "info"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return { ok: true, snapshot: state };
}

export async function editarEventoOLugar(input: {
  jornadaId: string;
  nombreClub: string;
  direccionClub: string;
  coordsClub?: Coords | null;
  barrioClub?: string;
  actividad: string;
  fecha: string;
  horaCaminata: string;
  horaEncuentro: string;
  coordinadoresIds?: string[];
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const targetJornada = state.jornadas.find((j) => j.id === input.jornadaId);
  if (!targetJornada) {
    throw new Error("No se encontro el evento para editar.");
  }
  const targetCircuito = state.circuitos.find(
    (c) => c.id === targetJornada.circuito_id
  );
  if (!targetCircuito) {
    throw new Error("No se encontro la sede asociada al evento.");
  }

  if (input.nombreClub && input.nombreClub.trim()) {
    targetCircuito.nombre_club = input.nombreClub.trim();
  }
  if (input.direccionClub && input.direccionClub.trim()) {
    targetCircuito.direccion_club = input.direccionClub.trim();
  }
  if (input.barrioClub && input.barrioClub.trim()) {
    targetCircuito.nombre_barrio = input.barrioClub.trim();
  }
  if (
    input.coordsClub &&
    Number.isFinite(input.coordsClub.lat) &&
    Number.isFinite(input.coordsClub.lng)
  ) {
    const prevLat = targetCircuito.coords_club.lat;
    const prevLng = targetCircuito.coords_club.lng;
    const nextLat = Number(input.coordsClub.lat.toFixed(6));
    const nextLng = Number(input.coordsClub.lng.toFixed(6));
    const moved =
      Math.abs(prevLat - nextLat) > 0.0001 || Math.abs(prevLng - nextLng) > 0.0001;
    targetCircuito.coords_club = { lat: nextLat, lng: nextLng };

    if (moved) {
      const p1 = {
        lat: Number((nextLat + 0.0022).toFixed(6)),
        lng: Number((nextLng - 0.002).toFixed(6)),
      };
      const p2 = {
        lat: Number((nextLat + 0.0011).toFixed(6)),
        lng: Number((nextLng - 0.0009).toFixed(6)),
      };
      if (targetCircuito.paradas_seguras[0]) {
        targetCircuito.paradas_seguras[0].lat = p1.lat;
        targetCircuito.paradas_seguras[0].lng = p1.lng;
      }
      if (targetCircuito.paradas_seguras[1]) {
        targetCircuito.paradas_seguras[1].lat = p2.lat;
        targetCircuito.paradas_seguras[1].lng = p2.lng;
      }
      try {
        const waypoints: [number, number][] = [
          ...targetCircuito.paradas_seguras.map(
            (ps) => [ps.lat, ps.lng] as [number, number]
          ),
          [nextLat, nextLng],
        ];
        if (waypoints.length >= 2) {
          const streetRes = await fetchStreetWalkingRoute(waypoints);
          targetCircuito.ruta_polilinea = streetRes.coords;
        }
      } catch {
        // Keep previous route if street routing fails
      }
    }
  }
  if (input.coordinadoresIds && input.coordinadoresIds.length > 0) {
    targetCircuito.poliza_nro = formatPolizaWithTutores(
      targetCircuito.poliza_nro,
      input.coordinadoresIds
    );
  }

  if (input.actividad && input.actividad.trim()) {
    targetJornada.actividad_cierre = input.actividad.trim();
  }
  if (input.fecha && input.fecha.trim()) {
    targetJornada.fecha = input.fecha.trim();
  }
  if (input.horaCaminata && input.horaCaminata.trim()) {
    targetJornada.hora_inicio_caminata = input.horaCaminata.trim();
  }
  if (input.horaEncuentro && input.horaEncuentro.trim()) {
    targetJornada.hora_encuentro_club = input.horaEncuentro.trim();
  }
  targetJornada.updated_at = new Date().toISOString();

  if (state.jornada.id === targetJornada.id) {
    state.jornada = targetJornada;
  }
  if (state.circuito.id === targetCircuito.id) {
    state.circuito = targetCircuito;
  }

  addLog(
    state,
    targetCircuito.nombre_club,
    "Evento / Sede Editado",
    `Se actualizo "${targetJornada.actividad_cierre}" (${targetJornada.fecha} ${targetJornada.hora_inicio_caminata} hs) en ${targetCircuito.nombre_club}.`,
    "info"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}

export async function pasarAbueloEntreEventos(input: {
  adultoId: string;
  fromJornadaId: string;
  toJornadaId: string;
  quitarDeOrigen?: boolean;
}): Promise<SystemSnapshot> {
  const state = await readStateAsync();
  const adulto = state.participantes.find((p) => p.id === input.adultoId);
  const toJornada = state.jornadas.find((j) => j.id === input.toJornadaId);
  if (!adulto || !toJornada) {
    throw new Error("No se encontro el participante o el evento destino.");
  }

  const toCircuito =
    state.circuitos.find((c) => c.id === toJornada.circuito_id) || state.circuito;

  if (input.quitarDeOrigen && input.fromJornadaId && input.fromJornadaId !== input.toJornadaId) {
    state.asistencias = state.asistencias.filter(
      (a) => !(a.jornada_id === input.fromJornadaId && a.participante_id === adulto.id)
    );
  }

  const yaEnDestino = state.asistencias.find(
    (a) => a.jornada_id === toJornada.id && a.participante_id === adulto.id
  );
  if (!yaEnDestino) {
    state.asistencias.push({
      id: generateUuid(),
      jornada_id: toJornada.id,
      participante_id: adulto.id,
      modalidad_elegida: "sin_respuesta",
      parada_esquina_id: null,
      padrino_asignado_id: adulto.padrino_preferido_id || SEED_IDS.padrinoCarlos,
      estado_padrino: "no_aplica",
      acuse_suspension_leido: false,
      presente_validado_en_club: false,
      codigo_canje_farmacia: null,
      updated_at: new Date().toISOString(),
    });
  }

  addLog(
    state,
    adulto.nombre,
    input.quitarDeOrigen ? "Abuelo Pasado de Evento" : "Abuelo Sumado a Evento",
    `${adulto.nombre} fue ${
      input.quitarDeOrigen ? "trasladado" : "vinculado"
    } al evento de ${toCircuito.nombre_club} (${toJornada.actividad_cierre}).`,
    "success"
  );

  writeState(state);
  await syncToSupabaseIfConfigured(state);
  return state;
}
