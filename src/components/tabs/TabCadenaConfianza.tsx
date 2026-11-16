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
}

export default function TabCadenaConfianza({
  snapshot,
  onExecuteAction,
  onOpenPhone,
  onOpenFamiliarModal,
  onOpenPadrinoModal,
}: TabConfianzaProps) {
  const [selectedPadrinoForApproval, setSelectedPadrinoForApproval] = useState<
    Record<string, string>
  >({});

  const { participantes, asistencias } = snapshot;

  const padrinosAcreditados = participantes.filter(
    (p) => p.rol === "padrino" && p.acreditado_por_club
  );
  const solicitudesPendientes = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "pendiente_aprobacion"
  );

  return (
    <div className="space-y-4">
      {/* Cabecera de acciones */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Cadena de Confianza y Derivaciones Familiares
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Los familiares solicitan la incorporacion de un adulto mayor y la coordinadora le asigna un vecino padrino acreditado con DNI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenFamiliarModal}
            className="bg-[#004b87] hover:bg-[#003966] text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Inscribir abuelo / familiar</span>
          </button>

          <button
            onClick={onOpenPadrinoModal}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acreditar nuevo padrino</span>
          </button>
        </div>
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5"
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
                    Saldo Sancor:{" "}
                    <strong className="text-slate-900">
                      ${pad.saldo_reintegro_sancor.toLocaleString("es-AR")}
                    </strong>{" "}
                    ({asignadosHoy.length} acomp. hoy)
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
