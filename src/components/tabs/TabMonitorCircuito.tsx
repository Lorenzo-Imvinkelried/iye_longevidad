"use client";

import React from "react";
import dynamic from "next/dynamic";
import { SEED_IDS, SystemSnapshot } from "@/types/domain";
import { getTutorJornadas } from "@/lib/domain-helpers";
import { AlertTriangle, MapPin, PhoneCall, UserPlus } from "lucide-react";

const MapaCircuitoLeaflet = dynamic(
  () => import("@/components/MapaCircuitoLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] sm:h-[380px] lg:h-[calc(100vh-215px)] rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
        Cargando mapa del circuito barrial...
      </div>
    ),
  }
);

interface TabMonitorProps {
  snapshot: SystemSnapshot;
  loggedInTutorId: string;
  loadingAction: string | null;
  onExecuteAction: (action: string, payload?: Record<string, unknown>) => void;
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
    <div className="space-y-3">
      {/* Barra de control compacta estilo Sancor con selector de Evento / Lugar */}
      <div className="bg-white rounded-xl px-4 py-2.5 border border-[#eaeced] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 shadow-xs">
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#f6f6f7] border border-[#eaeced] rounded-lg px-2.5 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#a70355] shrink-0" />
            <label htmlFor="selector-evento-activo" className="text-[11px] font-bold text-[#363f48] shrink-0">
              Evento / Lugar:
            </label>
            <select
              id="selector-evento-activo"
              value={jornada.id}
              onChange={(e) => onSelectEvento(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#0a4494] focus:outline-hidden max-w-[260px] sm:max-w-[340px] truncate cursor-pointer"
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

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {jornada.estado === "suspendida_emergencia" ? (
                <span className="text-[11px] font-bold text-[#bf2020] bg-[#f2d2d2]/40 px-2.5 py-0.5 rounded-full border border-[#e5a6a6]">
                  Suspendida{jornada.motivo_suspension ? `: ${jornada.motivo_suspension.slice(0, 42)}` : ""}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#168003] bg-[#d0e6cd]/40 px-2.5 py-0.5 rounded-full border border-[#a2cc9a]">
                  Activa ({adultosActivos.length} abuelos en lista)
                </span>
              )}
              <span className="text-[11px] text-[#52606d] truncate">
                Reintegro:{" "}
                <strong className="text-[#363f48]">
                  ${jornada.monto_reintegro_asistencia.toLocaleString("es-AR")}
                </strong>{" "}
                • Plus Padrino:{" "}
                <strong className="text-[#363f48]">
                  +${jornada.plus_reintegro_padrino.toLocaleString("es-AR")}
                </strong>
              </span>
            </div>
          </div>
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

      {/* Vista principal: 3 Anillos a la izquierda + Mapa a la derecha (sin scroll en desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Columna izquierda: 3 Anillos apilados */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 lg:max-h-[calc(100vh-175px)] lg:overflow-y-auto pr-0.5">
          {/* Nivel 1 */}
          <div className="bg-white rounded-xl p-3 border border-[#eaeced] border-t-2 border-t-[#a70355]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#363f48]">
                Nivel 1: Puerta a puerta
              </span>
              <span className="text-base font-bold text-[#a70355]">
                {asistenciasNivel1.length}
              </span>
            </div>
            <p className="text-[11px] text-[#52606d]">
              Padrino acreditado pasa por el domicilio.
            </p>
            <div className="mt-2 pt-1.5 border-t border-[#eaeced] space-y-1">
              {asistenciasNivel1.length === 0 ? (
                <div className="text-[11px] text-[#9ea6ad]">Sin solicitudes aun.</div>
              ) : (
                asistenciasNivel1.map((a) => {
                  const ad = participantes.find((p) => p.id === a.participante_id);
                  const pad = participantes.find((p) => p.id === a.padrino_asignado_id);
                  if (!ad) return null;

                  let estadoLabel = "Esperando padrino";
                  let badgeClass = "text-amber-800 bg-amber-50";
                  if (a.estado_padrino === "confirmado") {
                    estadoLabel = `Confirmado (${pad?.credencial_nro})`;
                    badgeClass = "text-[#168003] bg-[#d0e6cd]/40";
                  } else if (a.estado_padrino === "rechazado_buscando_reemplazo") {
                    estadoLabel = "Sin padrino";
                    badgeClass = "text-[#bf2020] bg-[#f2d2d2]/40";
                  } else if (a.estado_padrino === "sin_padrino_frenado") {
                    estadoLabel = "Salida frenada";
                    badgeClass = "text-[#52606d] bg-[#f6f6f7]";
                  }

                  return (
                    <div
                      key={a.id}
                      onClick={() => onOpenPhone(ad.id)}
                      className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-[#fdf9fb] cursor-pointer"
                    >
                      <span className="font-medium text-[#363f48] truncate">
                        {ad.nombre.split(" ")[0]}
                      </span>
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

          {/* Nivel 2 */}
          <div className="bg-white rounded-xl p-3 border border-[#eaeced] border-t-2 border-t-[#0a4494]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#363f48]">
                Nivel 2: Paradas seguras
              </span>
              <span className="text-base font-bold text-[#0a4494]">
                {asistenciasNivel2.length}
              </span>
            </div>
            <p className="text-[11px] text-[#52606d]">
              Esquinas relevadas con horario de paso.
            </p>
            <div className="mt-2 pt-1.5 border-t border-[#eaeced] space-y-1">
              {circuito.paradas_seguras.map((parada, idx) => {
                const count = asistenciasNivel2.filter(
                  (a) => a.parada_esquina_id === parada.id
                ).length;
                return (
                  <div
                    key={parada.id}
                    className="flex items-center justify-between text-xs py-1 px-1.5"
                  >
                    <span className="text-[#52606d] truncate">
                      Parada {idx + 1} ({parada.horario_paso})
                    </span>
                    <span className="font-semibold text-[#0a4494] bg-[#cedaea]/40 px-2 py-0.5 rounded-full text-[10px] shrink-0">
                      {count} anotados
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nivel 3 */}
          <div className="bg-white rounded-xl p-3 border border-[#eaeced] border-t-2 border-t-[#0a4494]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#363f48]">
                Nivel 3: Directo al club
              </span>
              <span className="text-base font-bold text-[#0a4494]">
                {asistenciasNivel3.length}
              </span>
            </div>
            <p className="text-[11px] text-[#52606d]">
              Asisten a las {jornada.hora_encuentro_club} hs para los juegos.
            </p>
            <div className="mt-2 pt-1.5 border-t border-[#eaeced] space-y-1">
              {asistenciasNivel3.map((a) => {
                const ad = participantes.find((p) => p.id === a.participante_id);
                if (!ad) return null;
                return (
                  <div
                    key={a.id}
                    onClick={() => onOpenPhone(ad.id)}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-[#fdf9fb] cursor-pointer"
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

        {/* Columna derecha: Mapa del circuito */}
        <div className="lg:col-span-8 bg-white rounded-xl p-3 border border-[#eaeced] flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-xs sm:text-sm font-bold text-[#363f48]">
              Mapa del Circuito: {circuito.nombre_barrio}
            </h3>
            <span className="text-[11px] text-[#52606d]">
              Actualizacion en vivo via WhatsApp
            </span>
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
    </div>
  );
}
