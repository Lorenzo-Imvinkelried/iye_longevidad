"use client";

import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
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
} from "@/components/mapa/map-icons";

interface MapaProps {
  circuito: CircuitoBarrial;
  jornada: Jornada;
  participantes: Participante[];
  asistencias: Asistencia[];
  onSelectPhoneInSimulator?: (participanteId: string) => void;
}

function MapBoundsController({ center }: { center: [number, number] }) {
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
  return null;
}

export default function MapaCircuitoLeaflet({
  circuito,
  jornada,
  participantes,
  asistencias,
  onSelectPhoneInSimulator,
}: MapaProps) {
  const center: [number, number] = [
    circuito.coords_club.lat,
    circuito.coords_club.lng,
  ];

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
  const padrinosActivos = participantes.filter(
    (p) => p.rol === "padrino" && p.acreditado_por_club
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
    <div className="relative w-full h-[320px] sm:h-[380px] lg:h-[calc(100vh-225px)] lg:min-h-[380px] lg:max-h-[700px] rounded-xl overflow-hidden border border-[#eaeced] bg-[#f6f6f7]">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <MapBoundsController center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline
          positions={circuito.ruta_polilinea}
          pathOptions={{
            color: "#34d399",
            weight: 12,
            opacity: 0.25,
            lineCap: "round",
            lineJoin: "round",
          }}
        />

        <Polyline
          positions={circuito.ruta_polilinea}
          pathOptions={{
            color: jornada.estado === "suspendida_emergencia" ? "#dc2626" : "#059669",
            weight: 4,
            opacity: 0.9,
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
              ? "#059669"
              : asis.estado_padrino === "esperando_confirmacion"
              ? "#d97706"
              : "#dc2626";

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
              <div className="pt-1 border-t border-slate-100 text-emerald-700 font-semibold">
                Poliza Sancor RC Activa ({(circuito.poliza_nro || "SANCOR-RC").split("|")[0]})
              </div>
              <div className="text-slate-700">
                Encuentro {jornada.hora_encuentro_club} hs: {jornada.actividad_cierre}
              </div>
            </div>
          </Popup>
        </Marker>

        {circuito.paradas_seguras.map((parada, idx) => {
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
                  <div className="text-emerald-700">{parada.estado_veredas}</div>
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
        })}

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

          let colorHex = "#64748b";
          let etiquetaEstado = "Pendiente";
          let isAlert = false;

          if (jornada.estado === "suspendida_emergencia") {
            if (asis?.acuse_suspension_leido) {
              colorHex = "#059669";
              etiquetaEstado = "En casa";
            } else {
              colorHex = "#dc2626";
              etiquetaEstado = "Sin acuse";
              isAlert = true;
            }
          } else if (asis) {
            if (asis.presente_validado_en_club) {
              colorHex = "#0284c7";
              etiquetaEstado = "En club";
            } else if (asis.modalidad_elegida === "nivel_1_puerta") {
              if (asis.estado_padrino === "esperando_confirmacion") {
                colorHex = "#d97706";
                etiquetaEstado = "Esp. padrino";
              } else if (asis.estado_padrino === "confirmado") {
                colorHex = "#059669";
                etiquetaEstado = `Con ${padrino?.credencial_nro || "padrino"}`;
              } else if (asis.estado_padrino === "rechazado_buscando_reemplazo") {
                colorHex = "#dc2626";
                etiquetaEstado = "Sin padrino";
                isAlert = true;
              } else if (asis.estado_padrino === "sin_padrino_frenado") {
                colorHex = "#475569";
                etiquetaEstado = "Salida frenada";
              }
            } else if (asis.modalidad_elegida === "nivel_2_esquina") {
              colorHex = "#0f766e";
              etiquetaEstado = "En esquina";
            } else if (asis.modalidad_elegida === "nivel_3_directo") {
              colorHex = "#0284c7";
              etiquetaEstado = "Va directo";
            } else if (asis.modalidad_elegida === "no_asiste") {
              colorHex = "#94a3b8";
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
                  {onSelectPhoneInSimulator && (
                    <button
                      onClick={() => onSelectPhoneInSimulator(adulto.id)}
                      className="w-full bg-[#004b87] hover:bg-[#003966] text-white text-xs font-semibold py-1.5 px-2.5 rounded-lg"
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

      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto z-[400] bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-lg shadow border border-slate-200 text-[10px] sm:text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-3 h-1 rounded bg-emerald-600 inline-block"></span>
          Ruta segura
        </span>
        <span className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
          Esperando padrino
        </span>
        <span className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
          Padrino confirmado
        </span>
        <span className="flex items-center gap-1.5 text-slate-700">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
          Alerta / Sin acuse
        </span>
      </div>
    </div>
  );
}
