"use client";

import React, { useEffect } from "react";
import type L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Asistencia,
  CircuitoBarrial,
  Jornada,
  Participante,
} from "@/types/domain";
import {
  createAdultoDomicilioIcon,
  createClubIcon,
  createPadrinoIcon,
  createParadaIcon,
  createViaWaypointIcon,
} from "@/components/mapa/map-icons";
import type { EditableRouteNode } from "@/components/mapa/EditorRutaPanel";

interface MapaProps {
  circuito: CircuitoBarrial;
  jornada: Jornada;
  participantes: Participante[];
  asistencias: Asistencia[];
  onSelectPhoneInSimulator?: (participanteId: string) => void;
  editMode?: boolean;
  draftPolyline?: [number, number][];
  draftNodes?: EditableRouteNode[];
  onMapClickInEdit?: (lat: number, lng: number) => void;
  onDragNodeInEdit?: (nodeId: string, lat: number, lng: number) => void;
}

function MapBoundsController({
  center,
  editMode,
  onMapClickInEdit,
}: {
  center: [number, number];
  editMode?: boolean;
  onMapClickInEdit?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(center, 15, { animate: true });
    const container = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map, center[0], center[1]]);

  useMapEvents({
    click(e) {
      if (editMode && onMapClickInEdit) {
        onMapClickInEdit(
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6))
        );
      }
    },
  });

  return null;
}

export default function MapaCircuitoLeaflet({
  circuito,
  jornada,
  participantes,
  asistencias,
  onSelectPhoneInSimulator,
  editMode = false,
  draftPolyline,
  draftNodes = [],
  onMapClickInEdit,
  onDragNodeInEdit,
}: MapaProps) {
  const center: [number, number] = [
    circuito.coords_club.lat,
    circuito.coords_club.lng,
  ];

  const activeRoutePositions =
    editMode && draftPolyline && draftPolyline.length > 0
      ? draftPolyline
      : circuito.ruta_polilinea;

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
  const padrinosSolicitadosIds = new Set(
    asistenciasEvento
      .filter(
        (a) =>
          a.modalidad_elegida === "nivel_1_puerta" &&
          a.estado_padrino !== "sin_padrino_frenado" &&
          Boolean(a.padrino_asignado_id)
      )
      .map((a) => a.padrino_asignado_id as string)
  );
  const padrinosActivos = participantes.filter(
    (p) =>
      p.rol === "padrino" &&
      p.acreditado_por_club &&
      padrinosSolicitadosIds.has(p.id)
  );

  const validadosCount = asistenciasEvento.filter(
    (a) => a.presente_validado_en_club
  ).length;
  const nivel3Count = asistenciasEvento.filter(
    (a) => a.modalidad_elegida === "nivel_3_directo"
  ).length;

  const nombreCortoLugar =
    circuito.nombre_club.length > 24
      ? `${circuito.nombre_club.slice(0, 22)}...`
      : circuito.nombre_club;

  return (
    <div className="relative w-full h-[300px] sm:h-[360px] lg:h-full rounded-xl overflow-hidden border border-[#eaeced] bg-[#f6f6f7]">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
          zIndex: 1,
          cursor: editMode ? "crosshair" : "grab",
        }}
      >
        <MapBoundsController
          center={center}
          editMode={editMode}
          onMapClickInEdit={onMapClickInEdit}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline
          positions={activeRoutePositions}
          pathOptions={{
            color: editMode ? "#dc9abb" : "#e1a9c5",
            weight: 12,
            opacity: 0.35,
            lineCap: "round",
            lineJoin: "round",
          }}
        />

        <Polyline
          positions={activeRoutePositions}
          pathOptions={{
            color:
              jornada.estado === "suspendida_emergencia"
                ? "#bf2020"
                : editMode
                ? "#7d0240"
                : "#a70355",
            weight: 4.5,
            opacity: 0.92,
            dashArray: jornada.estado === "suspendida_emergencia" ? "8, 8" : undefined,
          }}
        />

        {adultosActivos.map((adulto) => {
          const asis = asistenciasEvento.find((a) => a.participante_id === adulto.id);
          if (!asis || asis.modalidad_elegida !== "nivel_1_puerta") return null;
          const padrino = participantes.find((p) => p.id === asis.padrino_asignado_id);
          if (!padrino) return null;

          const lineColor =
            asis.estado_padrino === "confirmado"
              ? "#a70355"
              : asis.estado_padrino === "esperando_confirmacion"
              ? "#67717c"
              : "#bf2020";

          return (
            <Polyline
              key={`rescue-line-${adulto.id}`}
              positions={[
                [padrino.coords_domicilio.lat, padrino.coords_domicilio.lng],
                [adulto.coords_domicilio.lat, adulto.coords_domicilio.lng],
              ]}
              pathOptions={{
                color: lineColor,
                weight: 3,
                dashArray: "5, 5",
                opacity: 0.85,
              }}
            />
          );
        })}

        <Marker
          position={[circuito.coords_club.lat, circuito.coords_club.lng]}
          icon={createClubIcon(nombreCortoLugar, validadosCount, nivel3Count)}
        >
          <Popup>
            <div className="p-1 min-w-[210px] space-y-1 text-xs">
              <div className="font-bold text-slate-900 text-sm">{circuito.nombre_club}</div>
              <div className="text-slate-600">{circuito.direccion_club}</div>
              <div className="pt-1 border-t border-slate-100 text-[#a70355] font-semibold">
                Poliza Sancor RC Activa ({(circuito.poliza_nro || "SANCOR-RC").split("|")[0]})
              </div>
              <div className="text-slate-700">
                Encuentro {jornada.hora_encuentro_club} hs: {jornada.actividad_cierre}
              </div>
            </div>
          </Popup>
        </Marker>

        {editMode ? (
          draftNodes.map((node, idx) => {
            const paradaOrdinal =
              node.kind === "parada"
                ? draftNodes
                    .slice(0, idx + 1)
                    .filter((n) => n.kind === "parada").length - 1
                : 0;

            return (
              <Marker
                key={node.id}
                position={[node.lat, node.lng]}
                draggable={true}
                icon={
                  node.kind === "parada"
                    ? createParadaIcon(
                        paradaOrdinal,
                        node.horarioPaso || "16:00 hs",
                        0,
                        true
                      )
                    : createViaWaypointIcon(idx)
                }
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const pos = m.getLatLng();
                    onDragNodeInEdit?.(
                      node.id,
                      Number(pos.lat.toFixed(6)),
                      Number(pos.lng.toFixed(6))
                    );
                  },
                }}
              />
            );
          })
        ) : (
          circuito.paradas_seguras.map((parada, idx) => {
            const abuelosEnEsquina = asistenciasEvento
              .filter(
                (a) =>
                  a.modalidad_elegida === "nivel_2_esquina" &&
                  a.parada_esquina_id === parada.id
              )
              .map((a) => participantes.find((p) => p.id === a.participante_id))
              .filter(Boolean) as Participante[];

            return (
              <Marker
                key={parada.id}
                position={[parada.lat, parada.lng]}
                icon={createParadaIcon(idx, parada.horario_paso, abuelosEnEsquina.length)}
              >
                <Popup>
                  <div className="p-1 min-w-[220px] space-y-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm">
                      {parada.nombre_esquina}
                    </div>
                    <div className="text-slate-600">
                      Horario de paso: <strong>{parada.horario_paso}</strong>
                    </div>
                    <div className="text-[#52606d]">{parada.estado_veredas}</div>
                    <div className="pt-1 border-t border-slate-100">
                      <div className="font-semibold text-slate-700">
                        Esperando en esta esquina ({abuelosEnEsquina.length}):
                      </div>
                      {abuelosEnEsquina.length === 0 ? (
                        <div className="text-slate-400">Sin inscriptos aun.</div>
                      ) : (
                        <ul className="mt-1 space-y-0.5">
                          {abuelosEnEsquina.map((ab) => (
                            <li key={ab.id} className="font-medium text-slate-800">
                              - {ab.nombre}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}

        {padrinosActivos.map((padrino) => (
          <Marker
            key={padrino.id}
            position={[padrino.coords_domicilio.lat, padrino.coords_domicilio.lng]}
            icon={createPadrinoIcon(
              padrino.nombre.split(" ")[0],
              padrino.credencial_nro || "#104"
            )}
          >
            <Popup>
              <div className="p-1 min-w-[200px] space-y-1.5 text-xs">
                <div className="font-bold text-slate-900 text-sm">
                  {padrino.nombre} ({padrino.credencial_nro})
                </div>
                <div className="text-slate-600">
                  {padrino.direccion} • DNI {padrino.dni}
                </div>
                {onSelectPhoneInSimulator && (
                  <button
                    onClick={() => onSelectPhoneInSimulator(padrino.id)}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-1.5 px-2.5 rounded-lg"
                  >
                    Ver chat en simulador
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {adultosActivos.map((adulto) => {
          const asis = asistenciasEvento.find((a) => a.participante_id === adulto.id);
          const padrino = participantes.find((p) => p.id === asis?.padrino_asignado_id);
          const primerNombre = adulto.nombre.split(" ")[0];

          let colorHex = "#67717c";
          let etiquetaEstado = "Pendiente";
          let isAlert = false;

          if (jornada.estado === "suspendida_emergencia") {
            if (asis?.acuse_suspension_leido) {
              colorHex = "#363f48";
              etiquetaEstado = "En casa";
            } else {
              colorHex = "#bf2020";
              etiquetaEstado = "Sin acuse";
              isAlert = true;
            }
          } else if (asis) {
            if (asis.presente_validado_en_club) {
              colorHex = "#363f48";
              etiquetaEstado = "En club";
            } else if (asis.modalidad_elegida === "nivel_1_puerta") {
              if (asis.estado_padrino === "esperando_confirmacion") {
                colorHex = "#67717c";
                etiquetaEstado = "Esp. padrino";
              } else if (asis.estado_padrino === "confirmado") {
                colorHex = "#a70355";
                etiquetaEstado = `Con ${padrino?.nombre?.split(" ")[0] || padrino?.credencial_nro || "padrino"}`;
              } else if (asis.estado_padrino === "rechazado_buscando_reemplazo") {
                colorHex = "#bf2020";
                etiquetaEstado = "Sin padrino";
                isAlert = true;
              } else if (asis.estado_padrino === "sin_padrino_frenado") {
                colorHex = "#45515c";
                etiquetaEstado = "Salida frenada";
              }
            } else if (asis.modalidad_elegida === "nivel_2_esquina") {
              colorHex = "#7d0240";
              etiquetaEstado = "En esquina";
            } else if (asis.modalidad_elegida === "nivel_3_directo") {
              colorHex = "#45515c";
              etiquetaEstado = "Va directo";
            } else if (asis.modalidad_elegida === "no_asiste") {
              colorHex = "#9ea6ad";
              etiquetaEstado = "No asiste";
            }
          }

          return (
            <Marker
              key={adulto.id}
              position={[adulto.coords_domicilio.lat, adulto.coords_domicilio.lng]}
              icon={createAdultoDomicilioIcon(
                primerNombre,
                colorHex,
                etiquetaEstado,
                isAlert
              )}
            >
              <Popup>
                <div className="p-1 min-w-[200px] space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    {adulto.nombre} ({adulto.edad} anos)
                  </div>
                  <div className="text-slate-600">{adulto.direccion}</div>
                  <div className="text-slate-800">
                    Estado: <strong>{etiquetaEstado}</strong>
                  </div>
                  {asis?.modalidad_elegida === "nivel_1_puerta" && padrino && (
                    <div className="text-[#a70355] font-semibold">
                      Pasa a buscar: {padrino.nombre} ({padrino.credencial_nro})
                    </div>
                  )}
                  {onSelectPhoneInSimulator && (
                    <button
                      onClick={() => onSelectPhoneInSimulator(adulto.id)}
                      className="w-full bg-[#a70355] hover:bg-[#8c0347] text-white text-xs font-semibold py-1.5 px-2.5 rounded-lg"
                    >
                      Ver chat en simulador
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {editMode && (
        <div className="absolute top-2.5 left-12 right-2.5 z-[400] pointer-events-none flex justify-center">
          <div className="bg-[#a70355] text-white px-3 py-1 rounded-full shadow-md text-[11px] font-semibold">
            Modo Edicion: hace clic en calles para sumar puntos o arrastra las paradas
          </div>
        </div>
      )}
    </div>
  );
}
