"use client";

import React, { useState } from "react";
import { SEED_IDS, SystemSnapshot } from "@/types/domain";
import { ShieldCheck, UserCheck, UserPlus } from "lucide-react";

interface TabConfianzaProps {
  snapshot: SystemSnapshot;
  onExecuteAction: (action: string, payload?: Record<string, unknown>) => void;
  onOpenPhone: (participanteId: string) => void;
  onOpenFamiliarModal: () => void;
  onOpenPadrinoModal: () => void;
  onOpenCoordinadorModal: () => void;
}

export default function TabCadenaConfianza({
  snapshot,
  onExecuteAction,
  onOpenPhone,
  onOpenFamiliarModal,
  onOpenPadrinoModal,
  onOpenCoordinadorModal,
}: TabConfianzaProps) {
  const [selectedPadrinoForApproval, setSelectedPadrinoForApproval] = useState<
    Record<string, string>
  >({});

  const { circuito, jornada, participantes, asistencias } = snapshot;

  const asistenciasEvento = asistencias.filter(
    (a) => a.jornada_id === jornada.id
  );
  const idsDelEvento = new Set(asistenciasEvento.map((a) => a.participante_id));

  const adultosDelLugar = participantes.filter(
    (p) =>
      p.rol === "adulto_mayor" &&
      p.estado_alta === "activo" &&
      idsDelEvento.has(p.id)
  );

  const padrinosAcreditados = participantes.filter(
    (p) => p.rol === "padrino" && p.acreditado_por_club
  );
  const solicitudesPendientes = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "pendiente_aprobacion"
  );

  return (
    <div className="space-y-4">
      {/* Cabecera de acciones */}
      <div className="bg-white rounded-xl p-4 border border-[#eaeced] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#363f48]">
            Padron Guardado en {circuito.nombre_club}
          </h2>
          <p className="text-xs text-[#52606d] mt-0.5">
            En tu perfil de organizador queda guardada la lista de abuelos de este lugar junto con los vecinos padrinos acreditados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenFamiliarModal}
            className="bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Sumar abuelo a este lugar</span>
          </button>

          <button
            onClick={onOpenPadrinoModal}
            className="border border-[#a70355] text-[#a70355] hover:bg-[#a70355] hover:text-white font-semibold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acreditar nuevo padrino</span>
          </button>

          <button
            onClick={onOpenCoordinadorModal}
            className="border border-[#363f48] text-[#363f48] hover:bg-[#363f48] hover:text-white font-semibold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acreditar coordinador</span>
          </button>
        </div>
      </div>

      {/* Lista de Adultos Mayores guardados en este lugar */}
      <div className="bg-white rounded-xl border border-[#eaeced] overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f6f7] border-b border-[#eaeced] flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#363f48]">
            Lista de Abuelos en {circuito.nombre_club} ({adultosDelLugar.length})
          </h3>
          <span className="text-[11px] text-[#52606d]">
            Reciben la convocatoria por WhatsApp al iniciar un evento en esta sede
          </span>
        </div>

        {adultosDelLugar.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#52606d]">
            Aun no hay abuelos vinculados a este evento/lugar. Toca{" "}
            <strong>&ldquo;+ Sumar abuelo a este lugar&rdquo;</strong> para vincular un adulto mayor existente o cargar uno nuevo.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {adultosDelLugar.map((adulto) => {
            const padrinoPref = participantes.find(
              (p) => p.id === adulto.padrino_preferido_id
            );
            return (
              <div
                key={adulto.id}
                className="border border-[#eaeced] rounded-xl p-3.5 flex flex-col justify-between gap-2 hover:border-[#0a4494]/40 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#363f48]">
                      {adulto.nombre} ({adulto.edad} anos)
                    </span>
                    <span className="text-[10px] font-bold bg-[#faf0f5] text-[#a70355] px-2.5 py-0.5 rounded-full">
                      Nivel habitual {adulto.nivel_autonomia_habitual}
                    </span>
                  </div>
                  <div className="text-xs text-[#52606d]">
                    DNI {adulto.dni} • {adulto.direccion}
                  </div>
                  <div className="text-xs text-[#52606d]">
                    WhatsApp: <strong className="text-[#363f48]">{adulto.telefono}</strong> • Familiar: {adulto.contacto_familiar_nombre}
                  </div>
                  {padrinoPref && (
                    <div className="text-[11px] text-[#0a4494] font-semibold">
                      Padrino habitual: {padrinoPref.nombre} ({padrinoPref.credencial_nro})
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#eaeced] flex items-center justify-between text-xs">
                  <span className="text-[#52606d]">
                    Estado: <strong className="text-[#168003]">Activo en la sede</strong>
                  </span>
                  <button
                    onClick={() => onOpenPhone(adulto.id)}
                    className="text-[#0a4494] hover:underline font-semibold"
                  >
                    Ver chat WhatsApp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Solicitudes de nietos y familiares */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Solicitudes enviadas por familiares ({solicitudesPendientes.length})
          </h3>
        </div>

        {solicitudesPendientes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No hay solicitudes pendientes de aprobacion. Podes cargar una nueva desde el boton &ldquo;Inscribir abuelo / familiar&rdquo;.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {solicitudesPendientes.map((sol) => {
              const chosenPadrinoId =
                selectedPadrinoForApproval[sol.id] || SEED_IDS.padrinoCarlos;

              return (
                <div
                  key={sol.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="text-xs text-slate-500">
                      Familiar solicitante: <strong>{sol.contacto_familiar_nombre}</strong> ({sol.contacto_familiar_tel})
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {sol.nombre} ({sol.edad} anos • DNI {sol.dni})
                    </div>
                    <div className="text-xs text-slate-600">
                      Domicilio: {sol.direccion}
                    </div>
                    {sol.notas_vulnerabilidad && (
                      <p className="text-xs text-slate-500 italic">
                        &ldquo;{sol.notas_vulnerabilidad}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <select
                      aria-label="Seleccionar padrino"
                      value={chosenPadrinoId}
                      onChange={(e) =>
                        setSelectedPadrinoForApproval({
                          ...selectedPadrinoForApproval,
                          [sol.id]: e.target.value,
                        })
                      }
                      className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium rounded-lg px-2.5 py-2"
                    >
                      {padrinosAcreditados.map((pad) => (
                        <option key={pad.id} value={pad.id}>
                          {pad.nombre} ({pad.credencial_nro}) — {pad.direccion}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        onOpenPhone(chosenPadrinoId);
                        onExecuteAction("aprobar_solicitud_familiar", {
                          participanteId: sol.id,
                          padrinoId: chosenPadrinoId,
                        });
                      }}
                      className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold text-xs px-4 py-2 rounded-full flex items-center justify-center gap-1.5 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Aprobar y asignar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Padron de Padrinos Acreditados */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Padron de Vecinos Padrinos Acreditados ({padrinosAcreditados.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {padrinosAcreditados.map((pad) => {
            const asignadosHoy = asistencias.filter(
              (a) =>
                a.modalidad_elegida === "nivel_1_puerta" &&
                a.padrino_asignado_id === pad.id
            );

            return (
              <div
                key={pad.id}
                className="border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      {pad.nombre} ({pad.edad} anos)
                    </span>
                    <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      Credencial {pad.credencial_nro}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    DNI {pad.dni} • {pad.direccion}
                  </div>
                  {pad.notas_vulnerabilidad && (
                    <p className="text-xs text-slate-500">{pad.notas_vulnerabilidad}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Acompanamientos activos hoy:{" "}
                    <strong className="text-slate-900">{asignadosHoy.length}</strong>
                  </span>
                  <button
                    onClick={() => onOpenPhone(pad.id)}
                    className="text-[#004b87] hover:underline font-semibold"
                  >
                    Ver chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
