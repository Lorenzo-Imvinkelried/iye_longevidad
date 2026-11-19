import {
  Asistencia,
  CircuitoBarrial,
  Jornada,
  Participante,
  SEED_IDS,
  SystemSnapshot,
} from "@/types/domain";

export function normalizeDni(dni: string): string {
  return (dni || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
}

export function phonesMatch(phoneA: string, phoneB: string): boolean {
  const normA = (phoneA || "").replace(/[^0-9]/g, "").replace(/^549?/, "");
  const normB = (phoneB || "").replace(/[^0-9]/g, "").replace(/^549?/, "");
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  return (
    normA.slice(0, 3) === normB.slice(0, 3) &&
    normA.slice(-6) === normB.slice(-6)
  );
}

export function extractAvatarFromNotas(notas?: string | null): string | undefined {
  if (!notas) return undefined;
  const match = notas.match(/\|foto:([^\s|]+)/i);
  return match?.[1] ? match[1].trim() : undefined;
}

export function cleanNotas(notas?: string | null): string {
  if (!notas) return "";
  return notas
    .replace(/\s*\|pin:[a-f0-9]+/gi, "")
    .replace(/\s*\|foto:[^\s|]+/gi, "")
    .trim();
}

export function encodeNotasWithFoto(
  visibleNotas: string,
  existingRawNotas?: string | null,
  newAvatarUrl?: string | null
): string {
  const base = cleanNotas(visibleNotas);
  const pinMatch = (existingRawNotas || "").match(/\|pin:([a-f0-9]+)/i);
  const existingFoto = extractAvatarFromNotas(existingRawNotas);
  const finalFoto =
    newAvatarUrl !== undefined
      ? (newAvatarUrl || "").trim() || undefined
      : existingFoto;

  let out = base;
  if (pinMatch?.[1]) {
    out = `${out} |pin:${pinMatch[1]}`.trim();
  }
  if (finalFoto) {
    out = `${out} |foto:${finalFoto}`.trim();
  }
  return out;
}

export function getParticipanteAvatarUrl(
  p?: Partial<Pick<Participante, "id" | "nombre" | "rol" | "avatar_url" | "notas_vulnerabilidad">> | null,
  idx: number = 0
): string {
  if (!p) return "/participantes/rosa.jpg";
  if (p.avatar_url && p.avatar_url.trim()) return p.avatar_url.trim();
  const fromNotas = extractAvatarFromNotas(p.notas_vulnerabilidad);
  if (fromNotas) return fromNotas;

  const id = p.id || "";
  const n = (p.nombre || "").toLowerCase();

  if (id === SEED_IDS.coordinadoraMarta || n.includes("marta")) {
    return "/coordinadores/marta.jpg";
  }
  if (id === SEED_IDS.tutorRoberto || n.includes("roberto")) {
    return "/coordinadores/roberto.jpg";
  }
  if (id === SEED_IDS.coordinadoraLaura || n.includes("laura")) {
    return "/coordinadores/coord-f-2.jpg";
  }
  if (id === SEED_IDS.rosa || n.includes("rosa")) {
    return "/participantes/rosa.jpg";
  }
  if (id === SEED_IDS.nelida || n.includes("nelida") || n.includes("nélida")) {
    return "/participantes/nelida.jpg";
  }
  if (id === SEED_IDS.jorge || n.includes("jorge")) {
    return "/participantes/jorge.jpg";
  }
  if (id === SEED_IDS.hilda || n.includes("hilda")) {
    return "/participantes/hilda.jpg";
  }
  if (id === SEED_IDS.oscar || n.includes("oscar") || n.includes("cacho")) {
    return "/participantes/oscar.jpg";
  }
  if (id === SEED_IDS.ernestoPendiente || n.includes("ernesto") || n.includes("tito")) {
    return "/participantes/ernesto.jpg";
  }
  if (id === SEED_IDS.padrinoCarlos || n.includes("carlos")) {
    return "/participantes/carlos.jpg";
  }
  if (id === SEED_IDS.padrinoHector || n.includes("hector") || n.includes("héctor")) {
    return "/participantes/hector.jpg";
  }

  const isFemale =
    /\b(dra\.|lic\.|maria|ana|laura|carla|sofia|lucia|elena|rosa|nelida|hilda|elsa|claudia|valeria|paula|florencia|camila|agustina|julieta|norma|gladys|mirta|susana|graciela|beatriz|ester)\b/i.test(
      n
    ) || n.split(" ")[0]?.endsWith("a");

  if (p.rol === "coordinador") {
    const fPool = [
      "/coordinadores/coord-f-2.jpg",
      "/coordinadores/coord-f-3.jpg",
      "/coordinadores/marta.jpg",
    ];
    const mPool = ["/coordinadores/coord-m-2.jpg", "/coordinadores/roberto.jpg"];
    const pool = isFemale ? fPool : mPool;
    return pool[idx % pool.length];
  }

  const seniorFemalePool = [
    "/participantes/rosa.jpg",
    "/participantes/nelida.jpg",
    "/participantes/hilda.jpg",
  ];
  const seniorMalePool = [
    "/participantes/oscar.jpg",
    "/participantes/jorge.jpg",
    "/participantes/ernesto.jpg",
    "/participantes/carlos.jpg",
  ];
  const pool = isFemale ? seniorFemalePool : seniorMalePool;
  return pool[idx % pool.length];
}

export function getCircuitoTutoresIds(circuito: CircuitoBarrial): string[] {
  const pol = circuito.poliza_nro || "";
  const matches = Array.from(pol.matchAll(/tutor:([^\s|]+)/gi)).map((m) => m[1]);
  if (matches.length === 0) {
    return [SEED_IDS.coordinadoraMarta];
  }
  return Array.from(new Set(matches));
}

export function formatPolizaWithTutores(
  existingPoliza: string | undefined,
  tutorIds: string[]
): string {
  const cleanBase =
    (existingPoliza || "")
      .replace(/\|?tutor:[^\s|]+/gi, "")
      .replace(/\|+/g, "")
      .trim() || `SANCOR-RC-${Math.floor(10000 + Math.random() * 89999)}`;
  const uniqueIds = Array.from(new Set(tutorIds.filter(Boolean)));
  if (uniqueIds.length === 0) return cleanBase;
  return `${cleanBase}|${uniqueIds.map((id) => `tutor:${id}`).join("|")}`;
}

export function parseTimeToMinutes(hora: string): number | null {
  const match = (hora || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
}

export interface ScheduleConflict {
  jornada: Jornada;
  circuito?: CircuitoBarrial;
  mensaje: string;
}

/**
 * Detecta si un adulto mayor ya esta inscripto (sin cancelar) en otro evento
 * en la misma fecha y dentro de una franja de +-120 minutos.
 */
export function findScheduleConflict(
  participanteId: string,
  targetJornada: Pick<Jornada, "id" | "fecha" | "hora_inicio_caminata">,
  allJornadas: Jornada[],
  allAsistencias: Asistencia[],
  allCircuitos: CircuitoBarrial[]
): ScheduleConflict | null {
  const targetMins = parseTimeToMinutes(targetJornada.hora_inicio_caminata);
  const targetFecha = (targetJornada.fecha || "").trim();

  for (const asis of allAsistencias) {
    if (asis.participante_id !== participanteId) continue;
    if (asis.jornada_id === targetJornada.id) continue;
    if (asis.modalidad_elegida === "no_asiste") continue;

    const otherJornada = allJornadas.find((j) => j.id === asis.jornada_id);
    if (!otherJornada) continue;
    if ((otherJornada.fecha || "").trim() !== targetFecha) continue;

    const otherMins = parseTimeToMinutes(otherJornada.hora_inicio_caminata);
    if (targetMins !== null && otherMins !== null) {
      if (Math.abs(targetMins - otherMins) >= 120) {
        continue;
      }
    }

    const otherCircuito = allCircuitos.find(
      (c) => c.id === otherJornada.circuito_id
    );
    const nombreLugar = otherCircuito?.nombre_club || "otro evento";
    return {
      jornada: otherJornada,
      circuito: otherCircuito,
      mensaje: `Ya esta agendado el ${targetFecha} a las ${otherJornada.hora_inicio_caminata} hs en ${nombreLugar}.`,
    };
  }

  return null;
}

export function getTutorCircuitos(
  circuitos: CircuitoBarrial[],
  tutorId?: string | null
): CircuitoBarrial[] {
  if (!tutorId) return circuitos;
  return circuitos.filter((c) => {
    const tutoresIds = getCircuitoTutoresIds(c);
    return tutoresIds.includes(tutorId);
  });
}

export function getTutorJornadas(
  jornadas: Jornada[],
  circuitos: CircuitoBarrial[],
  tutorId?: string | null
): Jornada[] {
  const sedesTutor = getTutorCircuitos(circuitos, tutorId);
  const sedesIds = new Set(sedesTutor.map((c) => c.id));
  return jornadas.filter((j) => sedesIds.has(j.circuito_id));
}

export function findExistingSeniorByDniOrPhone(
  participantes: Participante[],
  dni: string,
  telefono: string
): Participante | undefined {
  const normDni = normalizeDni(dni);
  return participantes.find((p) => {
    if (p.rol !== "adulto_mayor") return false;
    if (normDni && normalizeDni(p.dni) === normDni) return true;
    if (telefono && phonesMatch(p.telefono, telefono)) return true;
    return false;
  });
}

/**
 * Proyecta un snapshot para que cada tutor conectado vea y opere sus propios
 * lugares y eventos sin pisar la vista de otros tutores concurrentes.
 */
export function projectSnapshotForTutor(
  snapshot: SystemSnapshot,
  tutorId?: string | null,
  preferredJornadaId?: string | null
): SystemSnapshot {
  const allCircuitos = snapshot.circuitos || [snapshot.circuito];
  const allJornadas = snapshot.jornadas || [snapshot.jornada];

  const tutorCircuitos = tutorId
    ? getTutorCircuitos(allCircuitos, tutorId)
    : allCircuitos;
  const tutorJornadas = tutorId
    ? getTutorJornadas(allJornadas, allCircuitos, tutorId)
    : allJornadas;

  const activeJornada =
    (preferredJornadaId &&
      tutorJornadas.find((j) => j.id === preferredJornadaId)) ||
    tutorJornadas.find((j) => j.id === snapshot.jornada.id) ||
    tutorJornadas[0] ||
    snapshot.jornada;

  const activeCircuito =
    tutorCircuitos.find((c) => c.id === activeJornada.circuito_id) ||
    allCircuitos.find((c) => c.id === activeJornada.circuito_id) ||
    tutorCircuitos[0] ||
    snapshot.circuito;

  return {
    ...snapshot,
    tutorActivoId: tutorId || snapshot.tutorActivoId,
    circuito: activeCircuito,
    jornada: activeJornada,
  };
}

export function sanitizeSnapshotForClient(
  snapshot: SystemSnapshot
): SystemSnapshot {
  return {
    ...snapshot,
    participantes: snapshot.participantes.map((p, idx) => ({
      ...p,
      avatar_url: getParticipanteAvatarUrl(p, idx),
      notas_vulnerabilidad: cleanNotas(p.notas_vulnerabilidad),
    })),
  };
}

export interface ParsedMapsLocation {
  lat: number;
  lng: number;
  placeName?: string;
}

/**
 * Extrae latitud, longitud y opcionalmente nombre del lugar desde una URL de Google Maps
 * o desde coordenadas directas ("-31.6388, -60.6915").
 */
export function parseGoogleMapsLocationInput(
  rawInput: string
): ParsedMapsLocation | null {
  const input = (rawInput || "").trim();
  if (!input) return null;

  let placeName: string | undefined;
  const placeMatch = input.match(/\/place\/([^/@]+)/i);
  if (placeMatch && placeMatch[1]) {
    try {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
    } catch {
      placeName = placeMatch[1].replace(/\+/g, " ").trim();
    }
  }

  // Prioridad 1: !3dLAT!4dLNG (pin exacto del lugar en Google Maps)
  const bangMatch = input.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    const lat = Number(bangMatch[1]);
    const lng = Number(bangMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, placeName };
    }
  }

  // Prioridad 2: @LAT,LNG en URL de Google Maps
  const atMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, placeName };
    }
  }

  // Prioridad 3: ?q=LAT,LNG / ll=LAT,LNG / coordenadas crudas "LAT, LNG"
  const coordMatch = input.match(/(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lng = Number(coordMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, placeName };
    }
  }

  return null;
}
