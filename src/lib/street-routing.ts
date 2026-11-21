import { Coords, ParadaSegura, Participante } from "@/types/domain";
import { getDistanceMeters, MAX_WALKING_DISTANCE_METERS } from "@/lib/domain-helpers";

export const ROUTE_BRANCH_BREAK: [number, number] = [0, 0];

export const RAMAL_STYLES: Record<
  string,
  { stroke: string; halo: string; badge: string; label: string }
> = {
  A: {
    stroke: "#a70355",
    halo: "#e1a9c5",
    badge: "#a70355",
    label: "Ramal A",
  },
  B: {
    stroke: "#1d4ed8",
    halo: "#93c5fd",
    badge: "#1d4ed8",
    label: "Ramal B",
  },
  C: {
    stroke: "#0f766e",
    halo: "#99f6e4",
    badge: "#0f766e",
    label: "Ramal C",
  },
};

export function getRamalStyle(ramal?: string) {
  const key = (ramal || "A").toUpperCase();
  return RAMAL_STYLES[key] || RAMAL_STYLES.A;
}

export function isBranchBreakPoint(pt: [number, number]): boolean {
  return Math.abs(pt[0]) < 0.001 && Math.abs(pt[1]) < 0.001;
}

/**
 * Codifica multiples polilineas de ramales independientes en un unico array `[lat, lng][]`
 * usando `[0, 0]` como separador (100% compatible con circuitos legacy de 1 solo ramal).
 */
export function encodeMultiBranchPolylines(
  branches: Array<[number, number][]>
): [number, number][] {
  const valid = branches.filter((b) => b.length >= 2);
  if (valid.length === 0) return [];
  if (valid.length === 1) return valid[0];
  const combined: [number, number][] = [];
  valid.forEach((branch, idx) => {
    if (idx > 0) combined.push(ROUTE_BRANCH_BREAK);
    combined.push(...branch);
  });
  return combined;
}

/**
 * Decodifica una polilinea combinada (o legacy simple) en un array de polilineas por ramal.
 */
export function decodeMultiBranchPolylines(
  raw?: [number, number][]
): Array<[number, number][]> {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const branches: Array<[number, number][]> = [];
  let current: [number, number][] = [];
  for (const pt of raw) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    if (isBranchBreakPoint(pt)) {
      if (current.length >= 2) branches.push(current);
      current = [];
    } else {
      current.push(pt);
    }
  }
  if (current.length >= 2) branches.push(current);
  return branches;
}

/**
 * Devuelve la etiqueta corta de cada parada (ej: "A1", "A2", "B1", "B2") cuando hay
 * ramales explicitos, o "Parada 1" para circuitos legacy de ramal unico.
 */
export function getParadaShortCode(
  parada: Pick<ParadaSegura, "ramal">,
  allParadas: Array<Pick<ParadaSegura, "ramal">>,
  indexInAll: number
): string {
  const hasExplicitRamales = allParadas.some((p) => Boolean(p.ramal));
  if (!hasExplicitRamales) {
    return `Parada ${indexInAll + 1}`;
  }
  const r = (parada.ramal || "A").toUpperCase();
  const ordinalInRamal =
    allParadas
      .slice(0, indexInAll + 1)
      .filter((p) => (p.ramal || "A").toUpperCase() === r).length;
  return `${r}${ordinalInRamal}`;
}

/**
 * Devuelve la lista ordenada de ramales presentes en una secuencia de nodos/paradas.
 */
export function getOrderedRamales(
  items: Array<{ ramal?: string }>
): string[] {
  const seen: string[] = [];
  for (const it of items) {
    const r = (it.ramal || "A").toUpperCase();
    if (!seen.includes(r)) seen.push(r);
  }
  return seen.length > 0 ? seen : ["A"];
}

export const CANDIOTI_STREET_ROUTE: [number, number][] = [
  [-31.634199, -60.687807],
  [-31.634893, -60.688005],
  [-31.635803, -60.688277],
  [-31.636713, -60.688538],
  [-31.636712, -60.688541],
  [-31.636499, -60.689613],
  [-31.636256, -60.690667],
  [-31.636032, -60.691725],
  [-31.636928, -60.69199],
  [-31.636758, -60.69284],
  [-31.636928, -60.69199],
  [-31.637861, -60.692252],
  [-31.637931, -60.692273],
  [-31.638157, -60.691215],
  [-31.638231, -60.691229],
  [-31.63882, -60.691411],
];

export const GUADALUPE_STREET_ROUTE: [number, number][] = [
  [-31.604616, -60.676859],
  [-31.604665, -60.676762],
  [-31.604747, -60.67658],
  [-31.604156, -60.676388],
  [-31.602749, -60.675931],
  [-31.602999, -60.675021],
  [-31.603095, -60.674879],
  [-31.603147, -60.674746],
  [-31.603233, -60.674324],
  [-31.602315, -60.674117],
  [-31.602355, -60.673918],
  [-31.602385, -60.673768],
  [-31.602536, -60.67302],
  [-31.601635, -60.672772],
  [-31.601512, -60.672738],
];

export const CENTRO_STREET_ROUTE: [number, number][] = [
  [-31.644702, -60.704919],
  [-31.644634, -60.705267],
  [-31.645261, -60.705448],
  [-31.645378, -60.705481],
  [-31.64574, -60.705586],
  [-31.645833, -60.705613],
  [-31.647, -60.705928],
  [-31.646921, -60.706242],
  [-31.646818, -60.706655],
  [-31.647996, -60.706963],
  [-31.648552, -60.707165],
  [-31.649138, -60.707377],
  [-31.649525, -60.707504],
  [-31.649616, -60.707534],
  [-31.649703, -60.707562],
  [-31.650288, -60.707754],
  [-31.651415, -60.708065],
  [-31.651324, -60.708533],
];

export const PARQUE_FEDERAL_STREET_ROUTE: [number, number][] = [
  [-31.618665, -60.687048],
  [-31.618521, -60.687726],
  [-31.619424, -60.687992],
  [-31.62013, -60.688201],
  [-31.620064, -60.688566],
  [-31.619931, -60.689306],
  [-31.621005, -60.689624],
  [-31.620788, -60.690685],
  [-31.621683, -60.690961],
  [-31.62147, -60.692021],
  [-31.622369, -60.692285],
  [-31.622147, -60.693296],
  [-31.623058, -60.693564],
  [-31.623902, -60.693811],
  [-31.623963, -60.693829],
  [-31.62418, -60.693893],
  [-31.623963, -60.693829],
  [-31.623902, -60.693811],
  [-31.623058, -60.693564],
  [-31.623278, -60.692548],
  [-31.623515, -60.691481],
  [-31.622614, -60.691218],
  [-31.622503, -60.691187],
];

/**
 * Calcula un recorrido peatonal real siguiendo calles y veredas entre los puntos indicados
 * usando el router peatonal de OpenStreetMap (y fallback a OSRM publico o linea directa).
 */
export async function fetchStreetWalkingRoute(
  waypoints: [number, number][]
): Promise<{
  coords: [number, number][];
  usedStreetRouter: boolean;
  distanceMeters?: number;
}> {
  if (waypoints.length < 2) {
    return { coords: waypoints, usedStreetRouter: false };
  }

  const coordsParam = waypoints
    .map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
    .join(";");

  const endpoints = [
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coordsParam}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/foot/${coordsParam}?overview=full&geometries=geojson`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const json = await res.json();
      const rawCoords = json?.routes?.[0]?.geometry?.coordinates as
        | [number, number][]
        | undefined;
      if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
        const converted: [number, number][] = rawCoords.map(([lng, lat]) => [
          Number(lat.toFixed(6)),
          Number(lng.toFixed(6)),
        ]);
        return {
          coords: converted,
          usedStreetRouter: true,
          distanceMeters: Math.round(Number(json.routes[0].distance || 0)),
        };
      }
    } catch {
      // Try fallback router
    }
  }

  return { coords: waypoints, usedStreetRouter: false };
}

export function getWaypointsFromParadasAndClub(
  paradas: ParadaSegura[],
  coordsClub: Coords
): [number, number][] {
  const pts: [number, number][] = paradas.map((p) => [p.lat, p.lng]);
  pts.push([coordsClub.lat, coordsClub.lng]);
  return pts;
}

/**
 * Calcula en paralelo las rutas peatonales reales por calles para multiples ramales
 * independientes (ej: A1 -> A2 -> Club y B1 -> B2 -> Club).
 */
export async function fetchMultiBranchWalkingRoutes(
  branches: Array<{ ramal: string; waypoints: [number, number][] }>
): Promise<{
  combinedCoords: [number, number][];
  branchPolylines: Record<string, [number, number][]>;
  totalDistanceMeters: number;
  usedStreetRouter: boolean;
}> {
  const validBranches = branches.filter((b) => b.waypoints.length >= 2);
  if (validBranches.length === 0) {
    return {
      combinedCoords: [],
      branchPolylines: {},
      totalDistanceMeters: 0,
      usedStreetRouter: false,
    };
  }

  const results = await Promise.all(
    validBranches.map(async (b) => {
      const res = await fetchStreetWalkingRoute(b.waypoints);
      return { ramal: b.ramal, ...res };
    })
  );

  const branchPolylines: Record<string, [number, number][]> = {};
  const listForEncode: Array<[number, number][]> = [];
  let totalDistanceMeters = 0;
  let usedStreetRouter = false;

  for (const r of results) {
    branchPolylines[r.ramal] = r.coords;
    listForEncode.push(r.coords);
    totalDistanceMeters += r.distanceMeters || 0;
    if (r.usedStreetRouter) usedStreetRouter = true;
  }

  return {
    combinedCoords: encodeMultiBranchPolylines(listForEncode),
    branchPolylines,
    totalDistanceMeters,
    usedStreetRouter,
  };
}

function addMinutesToTimeStr(baseHHMM: string, offsetMinutes: number): string {
  const m = /^(\d{1,2}):(\d{2})/.exec((baseHHMM || "16:00").trim());
  const h = m ? Number(m[1]) : 16;
  const min = m ? Number(m[2]) : 0;
  const total = ((h * 60 + min + offsetMinutes) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm} hs`;
}

function getSectorCardinalName(angleRad: number): string {
  const deg = ((angleRad * 180) / Math.PI + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return "Sector Este";
  if (deg >= 22.5 && deg < 67.5) return "Sector Noreste";
  if (deg >= 67.5 && deg < 112.5) return "Sector Norte";
  if (deg >= 112.5 && deg < 157.5) return "Sector Noroeste";
  if (deg >= 157.5 && deg < 202.5) return "Sector Oeste";
  if (deg >= 202.5 && deg < 247.5) return "Sector Suroeste";
  if (deg >= 247.5 && deg < 292.5) return "Sector Sur";
  return "Sector Sureste";
}

/**
 * Detecta inteligentemente los ramales independientes por sector cardinal (A, B, C)
 * y decide si cada ramal requiere 1 parada o 2 paradas consecutivas (ej. A1 -> A2 -> Club)
 * segun la ubicacion real de los adultos mayores caminables (< 1 km) para que nadie
 * retroceda ni camine de mas.
 */
export function computeSmartBranchStops(
  club: Coords,
  seniors: Participante[],
  horaInicio: string = "16:00"
): ParadaSegura[] {
  const walkable = seniors
    .filter((s) => s.rol === "adulto_mayor" && s.estado_alta === "activo")
    .map((s) => {
      const dist = getDistanceMeters(s.coords_domicilio, club);
      const angle = Math.atan2(
        s.coords_domicilio.lat - club.lat,
        s.coords_domicilio.lng - club.lng
      );
      return { senior: s, dist, angle };
    })
    .filter((item) => item.dist <= MAX_WALKING_DISTANCE_METERS && item.dist >= 140);

  if (walkable.length === 0) {
    return [
      {
        id: "parada_a1",
        ramal: "A",
        nombre_esquina: "A1: Esquina Segura Cercana",
        lat: Number((club.lat + 0.0024).toFixed(6)),
        lng: Number((club.lng + 0.002).toFixed(6)),
        horario_paso: addMinutesToTimeStr(horaInicio, 5),
        estado_veredas: "Punto sugerido inteligentemente por cercania al centro",
        tiene_rampa: true,
        iluminacion_ok: true,
      },
    ];
  }

  // 1. Ordenar por angulo polar alrededor del club y detectar brechas angulares (> 85 deg)
  const sorted = [...walkable].sort((a, b) => a.angle - b.angle);
  const gaps: Array<{ afterIdx: number; gap: number }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const nextIdx = (i + 1) % sorted.length;
    let diff = sorted[nextIdx].angle - sorted[i].angle;
    if (diff < 0) diff += Math.PI * 2;
    gaps.push({ afterIdx: i, gap: diff });
  }

  // Ordenar brechas de mayor a menor para encontrar cortes naturales por sector
  const sortedGaps = [...gaps].sort((a, b) => b.gap - a.gap);
  const MIN_SECTOR_GAP_RAD = (82 * Math.PI) / 180; // ~82 grados separa sectores opuestos/laterales

  let cutIndices: number[] = [];
  if (sorted.length >= 2) {
    // Corte 1 (siempre marca el inicio del arco principal)
    cutIndices.push(sortedGaps[0].afterIdx);
    // Si la segunda brecha tambien es amplia (> 82 deg), separa en 2 ramales (A y B)
    if (sortedGaps.length >= 2 && sortedGaps[1].gap >= MIN_SECTOR_GAP_RAD) {
      cutIndices.push(sortedGaps[1].afterIdx);
    }
    // Si hay >= 4 abuelos y una tercera brecha amplia (> 95 deg), separa en 3 ramales (A, B, C)
    if (
      sorted.length >= 4 &&
      sortedGaps.length >= 3 &&
      sortedGaps[2].gap >= (95 * Math.PI) / 180
    ) {
      cutIndices.push(sortedGaps[2].afterIdx);
    }
  }

  const clusters: Array<typeof sorted> = [];
  if (cutIndices.length <= 1) {
    clusters.push(sorted);
  } else {
    cutIndices = cutIndices.sort((a, b) => a - b);
    for (let c = 0; c < cutIndices.length; c++) {
      const start = (cutIndices[c] + 1) % sorted.length;
      const end = cutIndices[(c + 1) % cutIndices.length];
      const bucket: typeof sorted = [];
      let idx = start;
      while (true) {
        bucket.push(sorted[idx]);
        if (idx === end) break;
        idx = (idx + 1) % sorted.length;
      }
      if (bucket.length > 0) clusters.push(bucket);
    }
  }

  // Ordenar clusters de mayor cantidad de abuelos a menor (y luego por angulo)
  clusters.sort((a, b) => b.length - a.length);

  const ramalLetters = ["A", "B", "C"];
  const resultParadas: ParadaSegura[] = [];

  clusters.slice(0, 3).forEach((cluster, cIdx) => {
    const ramal = ramalLetters[cIdx];

    // Calcular angulo medio del cluster
    const sumSin = cluster.reduce((acc, item) => acc + Math.sin(item.angle), 0);
    const sumCos = cluster.reduce((acc, item) => acc + Math.cos(item.angle), 0);
    const meanAngle = Math.atan2(sumSin, sumCos);
    const sectorName = getSectorCardinalName(meanAngle);

    // Ordenar los abuelos de este sector del mas lejano al mas cercano al club
    const byDistDesc = [...cluster].sort((a, b) => b.dist - a.dist);

    // Evaluar si conviene 1 parada o 2 paradas consecutivas (ej: A1 -> A2 -> Club)
    let needsTwoStops = false;
    if (byDistDesc.length >= 2) {
      const pairDist = getDistanceMeters(
        byDistDesc[0].senior.coords_domicilio,
        byDistDesc[byDistDesc.length - 1].senior.coords_domicilio
      );
      const maxDist = byDistDesc[0].dist;
      needsTwoStops = pairDist >= 260 || maxDist >= 520;
    }

    if (!needsTwoStops) {
      // 1 sola parada optimizada en el centroide del sector, levemente acercada al club (factor 0.72)
      const avgLat =
        cluster.reduce((acc, x) => acc + x.senior.coords_domicilio.lat, 0) /
        cluster.length;
      const avgLng =
        cluster.reduce((acc, x) => acc + x.senior.coords_domicilio.lng, 0) /
        cluster.length;
      const stopLat = club.lat + (avgLat - club.lat) * 0.72;
      const stopLng = club.lng + (avgLng - club.lng) * 0.72;

      resultParadas.push({
        id: `parada_${ramal.toLowerCase()}1`,
        ramal,
        nombre_esquina: `${ramal}1: ${sectorName}`,
        lat: Number(stopLat.toFixed(6)),
        lng: Number(stopLng.toFixed(6)),
        horario_paso: addMinutesToTimeStr(horaInicio, 6),
        estado_veredas: `Parada sugerida para ${cluster.length} ${
          cluster.length === 1 ? "vecino" : "vecinos"
        } (${sectorName})`,
        tiene_rampa: true,
        iluminacion_ok: true,
      });
    } else {
      // 2 paradas consecutivas ordenadas de afuera hacia el club: X1 (exterior) -> X2 (intermedia) -> Club
      const half = Math.ceil(byDistDesc.length / 2);
      const outerGroup = byDistDesc.slice(0, half);
      const innerGroup = byDistDesc.slice(half);

      const outerAvgLat =
        outerGroup.reduce((acc, x) => acc + x.senior.coords_domicilio.lat, 0) /
        outerGroup.length;
      const outerAvgLng =
        outerGroup.reduce((acc, x) => acc + x.senior.coords_domicilio.lng, 0) /
        outerGroup.length;
      // Parada 1 (exterior): ~78% hacia el grupo exterior para no hacerlos retroceder
      const p1Lat = club.lat + (outerAvgLat - club.lat) * 0.78;
      const p1Lng = club.lng + (outerAvgLng - club.lng) * 0.78;

      const innerAvgLat =
        innerGroup.reduce((acc, x) => acc + x.senior.coords_domicilio.lat, 0) /
        innerGroup.length;
      const innerAvgLng =
        innerGroup.reduce((acc, x) => acc + x.senior.coords_domicilio.lng, 0) /
        innerGroup.length;
      // Parada 2 (intermedia): combina posicion del grupo interior con el corredor hacia el club (~46% radial)
      const p2Lat = club.lat + (innerAvgLat - club.lat) * 0.46;
      const p2Lng = club.lng + (innerAvgLng - club.lng) * 0.46;

      resultParadas.push(
        {
          id: `parada_${ramal.toLowerCase()}1`,
          ramal,
          nombre_esquina: `${ramal}1: ${sectorName} (Inicio)`,
          lat: Number(p1Lat.toFixed(6)),
          lng: Number(p1Lng.toFixed(6)),
          horario_paso: addMinutesToTimeStr(horaInicio, 4),
          estado_veredas: `Inicio del Ramal ${ramal} (${sectorName})`,
          tiene_rampa: true,
          iluminacion_ok: true,
        },
        {
          id: `parada_${ramal.toLowerCase()}2`,
          ramal,
          nombre_esquina: `${ramal}2: ${sectorName} (Intermedia)`,
          lat: Number(p2Lat.toFixed(6)),
          lng: Number(p2Lng.toFixed(6)),
          horario_paso: addMinutesToTimeStr(horaInicio, 11),
          estado_veredas: `Parada intermedia Ramal ${ramal} camino al club`,
          tiene_rampa: true,
          iluminacion_ok: true,
        }
      );
    }
  });

  return resultParadas;
}
