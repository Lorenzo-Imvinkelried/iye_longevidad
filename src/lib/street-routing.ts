import { Coords, ParadaSegura } from "@/types/domain";

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
