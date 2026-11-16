"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ParadaSegura, SEED_IDS, SystemSnapshot } from "@/types/domain";
import { getTutorJornadas } from "@/lib/domain-helpers";
import { fetchStreetWalkingRoute } from "@/lib/street-routing";
import { useGlobalLoading } from "@/components/modals/ModalCargando";
import EditorRutaPanel, {
  EditableRouteNode,
} from "@/components/mapa/EditorRutaPanel";
import {
  AlertTriangle,
  ChevronDown,
  MapPin,
  Pencil,
  PhoneCall,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const MapaCircuitoLeaflet = dynamic(
  () => import("@/components/MapaCircuitoLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] sm:h-[360px] lg:h-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
        Cargando mapa del circuito barrial...
      </div>
    ),
  }
);

interface TabMonitorProps {
  snapshot: SystemSnapshot;
  loggedInTutorId: string;
  loadingAction: string | null;
  onExecuteAction: (
    action: string,
    payload?: Record<string, unknown>
  ) => Promise<unknown> | void;
  onSelectEvento: (jornadaId: string) => void;
  onOpenPhone: (participanteId: string) => void;
  onOpenFamiliarModal: () => void;
  onOpenSuspenderModal: () => void;
}

export default function TabMonitorCircuito({
  snapshot,
  loggedInTutorId,
  loadingAction,
  onExecuteAction,
  onSelectEvento,
  onOpenPhone,
  onOpenFamiliarModal,
  onOpenSuspenderModal,
}: TabMonitorProps) {
  const { circuito, jornada, circuitos, jornadas, participantes, asistencias } =
    snapshot;

  const { withLoading } = useGlobalLoading();
  const routeActionRef = useRef<boolean>(false);

  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [listaAbuelosOpen, setListaAbuelosOpen] = useState(false);
  const [clickTool, setClickTool] = useState<"via" | "parada">("via");
  const [draftNodes, setDraftNodes] = useState<EditableRouteNode[]>([]);
  const [draftPolyline, setDraftPolyline] = useState<[number, number][]>([]);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    setIsEditingRoute(false);
    setListaAbuelosOpen(false);
    setDraftNodes([]);
    setDraftPolyline([]);
    setDistanceMeters(undefined);
  }, [circuito.id, jornada.id]);

  const recomputeStreetRoute = async (nodes: EditableRouteNode[]) => {
    const waypoints: [number, number][] = [
      ...nodes.map((n) => [n.lat, n.lng] as [number, number]),
      [circuito.coords_club.lat, circuito.coords_club.lng],
    ];
    if (waypoints.length < 2) {
      setDraftPolyline([]);
      return;
    }
    setRoutingBusy(true);
    try {
      await withLoading(
        "Calculando ruta segura por calles...",
        "Ajustando el recorrido peatonal sobre las calles de Santa Fe...",
        async () => {
          const res = await fetchStreetWalkingRoute(waypoints);
          setDraftPolyline(res.coords);
          setDistanceMeters(res.distanceMeters);
        }
      );
    } finally {
      setRoutingBusy(false);
    }
  };

  const handleStartEditRoute = () => {
    const paradaNodes: EditableRouteNode[] = circuito.paradas_seguras.map(
      (p) => ({
        id: p.id,
        kind: "parada",
        lat: p.lat,
        lng: p.lng,
        nombreEsquina: p.nombre_esquina,
        horarioPaso: p.horario_paso,
      })
    );

    const firstPoly = circuito.ruta_polilinea?.[0];
    const firstParada = paradaNodes[0];
    const initialNodes: EditableRouteNode[] = [];
    if (
      firstPoly &&
      firstParada &&
      (Math.abs(firstPoly[0] - firstParada.lat) > 0.001 ||
        Math.abs(firstPoly[1] - firstParada.lng) > 0.001)
    ) {
      initialNodes.push({
        id: "via_inicio",
        kind: "via",
        lat: firstPoly[0],
        lng: firstPoly[1],
      });
    }
    initialNodes.push(...paradaNodes);

    setDraftNodes(initialNodes);
    setDraftPolyline(circuito.ruta_polilinea || []);
    setIsEditingRoute(true);
    void recomputeStreetRoute(initialNodes);
  };

  const handleMapClickInEdit = async (lat: number, lng: number) => {
    if (routeActionRef.current) return;
    routeActionRef.current = true;
    try {
      const newId =
        clickTool === "parada"
          ? `parada_${Date.now().toString(36)}`
          : `via_${Date.now().toString(36)}`;
      const nextParadaIdx =
        draftNodes.filter((n) => n.kind === "parada").length + 1;

      const newNode: EditableRouteNode =
        clickTool === "parada"
          ? {
              id: newId,
              kind: "parada",
              lat,
              lng,
              nombreEsquina: `Parada ${nextParadaIdx}: Punto en circuito`,
              horarioPaso: `${jornada.hora_inicio_caminata || "16:00"} hs`,
            }
          : {
              id: newId,
              kind: "via",
              lat,
              lng,
            };

      const nextNodes = [...draftNodes, newNode];
      setDraftNodes(nextNodes);

      await Promise.all([
        recomputeStreetRoute(nextNodes),
        clickTool === "parada"
          ? (async () => {
              try {
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
                );
                if (res.ok) {
                  const data = await res.json();
                  const road = data?.address?.road;
                  const num = data?.address?.house_number;
                  if (road) {
                    const label = `Parada ${nextParadaIdx}: ${[road, num]
                      .filter(Boolean)
                      .join(" ")}`;
                    setDraftNodes((prev) =>
                      prev.map((n) =>
                        n.id === newId ? { ...n, nombreEsquina: label } : n
                      )
                    );
                  }
                }
              } catch {
                // Keep fallback name
              }
            })()
          : Promise.resolve(),
      ]);
    } finally {
      routeActionRef.current = false;
    }
  };

  const handleDragNodeInEdit = (nodeId: string, lat: number, lng: number) => {
    const nextNodes = draftNodes.map((n) =>
      n.id === nodeId ? { ...n, lat, lng } : n
    );
    setDraftNodes(nextNodes);
    void recomputeStreetRoute(nextNodes);
  };

  const handleMoveNodeOrder = (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= draftNodes.length) return;
    const copy = [...draftNodes];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setDraftNodes(copy);
    void recomputeStreetRoute(copy);
  };

  const handleRemoveNode = (id: string) => {
    const nextNodes = draftNodes.filter((n) => n.id !== id);
    setDraftNodes(nextNodes);
    void recomputeStreetRoute(nextNodes);
  };

  const handleSaveRoute = async () => {
    if (routeActionRef.current) return;
    routeActionRef.current = true;
    try {
      const existingMap = new Map(
        circuito.paradas_seguras.map((p) => [p.id, p])
      );
      const updatedParadas: ParadaSegura[] = draftNodes
        .filter((n) => n.kind === "parada")
        .map((n, idx) => {
          const prev = existingMap.get(n.id);
          return {
            id: n.id,
            nombre_esquina:
              (n.nombreEsquina || "").trim() || `Parada ${idx + 1}`,
            lat: n.lat,
            lng: n.lng,
            horario_paso:
              (n.horarioPaso || "").trim() ||
              `${jornada.hora_inicio_caminata} hs`,
            estado_veredas:
              prev?.estado_veredas || "Tramo validado en mapa por organizador",
            tiene_rampa: prev?.tiene_rampa ?? true,
            iluminacion_ok: prev?.iluminacion_ok ?? true,
          };
        });

      await onExecuteAction("actualizar_ruta_circuito", {
        circuitoId: circuito.id,
        paradasSeguras: updatedParadas,
        rutaPolilinea: draftPolyline,
      });
      setIsEditingRoute(false);
    } finally {
      routeActionRef.current = false;
    }
  };

  const eventosDelTutor = getTutorJornadas(
    jornadas || [jornada],
    circuitos || [circuito],
    loggedInTutorId
  );
  const listaEventos =
    eventosDelTutor.length > 0 ? eventosDelTutor : [jornada];

  const asistenciasEvento = asistencias.filter(
    (a) => a.jornada_id === jornada.id
  );
  const idsDelEvento = new Set(asistenciasEvento.map((a) => a.participante_id));

  const adultosActivos = participantes.filter(
    (p) =>
      p.rol === "adulto_mayor" &&
      p.estado_alta === "activo" &&
      idsDelEvento.has(p.id)
  );

  const asistenciasNivel1 = asistenciasEvento.filter(
    (a) => a.modalidad_elegida === "nivel_1_puerta"
  );
  const asistenciasNivel2 = asistenciasEvento.filter(
    (a) => a.modalidad_elegida === "nivel_2_esquina"
  );
  const asistenciasNivel3 = asistenciasEvento.filter(
    (a) => a.modalidad_elegida === "nivel_3_directo"
  );
  const alertasPadrinoCaido = asistenciasEvento.filter(
    (a) =>
      a.modalidad_elegida === "nivel_1_puerta" &&
      a.estado_padrino === "rechazado_buscando_reemplazo"
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      {/* Barra de control compacta estilo Sancor con selector de Evento / Lugar */}
      <div className="bg-white rounded-xl px-3 py-1.5 border border-[#eaeced] flex flex-col lg:flex-row lg:items-center justify-between gap-2 shadow-xs shrink-0">
        <div className="flex-1 min-w-0 flex flex-wrap lg:flex-nowrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#f6f6f7] border border-[#eaeced] rounded-lg px-2.5 py-1 min-w-0 w-full sm:w-auto sm:max-w-[300px] xl:max-w-[340px] shrink-0 overflow-hidden">
            <MapPin className="w-3.5 h-3.5 text-[#a70355] shrink-0" />
            <label
              htmlFor="selector-evento-activo"
              className="text-[11px] font-bold text-[#363f48] shrink-0 whitespace-nowrap"
            >
              Evento / Lugar:
            </label>
            <select
              id="selector-evento-activo"
              value={jornada.id}
              onChange={(e) => onSelectEvento(e.target.value)}
              className="flex-1 min-w-0 w-full bg-transparent text-xs font-bold text-[#0a4494] focus:outline-hidden truncate cursor-pointer"
            >
              {listaEventos.map((j) => {
                const c =
                  (circuitos || [circuito]).find((ci) => ci.id === j.circuito_id) ||
                  circuito;
                return (
                  <option key={j.id} value={j.id}>
                    {c.nombre_club} — {j.actividad_cierre} ({j.fecha} {j.hora_inicio_caminata} hs)
                  </option>
                );
              })}
            </select>
          </div>

          {jornada.estado === "suspendida_emergencia" ? (
            <button
              type="button"
              onClick={() => setListaAbuelosOpen(true)}
              title="Ver lista de abuelos en este evento"
              className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#bf2020] bg-[#f2d2d2]/40 hover:bg-[#f2d2d2]/70 px-2.5 py-1 rounded-full border border-[#e5a6a6] whitespace-nowrap transition cursor-pointer"
            >
              <span>
                Suspendida ({adultosActivos.length} abuelos)
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setListaAbuelosOpen(true)}
              title="Ver lista de abuelos en este evento"
              className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#168003] bg-[#d0e6cd]/40 hover:bg-[#d0e6cd]/75 px-2.5 py-1 rounded-full border border-[#a2cc9a] whitespace-nowrap transition cursor-pointer"
            >
              <span>
                Activa ({adultosActivos.length} {adultosActivos.length === 1 ? "abuelo" : "abuelos"} en lista)
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
          )}

          <span className="hidden xl:block text-[11px] text-[#52606d] truncate min-w-0">
            {jornada.actividad_cierre} • {jornada.fecha} {jornada.hora_inicio_caminata} hs
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenFamiliarModal}
            className="border border-[#0a4494] text-[#0a4494] hover:bg-[#0a4494] hover:text-white font-semibold text-xs px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Sumar Abuelo</span>
          </button>

          <button
            onClick={() => onExecuteAction("lanzar_convocatoria")}
            disabled={loadingAction === "lanzar_convocatoria"}
            className="bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold text-xs px-4 py-1.5 rounded-full transition shadow-xs"
          >
            {loadingAction === "lanzar_convocatoria"
              ? "Enviando..."
              : "Enviar convocatoria por WhatsApp"}
          </button>

          <button
            onClick={onOpenSuspenderModal}
            disabled={loadingAction === "suspender_emergencia"}
            className="bg-[#bf2020] hover:bg-[#991919] text-white font-semibold text-xs px-4 py-1.5 rounded-full transition"
          >
            Suspender
          </button>
        </div>
      </div>

      {/* Alerta Caso 4B: Padrino se baja a ultimo momento */}
      {alertasPadrinoCaido.map((alertaAsis) => {
        const adulto = participantes.find((p) => p.id === alertaAsis.participante_id);
        const padrinoCaido = participantes.find(
          (p) => p.id === alertaAsis.padrino_asignado_id
        );
        if (!adulto) return null;

        return (
          <div
            key={alertaAsis.id}
            className="bg-red-50 border border-red-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Imprevisto de Padrino (Puerta a puerta)</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {padrinoCaido?.nombre || "El padrino"} ({padrinoCaido?.credencial_nro}) no
                puede pasar a buscar a {adulto.nombre} ({adulto.direccion}).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  onExecuteAction("reasignar_tutor", {
                    adultoId: adulto.id,
                    nuevoPadrinoId: SEED_IDS.padrinoHector,
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-2 rounded-lg"
              >
                Reasignar Tutor (#108)
              </button>

              <button
                onClick={() =>
                  onExecuteAction("frenar_salida", {
                    adultoId: adulto.id,
                  })
                }
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3 py-2 rounded-lg"
              >
                Frenar salida por seguridad
              </button>
            </div>
          </div>
        );
      })}

      {/* Panel Caso 4A: Control de acuse de recibo ante suspension */}
      {jornada.estado === "suspendida_emergencia" && (
        <div className="bg-white border border-red-300 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Control de Acuse de Recibo por Suspension
              </h3>
              <p className="text-xs text-slate-500">
                {jornada.motivo_suspension && (
                  <span>
                    Motivo enviado: <strong className="text-slate-700">&ldquo;{jornada.motivo_suspension}&rdquo;</strong> •{" "}
                  </span>
                )}
                Quienes figuran sin acuse deben ser llamados por telefono antes de las{" "}
                {jornada.hora_inicio_caminata} hs.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Confirmados:{" "}
              {asistenciasEvento.filter((a) => a.acuse_suspension_leido).length}/
              {adultosActivos.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {adultosActivos.map((adulto) => {
              const asis = asistenciasEvento.find((a) => a.participante_id === adulto.id);
              const leido = Boolean(asis?.acuse_suspension_leido);

              return (
                <div
                  key={adulto.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                    leido
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-red-50/70 border-red-200"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900">
                      {adulto.nombre}
                    </div>
                    <div className="text-[11px] text-slate-500">{adulto.direccion}</div>
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        leido
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {leido ? "Aviso leido (Confirmado)" : "SIN ACUSE — LLAMAR"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!leido && (
                      <a
                        href={`tel:${adulto.telefono}`}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Llamar</span>
                      </a>
                    )}
                    <button
                      onClick={() => onOpenPhone(adulto.id)}
                      className="bg-white border border-slate-300 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg"
                    >
                      Ver chat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista principal: 3 Anillos (o Editor de Ruta) a la izquierda + Mapa a la derecha (sin scroll en desktop) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-2.5 items-stretch">
        {/* Columna izquierda */}
        <div className="lg:col-span-4 min-h-0 flex flex-col">
          {isEditingRoute ? (
            <EditorRutaPanel
              nodes={draftNodes}
              clickTool={clickTool}
              routingBusy={routingBusy}
              saving={loadingAction === "actualizar_ruta_circuito"}
              distanceMeters={distanceMeters}
              onChangeClickTool={setClickTool}
              onUpdateParadaText={(id, field, val) =>
                setDraftNodes((prev) =>
                  prev.map((n) => (n.id === id ? { ...n, [field]: val } : n))
                )
              }
              onMoveNodeOrder={handleMoveNodeOrder}
              onRemoveNode={handleRemoveNode}
              onRecalculateStreets={() => void recomputeStreetRoute(draftNodes)}
              onResetFromClub={() => {
                const onlyParadas = draftNodes.filter((n) => n.kind === "parada");
                setDraftNodes(onlyParadas);
                void recomputeStreetRoute(onlyParadas);
              }}
              onCancel={() => setIsEditingRoute(false)}
              onSave={() => void handleSaveRoute()}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-col gap-2 min-h-0 lg:overflow-y-auto pr-0.5 flex-1">
          {/* Puerta a puerta */}
          <div className="bg-white rounded-xl p-2.5 border border-[#eaeced] border-t-2 border-t-[#a70355]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#363f48]">
                Puerta a puerta
              </span>
              <span className="text-base font-bold text-[#a70355]">
                {asistenciasNivel1.length}
              </span>
            </div>
            <p className="text-[11px] text-[#52606d]">
              Padrino acreditado pasa por el domicilio.
            </p>
            <div className="mt-1.5 pt-1 border-t border-[#eaeced] space-y-0.5">
              {asistenciasNivel1.length === 0 ? (
                <div className="text-[11px] text-[#9ea6ad]">Sin solicitudes aun.</div>
              ) : (
                asistenciasNivel1.map((a) => {
                  const ad = participantes.find((p) => p.id === a.participante_id);
                  const pad = participantes.find((p) => p.id === a.padrino_asignado_id);
                  if (!ad) return null;

                  let estadoLabel = "Esperando";
                  let badgeClass = "text-amber-800 bg-amber-50";
                  if (a.estado_padrino === "confirmado") {
                    estadoLabel = "Confirmado";
                    badgeClass = "text-[#168003] bg-[#d0e6cd]/40";
                  } else if (a.estado_padrino === "rechazado_buscando_reemplazo") {
                    estadoLabel = "Sin padrino";
                    badgeClass = "text-[#bf2020] bg-[#f2d2d2]/40";
                  } else if (a.estado_padrino === "sin_padrino_frenado") {
                    estadoLabel = "Frenada";
                    badgeClass = "text-[#52606d] bg-[#f6f6f7]";
                  }

                  return (
                    <div
                      key={a.id}
                      onClick={() => onOpenPhone(ad.id)}
                      className="flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded hover:bg-[#fdf9fb] cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#363f48] truncate">
                          {ad.nombre}
                        </div>
                        <div className="text-[10px] text-[#52606d] truncate">
                          Busca:{" "}
                          <strong className="text-[#0a4494]">
                            {pad ? `${pad.nombre} (${pad.credencial_nro || ""})` : "Sin asignar"}
                          </strong>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}
                      >
                        {estadoLabel}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Paradas seguras */}
          <div className="bg-white rounded-xl p-2.5 border border-[#eaeced] border-t-2 border-t-[#0a4494]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#363f48]">
                Paradas seguras
              </span>
              <span className="text-base font-bold text-[#0a4494]">
                {asistenciasNivel2.length}
              </span>
            </div>
            <p className="text-[11px] text-[#52606d]">
              Esquinas relevadas con horario de paso.
            </p>
            <div className="mt-1.5 pt-1 border-t border-[#eaeced] space-y-0.5">
              {circuito.paradas_seguras.map((parada, idx) => {
                const count = asistenciasNivel2.filter(
                  (a) => a.parada_esquina_id === parada.id
                ).length;
                return (
                  <div
                    key={parada.id}
                    className="flex items-center justify-between text-xs py-0.5 px-1.5"
                  >
                    <span className="text-[#52606d] truncate">
                      Parada {idx + 1} ({parada.horario_paso})
                    </span>
                    <span className="font-semibold text-[#0a4494] bg-[#cedaea]/40 px-2 py-0.5 rounded-full text-[10px] shrink-0">
                      {count === 1 ? "1 anotado" : `${count} anotados`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Directo al club */}
          <div className="bg-white rounded-xl p-2.5 border border-[#eaeced] border-t-2 border-t-[#0a4494]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#363f48]">
                Directo al club
              </span>
              <span className="text-base font-bold text-[#0a4494]">
                {asistenciasNivel3.length}
              </span>
            </div>
            <p className="text-[11px] text-[#52606d]">
              Asisten a las {jornada.hora_encuentro_club} hs para los juegos.
            </p>
            <div className="mt-1.5 pt-1 border-t border-[#eaeced] space-y-0.5">
              {asistenciasNivel3.map((a) => {
                const ad = participantes.find((p) => p.id === a.participante_id);
                if (!ad) return null;
                return (
                  <div
                    key={a.id}
                    onClick={() => onOpenPhone(ad.id)}
                    className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded hover:bg-[#fdf9fb] cursor-pointer"
                  >
                    <span className="font-medium text-[#363f48] truncate">
                      {ad.nombre}
                    </span>
                    <span className="text-[10px] font-semibold text-[#a70355] bg-[#faf0f5] px-2 py-0.5 rounded-full shrink-0">
                      {jornada.hora_encuentro_club} hs
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Mapa del circuito */}
        <div className="lg:col-span-8 bg-white rounded-xl p-2.5 border border-[#eaeced] flex flex-col gap-1.5 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#363f48]">
              Mapa del Circuito: {circuito.nombre_barrio}
            </h3>
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline text-[11px] text-[#52606d]">
                Actualizacion en vivo via WhatsApp
              </span>
              {!isEditingRoute && (
                <button
                  type="button"
                  onClick={handleStartEditRoute}
                  className="border border-[#0a4494] text-[#0a4494] hover:bg-[#0a4494] hover:text-white text-[11px] font-semibold px-3 py-1 rounded-full transition flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Editar ruta segura</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <MapaCircuitoLeaflet
              circuito={circuito}
              jornada={jornada}
              participantes={participantes}
              asistencias={asistencias}
              onSelectPhoneInSimulator={onOpenPhone}
              editMode={isEditingRoute}
              draftPolyline={draftPolyline}
              draftNodes={draftNodes}
              onMapClickInEdit={handleMapClickInEdit}
              onDragNodeInEdit={handleDragNodeInEdit}
            />
          </div>
        </div>
      </div>

      {listaAbuelosOpen && (
        <div
          className="fixed inset-0 z-[700] bg-slate-900/55 flex items-center justify-center p-4"
          onClick={() => setListaAbuelosOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-[#eaeced] flex flex-col gap-3 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eaeced] pb-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-5 h-5 text-[#a70355] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase text-[#a70355]">
                    {circuito.nombre_club} • {jornada.fecha} {jornada.hora_inicio_caminata} hs
                  </div>
                  <h3 className="font-bold text-sm text-[#363f48] truncate">
                    Lista de abuelos en este evento ({adultosActivos.length})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setListaAbuelosOpen(false)}
                className="text-[#52606d] hover:text-[#363f48] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adultosActivos.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#52606d]">
                Todavia no hay abuelos enlistados en este evento.
              </div>
            ) : (
              <div className="overflow-y-auto divide-y divide-[#eaeced] pr-1">
                {adultosActivos.map((ad) => {
                  const asis = asistenciasEvento.find(
                    (a) => a.participante_id === ad.id
                  );
                  const padrino = participantes.find(
                    (p) =>
                      p.id ===
                      (asis?.padrino_asignado_id || ad.padrino_preferido_id)
                  );
                  const parada = asis?.parada_esquina_id
                    ? circuito.paradas_seguras.find(
                        (ps) => ps.id === asis.parada_esquina_id
                      )
                    : undefined;

                  let estadoTexto = "Sin respuesta aun";
                  let estadoBadgeClass =
                    "bg-[#f6f6f7] text-[#52606d] border-[#eaeced]";

                  if (asis?.modalidad_elegida === "nivel_1_puerta") {
                    estadoTexto = `Puerta a puerta • Busca: ${
                      padrino?.nombre || "Padrino asignado"
                    }`;
                    estadoBadgeClass =
                      asis.estado_padrino === "confirmado"
                        ? "bg-[#d0e6cd]/45 text-[#168003] border-[#a2cc9a]"
                        : asis.estado_padrino === "rechazado_buscando_reemplazo"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-800 border-amber-200";
                  } else if (asis?.modalidad_elegida === "nivel_2_esquina") {
                    estadoTexto = `Parada segura • ${
                      parada?.nombre_esquina || "Esquina elegida"
                    } (${parada?.horario_paso || jornada.hora_inicio_caminata})`;
                    estadoBadgeClass =
                      "bg-[#d0e6cd]/45 text-[#168003] border-[#a2cc9a]";
                  } else if (asis?.modalidad_elegida === "nivel_3_directo") {
                    estadoTexto = "Directo al club";
                    estadoBadgeClass =
                      "bg-[#cedaea]/45 text-[#0a4494] border-[#b7c9e2]";
                  } else if (asis?.modalidad_elegida === "no_asiste") {
                    estadoTexto = "No asiste hoy";
                    estadoBadgeClass =
                      "bg-slate-100 text-slate-500 border-slate-200";
                  }

                  return (
                    <div
                      key={ad.id}
                      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#363f48]">
                            {ad.nombre}
                          </span>
                          <span className="text-[11px] text-[#52606d]">
                            ({ad.edad} anos • DNI {ad.dni})
                          </span>
                          {asis?.presente_validado_en_club && (
                            <span className="text-[10px] font-bold bg-[#d0e6cd]/60 text-[#168003] px-2 py-0.5 rounded-full">
                              Presente en sede
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#52606d] truncate">
                          {ad.direccion} • Tel: {ad.telefono}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${estadoBadgeClass}`}
                        >
                          {estadoTexto}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setListaAbuelosOpen(false);
                            onOpenPhone(ad.id);
                          }}
                          className="text-[11px] font-semibold text-[#0a4494] hover:underline whitespace-nowrap"
                        >
                          Ver WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#eaeced] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setListaAbuelosOpen(false);
                  onOpenFamiliarModal();
                }}
                className="border border-[#0a4494] text-[#0a4494] hover:bg-[#0a4494] hover:text-white font-semibold text-xs px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Sumar Abuelo</span>
              </button>
              <button
                type="button"
                onClick={() => setListaAbuelosOpen(false)}
                className="bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold text-xs px-4 py-1.5 rounded-full transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
