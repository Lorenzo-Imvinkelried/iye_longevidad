"use client";

import React from "react";
import { SystemSnapshot } from "@/types/domain";
import { getParticipanteAvatarUrl } from "@/lib/domain-helpers";
import {
  CheckCircle2,
  Gift,
  QrCode,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";

interface TabRecepcionProps {
  snapshot: SystemSnapshot;
  loadingAction: string | null;
  onExecuteAction: (action: string, payload?: Record<string, unknown>) => void;
  onOpenPhone: (participanteId: string) => void;
  onOpenPerfilParticipante: (participanteId: string) => void;
  onOpenQrModal: () => void;
}

export default function TabRecepcionClub({
  snapshot,
  loadingAction,
  onExecuteAction,
  onOpenPhone,
  onOpenPerfilParticipante,
  onOpenQrModal,
}: TabRecepcionProps) {
  const { circuito, jornada, participantes, asistencias } = snapshot;

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

  const validadosCount = adultosActivos.filter((ad) =>
    asistenciasEvento.some(
      (a) => a.participante_id === ad.id && a.presente_validado_en_club
    )
  ).length;
  const hayPendientes = validadosCount < adultosActivos.length;
  const hayValidados = validadosCount > 0;
  const actividadFinalizada = jornada.estado === "finalizada";

  return (
    <div className="space-y-3">
      {/* Cabecera en 2 Pasos: Paso 1 Validar Asistencia -> Paso 2 Validar Actividad y Otorgar Puntos */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                Recepcion y Validacion de Actividad — {circuito.nombre_club}
              </h2>
              <span className="text-[11px] font-bold bg-[#faf0f5] text-[#a70355] border border-[#e1a9c5] px-2.5 py-0.5 rounded-full">
                Presentes: {validadosCount} / {adultosActivos.length}
              </span>
              {actividadFinalizada && (
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Actividad Validada • Puntos Enviados por WhatsApp</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              <strong>Paso 1:</strong> Marca quienes asistieron hoy.{" "}
              <strong>Paso 2:</strong> Toca{" "}
              <strong className="text-[#a70355]">
                &ldquo;Validar Actividad y Otorgar Recompensas&rdquo;
              </strong>{" "}
              para acreditar <strong>+250 pts (+$2.500)</strong> a los presentes y enviarles sus descuentos por WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenQrModal}
              className="border border-[#c4c9cd] text-[#363f48] hover:border-[#a70355] hover:text-[#a70355] font-semibold text-xs px-3 py-2 rounded-full transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR de Puerta</span>
            </button>

            {hayValidados && (
              <button
                type="button"
                onClick={() =>
                  onExecuteAction("validar_club", {
                    participanteIds: adultosActivos.map((a) => a.id),
                    presente: false,
                  })
                }
                disabled={
                  loadingAction === "validar_club" ||
                  loadingAction === "validar_actividad_recompensas"
                }
                className="border border-[#c4c9cd] text-[#52606d] hover:border-[#bf2020] hover:text-[#bf2020] bg-white font-semibold text-xs px-3 py-2 rounded-full transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Desmarcar todos</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onExecuteAction("validar_club", {
                  participanteIds: adultosActivos.map((a) => a.id),
                  presente: true,
                })
              }
              disabled={
                loadingAction === "validar_club" ||
                adultosActivos.length === 0 ||
                !hayPendientes
              }
              className="border border-[#a70355] text-[#a70355] hover:bg-[#faf0f5] disabled:opacity-45 font-semibold text-xs px-3.5 py-2 rounded-full transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {hayPendientes
                  ? "1. Marcar todos presentes"
                  : "1. Todos presentes"}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onExecuteAction("validar_actividad_recompensas", {
                  jornadaId: jornada.id,
                })
              }
              disabled={
                !hayValidados ||
                loadingAction === "validar_actividad_recompensas"
              }
              title={
                !hayValidados
                  ? "Primero marca al menos 1 abuelo como Presente"
                  : "Acreditar +250 pts ($2.500) a todos los presentes y enviarles sus descuentos por WhatsApp"
              }
              className="bg-[#a70355] hover:bg-[#8c0347] disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-full transition flex items-center gap-1.5 shadow-xs"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>
                {loadingAction === "validar_actividad_recompensas"
                  ? "Acreditando puntos..."
                  : actividadFinalizada
                  ? `2. Re-acreditar Actividad (${validadosCount})`
                  : `2. Validar Actividad y Otorgar Puntos (${validadosCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {adultosActivos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No hay adultos mayores anotados en este evento todavia. Podes sumarlos desde &ldquo;Mapa y Monitoreo&rdquo; o &ldquo;Lista de Abuelos y Padrinos&rdquo;.
          </div>
        ) : (
        <div className="divide-y divide-slate-200">
          {adultosActivos.map((adulto, idx) => {
            const asis = asistenciasEvento.find((a) => a.participante_id === adulto.id);
            const padrino = participantes.find(
              (p) =>
                p.id === (asis?.padrino_asignado_id || adulto.padrino_preferido_id)
            );
            const validado = Boolean(asis?.presente_validado_en_club);
            const avatarUrl = getParticipanteAvatarUrl(adulto, idx);

            let modalidadTexto = "Sin respuesta aun";
            if (asis?.modalidad_elegida === "nivel_1_puerta") {
              modalidadTexto = `Puerta a puerta: Con ${padrino?.nombre || "Padrino"} (${
                padrino?.credencial_nro || ""
              })`;
            } else if (asis?.modalidad_elegida === "nivel_2_esquina") {
              const par = circuito.paradas_seguras.find(
                (ps) => ps.id === asis.parada_esquina_id
              );
              modalidadTexto = `Parada segura: ${par?.nombre_esquina || "Esquina"}`;
            } else if (asis?.modalidad_elegida === "nivel_3_directo") {
              modalidadTexto = "Directo al club";
            } else if (asis?.modalidad_elegida === "no_asiste") {
              modalidadTexto = "No asiste hoy";
            }

            return (
              <div
                key={adulto.id}
                onClick={() => onOpenPerfilParticipante(adulto.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenPerfilParticipante(adulto.id);
                  }
                }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#fdf9fb] transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={avatarUrl}
                    alt={adulto.nombre}
                    width={44}
                    height={44}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-[#a70355] transition">
                        {adulto.nombre} ({adulto.edad} anos)
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {modalidadTexto}
                      </span>
                      <span className="text-[10px] font-semibold text-[#a70355] opacity-0 group-hover:opacity-100 transition">
                        Ver ficha / editar →
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {adulto.direccion} • DNI {adulto.dni}
                    </div>
                    {validado && (
                      <div className="text-xs font-semibold text-[#a70355]">
                        {actividadFinalizada
                          ? "✓ Asistencia y Actividad validadas (+250 pts / +$2.500 enviados por WhatsApp)"
                          : "✓ Presente en la sede (toca '2. Validar Actividad y Otorgar Puntos' arriba al finalizar)"}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onOpenPhone(adulto.id)}
                    className="border border-[#c4c9cd] text-[#52606d] hover:border-[#a70355] hover:text-[#a70355] text-xs font-medium px-3 py-1.5 rounded-full transition"
                  >
                    Ver chat
                  </button>

                  {validado ? (
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#faf0f5] text-[#a70355] border border-[#e1a9c5] font-semibold text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Presente</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onExecuteAction("validar_club", {
                            participanteId: adulto.id,
                            presente: false,
                          })
                        }
                        disabled={loadingAction === "validar_club"}
                        title="Quitar asistencia (no aparecio)"
                        className="border border-[#e5a6a6] text-[#bf2020] hover:bg-[#f2d2d2]/40 text-xs font-semibold px-3 py-1.5 rounded-full transition inline-flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Quitar (No vino)</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onExecuteAction("validar_club", {
                          participanteId: adulto.id,
                          presente: true,
                        })
                      }
                      disabled={loadingAction === "validar_club"}
                      className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold text-xs px-4 py-1.5 rounded-full transition"
                    >
                      Validar presencia
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
