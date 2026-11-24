"use client";

import React from "react";
import {
  Asistencia,
  CircuitoBarrial,
  Jornada,
  Participante,
} from "@/types/domain";
import { getJornadaCupoMaximo } from "@/lib/domain-helpers";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Play,
  Plus,
  Users,
  X,
} from "lucide-react";

interface ModalIniciarActividadProps {
  open: boolean;
  onClose: () => void;
  jornadasDelTutor: Jornada[];
  circuitos: CircuitoBarrial[];
  participantes: Participante[];
  asistencias: Asistencia[];
  onIniciarEvento: (jornadaId: string) => void;
  onCrearNuevoEvento: () => void;
}

export default function ModalIniciarActividad({
  open,
  onClose,
  jornadasDelTutor,
  circuitos,
  participantes,
  asistencias,
  onIniciarEvento,
  onCrearNuevoEvento,
}: ModalIniciarActividadProps) {
  if (!open) return null;

  const adultosActivosIds = new Set(
    participantes
      .filter((p) => p.rol === "adulto_mayor" && p.estado_alta === "activo")
      .map((p) => p.id)
  );

  return (
    <div
      className="fixed inset-0 z-[720] bg-slate-900/60 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-[#eaeced] flex flex-col gap-4 max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eaeced] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#faf0f5] border border-[#f4e1eb] text-[#a70355] flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#363f48]">
                Iniciar Actividad
              </h3>
              <p className="text-xs text-[#52606d]">
                Elegi un evento y lugar guardado para abrir el mapa de monitoreo, o crea uno nuevo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#52606d] hover:text-[#363f48] p-1"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2.5 pr-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#52606d]">
              Eventos y lugares guardados ({jornadasDelTutor.length})
            </span>
          </div>

          {jornadasDelTutor.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-[#c4c9cd] bg-[#f6f6f7] text-xs text-[#52606d]">
              Todavia no tenes eventos guardados. Crea tu primer evento y lugar abajo.
            </div>
          ) : (
            <div className="space-y-2">
              {jornadasDelTutor.map((j) => {
                const circ = circuitos.find((c) => c.id === j.circuito_id);
                const abuelosCount = asistencias.filter(
                  (a) =>
                    a.jornada_id === j.id &&
                    adultosActivosIds.has(a.participante_id)
                ).length;
                const cupoMax = getJornadaCupoMaximo(j);
                const cupoLleno = abuelosCount >= cupoMax;

                return (
                  <div
                    key={j.id}
                    className="rounded-xl border border-[#eaeced] hover:border-[#a70355] bg-white hover:bg-[#fdf9fb] p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-[#363f48] truncate">
                          {circ?.nombre_club || "Sede barrial"}
                        </h4>
                        <span
                          className={`text-[10px] font-bold border px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${
                            cupoLleno
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-[#faf0f5] text-[#a70355] border-[#f4e1eb]"
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          <span>
                            {abuelosCount} / {cupoMax} abuelos
                            {cupoLleno ? " (Cupo lleno)" : ""}
                          </span>
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-[#52606d]">
                        {j.actividad_cierre}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#52606d]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#a70355]" />
                          <span>{circ?.direccion_club || "Direccion registrada"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#a70355]" />
                          <span>{j.fecha}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#a70355]" />
                          <span>{j.hora_inicio_caminata} hs</span>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onIniciarEvento(j.id)}
                      className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold text-xs px-4 py-2 rounded-full transition inline-flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <span>Iniciar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#eaeced] flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onCrearNuevoEvento}
            className="w-full sm:w-auto border border-[#a70355] text-[#a70355] hover:bg-[#faf0f5] font-bold text-xs px-4 py-2 rounded-full transition inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear nuevo evento o lugar</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-full border border-[#c4c9cd] text-[#52606d] text-xs font-medium hover:text-[#363f48]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
