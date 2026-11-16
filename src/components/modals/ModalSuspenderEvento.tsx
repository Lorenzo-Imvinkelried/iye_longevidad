"use client";

import React, { useEffect, useState } from "react";
import { CircuitoBarrial, Jornada } from "@/types/domain";
import { AlertTriangle, Send, X } from "lucide-react";

interface ModalSuspenderProps {
  open: boolean;
  onClose: () => void;
  circuito: CircuitoBarrial;
  jornada: Jornada;
  cantidadAbuelos: number;
  loading: boolean;
  onConfirm: (motivo: string) => Promise<void>;
}

const PLANTILLAS_RAPIDAS = [
  "Hoy no abrimos por lluvia!! Cuidemos la seguridad de todos.",
  "Suspendemos el encuentro de hoy por reparaciones en la sede.",
  "Hoy no se realiza la actividad por alerta meteorologica.",
];

export default function ModalSuspenderEvento({
  open,
  onClose,
  circuito,
  jornada,
  cantidadAbuelos,
  loading,
  onConfirm,
}: ModalSuspenderProps) {
  const [mensaje, setMensaje] = useState(
    "Hoy no abrimos por lluvia!!"
  );

  useEffect(() => {
    if (open) {
      setMensaje("Hoy no abrimos por lluvia!!");
    }
  }, [open, jornada.id]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !mensaje.trim()) return;
    await onConfirm(mensaje.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-[#eaeced] space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#eaeced] pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#bf2020]" />
            <div>
              <div className="text-[10px] font-bold uppercase text-[#bf2020]">
                Confirmar Suspension
              </div>
              <h3 className="font-bold text-sm text-[#363f48]">
                ¿Estas seguro de suspender esta actividad?
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-[#52606d] hover:text-[#363f48]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#f6f6f7] border border-[#eaeced] rounded-xl p-3 text-xs space-y-1">
          <div className="font-bold text-[#363f48]">{circuito.nombre_club}</div>
          <div className="text-[#52606d]">
            Actividad: <strong className="text-[#363f48]">{jornada.actividad_cierre}</strong>
          </div>
          <div className="text-[#52606d]">
            Fecha y hora:{" "}
            <strong className="text-[#363f48]">
              {jornada.fecha} • {jornada.hora_inicio_caminata} hs
            </strong>
          </div>
          <div className="text-[#a70355] font-semibold">
            Destinatarios por WhatsApp: {cantidadAbuelos} abuelo(s) enlistado(s)
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-[#363f48] block mb-1">
              Mensaje para enviar a todos por WhatsApp *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ej: Hoy no abrimos por lluvia!!"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="w-full border border-[#c4c9cd] rounded-xl px-3 py-2 text-[#363f48] focus:outline-none focus:border-[#a70355]"
            />

            <div className="flex flex-wrap gap-1.5 mt-2">
              {PLANTILLAS_RAPIDAS.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setMensaje(tpl)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-[#f6f6f7] hover:bg-[#eaeced] text-[#52606d] border border-[#eaeced] transition"
                >
                  {tpl.slice(0, 38)}...
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#fdf9fb] border border-[#edcddd] rounded-xl p-3 space-y-1 text-[11px] text-[#363f48]">
            <div className="font-bold text-[#a70355] uppercase text-[10px]">
              Vista previa del WhatsApp que recibiran:
            </div>
            <p className="whitespace-pre-line leading-relaxed text-[#52606d]">
              <strong>AVISO DE SUSPENSION — {circuito.nombre_club}:</strong>{" "}
              Se <strong>SUSPENDE</strong> la actividad{" "}
              <strong>&ldquo;{jornada.actividad_cierre}&rdquo;</strong> prevista para el{" "}
              <strong>{jornada.fecha}</strong> a las{" "}
              <strong>{jornada.hora_inicio_caminata} hs</strong>.{"\n"}
              <strong>Mensaje:</strong> {mensaje || "..."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eaeced]">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#c4c9cd] text-[#52606d] font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !mensaje.trim()}
              className="bg-[#bf2020] hover:bg-[#991919] disabled:bg-slate-300 text-white font-semibold px-5 py-2 rounded-full transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? "Enviando avisos..."
                  : "Si, suspender y enviar WhatsApp"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
