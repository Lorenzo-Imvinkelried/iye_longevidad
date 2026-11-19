"use client";

import React from "react";
import { Asistencia, Jornada, Participante } from "@/types/domain";
import {
  buildWhatsAppInviteLink,
  WHATSAPP_BOT_DISPLAY_PHONE,
} from "@/lib/whatsapp-cloud";
import { ExternalLink, Printer, QrCode, ShieldCheck, X } from "lucide-react";

interface ModalQrProps {
  open: boolean;
  onClose: () => void;
  nombreClub: string;
  jornada: Jornada;
  adultosActivos: Participante[];
  asistencias: Asistencia[];
  onValidarParticipante: (participanteId: string) => Promise<void> | void;
}

export default function ModalLectorQr({
  open,
  onClose,
  nombreClub,
  jornada,
  adultosActivos,
  asistencias,
}: ModalQrProps) {
  if (!open) return null;

  const presentText = `Presente en ${nombreClub}`;
  const waCheckinUrl = buildWhatsAppInviteLink(presentText);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(
    waCheckinUrl
  )}`;
  const presentesCount = asistencias.filter(
    (a) => a.presente_validado_en_club
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#eaeced] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#eaeced] pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#a70355]" />
            <div>
              <div className="text-[10px] font-bold uppercase text-[#a70355]">
                Cartel para Puerta / Recepcion
              </div>
              <h3 className="font-bold text-sm text-[#363f48]">
                Codigo QR Unico del Evento
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#52606d] hover:text-[#363f48] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ficha imprimible del QR del Evento */}
        <div className="border-2 border-dashed border-[#a70355]/40 rounded-2xl p-4 bg-[#fdf9fb] text-center space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#a70355] bg-white border border-[#f4e1eb] px-3 py-0.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sancor Seguros • Longevidad Activa</span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#363f48]">{nombreClub}</h4>
            <p className="text-xs text-[#52606d]">
              {jornada.actividad_cierre} • {jornada.fecha} ({jornada.hora_encuentro_club} hs)
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#eaeced] inline-block shadow-xs">
            <img
              src={qrImageUrl}
              alt={`Codigo QR de asistencia para ${nombreClub}`}
              width={210}
              height={210}
              className="w-48 h-48 mx-auto"
            />
          </div>

          <p className="text-[11px] text-[#363f48] font-medium max-w-xs mx-auto leading-snug">
            Escanea este QR con la camara del celular al llegar a la puerta para registrar tu <strong>Presente</strong> por WhatsApp ({WHATSAPP_BOT_DISPLAY_PHONE}).
          </p>

          <div className="text-[11px] font-semibold text-[#a70355]">
            Presentes registrados hoy: {presentesCount} / {adultosActivos.length}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#eaeced]">
          <a
            href={waCheckinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#c4c9cd] hover:border-[#a70355] text-[#363f48] hover:text-[#a70355] font-semibold text-xs px-3.5 py-2 rounded-full transition inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Probar link del QR</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold text-xs px-4 py-2 rounded-full transition inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir para la puerta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
