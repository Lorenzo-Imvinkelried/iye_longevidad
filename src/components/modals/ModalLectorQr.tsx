"use client";

import React from "react";
import { Asistencia, Jornada, Participante } from "@/types/domain";
import { QrCode, X } from "lucide-react";

interface ModalQrProps {
  open: boolean;
  onClose: () => void;
  nombreClub: string;
  jornada: Jornada;
  adultosActivos: Participante[];
  asistencias: Asistencia[];
  onValidarParticipante: (participanteId: string) => void;
}

export default function ModalLectorQr({
  open,
  onClose,
  nombreClub,
  jornada,
  adultosActivos,
  asistencias,
  onValidarParticipante,
}: ModalQrProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#a70355]" />
            <h3 className="font-bold text-sm text-slate-900">
              Lector QR de Recepcion en el Club
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Selecciona el participante que ingresa a <strong>{nombreClub}</strong> para validar su asistencia al encuentro:
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {adultosActivos.map((ad) => {
            const asis = asistencias.find((a) => a.participante_id === ad.id);
            const yaValidado = Boolean(asis?.presente_validado_en_club);

            return (
              <button
                key={ad.id}
                disabled={yaValidado}
                onClick={() => onValidarParticipante(ad.id)}
                className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition ${
                  yaValidado
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">{ad.nombre}</div>
                  <div className="text-[11px] text-slate-500">
                    DNI {ad.dni} • {jornada.hora_encuentro_club} hs
                  </div>
                </div>
                <span className="text-xs font-bold text-[#0a4494]">
                  {yaValidado ? "Ya validado" : "Validar QR"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
