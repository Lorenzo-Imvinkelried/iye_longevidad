"use client";

import React from "react";
import dynamic from "next/dynamic";
import { SEED_IDS, SystemSnapshot } from "@/types/domain";
import { AlertTriangle, PhoneCall } from "lucide-react";

const MapaCircuitoLeaflet = dynamic(
  () => import("@/components/MapaCircuitoLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[430px] rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
        Cargando mapa del circuito barrial...
      </div>
    ),
  }
);

interface TabMonitorProps {
  snapshot: SystemSnapshot;
  loadingAction: string | null;
  onExecuteAction: (action: string, payload?: Record<string, unknown>) => void;
  onOpenPhone: (participanteId: string) => void;
}

export default function TabMonitorCircuito({
  snapshot,
  loadingAction,
  onExecuteAction,
  onOpenPhone,
}: TabMonitorProps) {
  const { circuito, jornada, participantes, asistencias } = snapshot;

  const adultosActivos = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );

  const asistenciasNivel1 = asistencias.filter(
    (a) => a.modalidad_elegida === "nivel_1_puerta"
  );
  const asistenciasNivel2 = asistencias.filter(
    (a) => a.modalidad_elegida === "nivel_2_esquina"
  );
  const asistenciasNivel3 = asistencias.filter(
    (a) => a.modalidad_elegida === "nivel_3_directo"
  );
  const alertasPadrinoCaido = asistencias.filter(
    (a) =>
      a.modalidad_elegida === "nivel_1_puerta" &&
      a.estado_padrino === "rechazado_buscando_reemplazo"
  );

  return (
    <div className="space-y-4">
      {/* Barra de control de la jornada */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Jornada {jornada.hora_inicio_caminata} hs:
            </span>
            {jornada.estado === "suspendida_emergencia" ? (
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Suspendida por clima
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Activa ({jornada.actividad_cierre})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reintegro por asistencia: <strong>${jornada.monto_reintegro_asistencia.toLocaleString("es-AR")}</strong> • Plus Padrino: <strong>+${jornada.plus_reintegro_padrino.toLocaleString("es-AR")}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onExecuteAction("lanzar_convocatoria")}
            disabled={loadingAction === "lanzar_convocatoria"}
            className="bg-[#004b87] hover:bg-[#003966] text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            {loadingAction === "lanzar_convocatoria"
              ? "Enviando..."
              : "Enviar convocatoria por WhatsApp"}
          </button>

          <button
            onClick={() =>
              onExecuteAction("suspender_emergencia", {
                motivo: "Condiciones climaticas adversas y veredas resbaladizas",
              })
            }
            disabled={loadingAction === "suspender_emergencia"}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            Suspender por lluvia
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
                <span>Imprevisto de Padrino (Nivel 1)</span>
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
                Quienes figuran sin acuse deben ser llamados por telefono antes de las{" "}
                {jornada.hora_inicio_caminata} hs.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Confirmados en casa:{" "}
              {asistencias.filter((a) => a.acuse_suspension_leido).length}/
              {adultosActivos.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {adultosActivos.map((adulto) => {
              const asis = asistencias.find((a) => a.participante_id === adulto.id);
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
                      {leido ? "Acuse recibido (En casa)" : "SIN ACUSE — LLAMAR"}
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

      {/* Resumen simple de los 3 Anillos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Nivel 1 */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Nivel 1: Puerta a puerta
            </span>
            <span className="text-lg font-bold text-slate-900">
              {asistenciasNivel1.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Padrino acreditado pasa por el domicilio.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
            {asistenciasNivel1.length === 0 ? (
              <div className="text-[11px] text-slate-400">Sin solicitudes aun.</div>
            ) : (
              asistenciasNivel1.map((a) => {
                const ad = participantes.find((p) => p.id === a.participante_id);
                const pad = participantes.find((p) => p.id === a.padrino_asignado_id);
                if (!ad) return null;

                let estadoLabel = "Esperando padrino";
                let badgeClass = "text-amber-700 bg-amber-50";
                if (a.estado_padrino === "confirmado") {
                  estadoLabel = `Confirmado (${pad?.credencial_nro})`;
                  badgeClass = "text-emerald-700 bg-emerald-50";
                } else if (a.estado_padrino === "rechazado_buscando_reemplazo") {
                  estadoLabel = "Sin padrino";
                  badgeClass = "text-red-700 bg-red-50";
                } else if (a.estado_padrino === "sin_padrino_frenado") {
                  estadoLabel = "Salida frenada";
                  badgeClass = "text-slate-600 bg-slate-100";
                }

                return (
                  <div
                    key={a.id}
                    onClick={() => onOpenPhone(ad.id)}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="font-medium text-slate-800">
                      {ad.nombre.split(" ")[0]}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeClass}`}>
                      {estadoLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Nivel 2 */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Nivel 2: Paradas seguras
            </span>
            <span className="text-lg font-bold text-slate-900">
              {asistenciasNivel2.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Esquinas relevadas con horario de paso.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
            {circuito.paradas_seguras.map((parada, idx) => {
              const count = asistenciasNivel2.filter(
                (a) => a.parada_esquina_id === parada.id
              ).length;
              return (
                <div
                  key={parada.id}
                  className="flex items-center justify-between text-xs py-1 px-2"
                >
                  <span className="text-slate-700 truncate">
                    Parada {idx + 1} ({parada.horario_paso})
                  </span>
                  <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                    {count} anotados
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nivel 3 */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Nivel 3: Directo al club
            </span>
            <span className="text-lg font-bold text-slate-900">
              {asistenciasNivel3.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Asisten a las {jornada.hora_encuentro_club} hs para los juegos.
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
            {asistenciasNivel3.map((a) => {
              const ad = participantes.find((p) => p.id === a.participante_id);
              if (!ad) return null;
              return (
                <div
                  key={a.id}
                  onClick={() => onOpenPhone(ad.id)}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <span className="font-medium text-slate-800">{ad.nombre}</span>
                  <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded">
                    16:00 hs
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mapa del circuito */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Mapa del Circuito: {circuito.nombre_barrio}
            </h3>
            <p className="text-xs text-slate-500">
              Los marcadores se actualizan automaticamente cuando los participantes responden en WhatsApp.
            </p>
          </div>
        </div>

        <MapaCircuitoLeaflet
          circuito={circuito}
          jornada={jornada}
          participantes={participantes}
          asistencias={asistencias}
          onSelectPhoneInSimulator={onOpenPhone}
        />
      </div>
    </div>
  );
}
