"use client";

import React from "react";
import { WhatsAppMessage, WhatsAppReplyButton } from "@/types/domain";
import { CheckCheck, ShieldCheck } from "lucide-react";

function formatWhatsAppText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

interface BurbujaProps {
  msg: WhatsAppMessage;
  sendingButtonId: string | null;
  onTouchButton: (btn: WhatsAppReplyButton) => void;
}

export default function BurbujaMensaje({
  msg,
  sendingButtonId,
  onTouchButton,
}: BurbujaProps) {
  const isBot = msg.sender === "bot_sancor";

  return (
    <div className={`flex flex-col ${isBot ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[92%] rounded-xl px-3.5 py-2.5 shadow-sm ${
          isBot
            ? msg.esAlertaPrioritaria
              ? "bg-red-50 border border-red-300 text-slate-900 rounded-tr-none"
              : "bg-[#d9fdd3] text-slate-900 rounded-tr-none border border-emerald-200"
            : "bg-white text-slate-900 rounded-tl-none border border-slate-200/80"
        }`}
      >
        {isBot && (
          <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-emerald-200/70">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
              {msg.esAlertaPrioritaria ? "Aviso prioritario" : "Bot Oficial"}
            </span>
          </div>
        )}

        <p className="text-[13px] leading-relaxed whitespace-pre-line">
          {formatWhatsAppText(msg.text)}
        </p>

        {msg.fichaSeguridad && (
          <div className="mt-2.5 bg-emerald-50/80 border border-emerald-400 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] uppercase border-b border-emerald-200 pb-1 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Ficha de Seguridad del Padrino</span>
            </div>
            <div className="space-y-1 text-xs text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Nombre:</span>
                <span className="font-semibold text-slate-900">
                  {msg.fichaSeguridad.padrinoNombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credencial:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 rounded">
                  {msg.fichaSeguridad.credencialNro}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DNI validado:</span>
                <span>{msg.fichaSeguridad.dni}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Horario:</span>
                <span className="font-semibold">{msg.fichaSeguridad.horarioPuerta}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          <span>{msg.timestamp}</span>
          {isBot && <CheckCheck className="w-3.5 h-3.5 text-sky-500" />}
        </div>
      </div>

      {isBot && msg.buttons && msg.buttons.length > 0 && (
        <div className="w-[92%] mt-1.5 space-y-1 self-end">
          {msg.buttons.map((btn) => {
            const isSending = sendingButtonId === btn.id;
            const isDisabled = Boolean(btn.disabled || sendingButtonId);

            return (
              <button
                key={btn.id}
                disabled={isDisabled}
                onClick={() => onTouchButton(btn)}
                className={`w-full py-2 px-3 rounded-lg font-semibold text-xs shadow-sm border transition ${
                  isDisabled
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-white hover:bg-slate-50 text-[#008069] border-slate-200 cursor-pointer"
                }`}
              >
                {isSending ? "Enviando..." : btn.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
