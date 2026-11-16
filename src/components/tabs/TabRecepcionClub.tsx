"use client";

import React from "react";
import { SystemSnapshot } from "@/types/domain";
import { CheckCircle2, QrCode } from "lucide-react";

interface TabRecepcionProps {
  snapshot: SystemSnapshot;
  loadingAction: string | null;
  onExecuteAction: (action: string, payload?: Record<string, unknown>) => void;
  onOpenPhone: (participanteId: string) => void;
  onOpenQrModal: () => void;
}

export default function TabRecepcionClub({
  snapshot,
  loadingAction,
  onExecuteAction,
  onOpenPhone,
  onOpenQrModal,
}: TabRecepcionProps) {
  const { circuito, jornada, participantes, asistencias } = snapshot;

  const adultosActivos = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Recepcion en {circuito.nombre_club}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Al validar la asistencia se acreditan{" "}
            <strong>
              ${jornada.monto_reintegro_asistencia.toLocaleString("es-AR")}
            </strong>{" "}
            en farmacias (y{" "}
            <strong>
              +${jornada.plus_reintegro_padrino.toLocaleString("es-AR")}
            </strong>{" "}
            al padrino Nivel 1) y se envia el codigo de canje por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenQrModal}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Lector QR</span>
          </button>

          <button
            onClick={() =>
              onExecuteAction("validar_club", {
                participanteIds: adultosActivos.map((a) => a.id),
              })
            }
            disabled={loadingAction === "validar_club"}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validar todos</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-200">
          {adultosActivos.map((adulto) => {
            const asis = asistencias.find((a) => a.participante_id === adulto.id);
            const padrino = participantes.find(
              (p) =>
                p.id === (asis?.padrino_asignado_id || adulto.padrino_preferido_id)
            );
            const validado = Boolean(asis?.presente_validado_en_club);

            let modalidadTexto = "Sin respuesta aun";
            if (asis?.modalidad_elegida === "nivel_1_puerta") {
              modalidadTexto = `Nivel 1: Con ${padrino?.nombre || "Padrino"} (${
                padrino?.credencial_nro || ""
              })`;
            } else if (asis?.modalidad_elegida === "nivel_2_esquina") {
              const par = circuito.paradas_seguras.find(
                (ps) => ps.id === asis.parada_esquina_id
              );
              modalidadTexto = `Nivel 2: ${par?.nombre_esquina || "Esquina"}`;
            } else if (asis?.modalidad_elegida === "nivel_3_directo") {
              modalidadTexto = "Nivel 3: Directo al club";
            } else if (asis?.modalidad_elegida === "no_asiste") {
              modalidadTexto = "No asiste hoy";
            }

            return (
              <div
                key={adulto.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {adulto.nombre} ({adulto.edad} anos)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {modalidadTexto}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {adulto.direccion} • Saldo acumulado:{" "}
                    <strong className="text-slate-800">
                      ${adulto.saldo_reintegro_sancor.toLocaleString("es-AR")}
                    </strong>
                  </div>
                  {validado && asis?.codigo_canje_farmacia && (
                    <div className="text-xs font-semibold text-emerald-700">
                      Reintegro acreditado • Codigo farmacia:{" "}
                      <span className="font-mono font-bold">
                        {asis.codigo_canje_farmacia}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenPhone(adulto.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg"
                  >
                    Ver chat
                  </button>

                  {validado ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs px-3 py-2 rounded-lg">
                      Presente validado
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onOpenPhone(adulto.id);
                        onExecuteAction("validar_club", {
                          participanteId: adulto.id,
                        });
                      }}
                      disabled={loadingAction === "validar_club"}
                      className="bg-[#004b87] hover:bg-[#003966] text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition"
                    >
                      Validar presencia
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
