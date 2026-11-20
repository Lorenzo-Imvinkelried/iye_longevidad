"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Participante,
  SEED_IDS,
  SystemSnapshot,
  WhatsAppMessage,
  WhatsAppReplyButton,
} from "@/types/domain";
import BurbujaMensaje from "@/components/whatsapp/BurbujaMensaje";
import { useGlobalLoading } from "@/components/modals/ModalCargando";
import { Code2, Phone, Send, Smartphone } from "lucide-react";

interface SimuladorProps {
  snapshot: SystemSnapshot;
  selectedPhoneId: string;
  onSelectPhoneId: (id: string) => void;
  onSnapshotUpdate: (newSnapshot: SystemSnapshot) => void;
}

export default function SimuladorWhatsApp({
  snapshot,
  selectedPhoneId,
  onSelectPhoneId,
  onSnapshotUpdate,
}: SimuladorProps) {
  const { withLoading } = useGlobalLoading();
  const sendingRef = useRef<boolean>(false);
  const [sendingButtonId, setSendingButtonId] = useState<string | null>(null);
  const [showWebhookInspector, setShowWebhookInspector] = useState<boolean>(false);
  const [lastWebhookPayload, setLastWebhookPayload] = useState<Record<string, unknown> | null>(
    null
  );
  const [manualText, setManualText] = useState<string>("");
  const [sendingManual, setSendingManual] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const participanteActual: Participante =
    snapshot.participantes.find((p) => p.id === selectedPhoneId) ||
    snapshot.participantes.find((p) => p.id === SEED_IDS.rosa) ||
    snapshot.participantes[0];

  const mensajesChat: WhatsAppMessage[] = snapshot.mensajes.filter(
    (m) => m.participante_id === participanteActual?.id
  );

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajesChat.length, selectedPhoneId]);

  const hasPendingAction = (partId: string): boolean => {
    const msgs = snapshot.mensajes.filter((m) => m.participante_id === partId);
    const lastBotMsg = [...msgs].reverse().find((m) => m.sender === "bot_sancor");
    if (!lastBotMsg || !lastBotMsg.buttons) return false;
    return lastBotMsg.buttons.some((b) => !b.disabled);
  };

  const handleTouchInteractiveButton = async (btn: WhatsAppReplyButton) => {
    if (btn.disabled || sendingButtonId || sendingRef.current) return;
    sendingRef.current = true;
    setSendingButtonId(btn.id);

    const metaGraphV21WebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_SANCOR_SALUD_2026",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "5493424000000",
                  phone_number_id: "109283746510293",
                },
                contacts: [
                  {
                    profile: { name: participanteActual.nombre },
                    wa_id: participanteActual.telefono.replace(/[^0-9]/g, ""),
                  },
                ],
                messages: [
                  {
                    from: participanteActual.telefono.replace(/[^0-9]/g, ""),
                    participante_id: participanteActual.id,
                    id: `wamid.${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: "interactive",
                    interactive: {
                      type: "button_reply",
                      button_reply: {
                        id: btn.id,
                        title: btn.title,
                      },
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    setLastWebhookPayload(metaGraphV21WebhookPayload);

    try {
      await withLoading(
        "Enviando respuesta de WhatsApp...",
        `Procesando "${btn.title}" y actualizando el mapa del evento...`,
        async () => {
          const res = await fetch("/api/whatsapp/webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metaGraphV21WebhookPayload),
          });
          const data = await res.json();
          if (data?.snapshot) {
            onSnapshotUpdate(data.snapshot);
          }
        }
      );
    } catch (error) {
      console.error("Error disparando webhook:", error);
    } finally {
      sendingRef.current = false;
      setSendingButtonId(null);
    }
  };

  const handleSendManualMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualText.trim();
    if (!trimmed || !participanteActual || sendingManual || sendingRef.current) return;
    setSendingManual(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enviar_mensaje_manual",
          participanteId: participanteActual.id,
          texto: trimmed,
        }),
      });
      const data = await res.json();
      if (data?.snapshot) {
        onSnapshotUpdate(data.snapshot);
        setManualText("");
      }
    } catch (error) {
      console.error("Error enviando mensaje manual:", error);
    } finally {
      setSendingManual(false);
    }
  };

  const quickPhones = [
    {
      id: SEED_IDS.rosa,
      shortLabel: "Rosa (74)",
      roleBadge: "Puerta a puerta",
    },
    {
      id: SEED_IDS.padrinoCarlos,
      shortLabel: "Carlos",
      roleBadge: "Padrino #104",
    },
    {
      id: SEED_IDS.jorge,
      shortLabel: "Jorge (71)",
      roleBadge: "Parada segura",
    },
  ];

  const otrosParticipantes = snapshot.participantes.filter(
    (p) =>
      p.rol !== "coordinador" &&
      p.estado_alta === "activo" &&
      !quickPhones.some((q) => q.id === p.id)
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Selector de telefono */}
      <div className="bg-slate-800 text-white p-3.5 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wide">
              WhatsApp en Tiempo Real
            </span>
          </div>

          <button
            onClick={() => setShowWebhookInspector(!showWebhookInspector)}
            className="px-2 py-1 rounded text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1"
          >
            <Code2 className="w-3 h-3" />
            <span>JSON Webhook</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {quickPhones.map((qp) => {
            const isSelected = selectedPhoneId === qp.id;
            const pending = hasPendingAction(qp.id);
            return (
              <button
                key={qp.id}
                onClick={() => onSelectPhoneId(qp.id)}
                className={`relative px-2.5 py-2 rounded-lg text-left transition border ${
                  isSelected
                    ? "bg-[#008069] border-emerald-400 text-white"
                    : "bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {pending && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                  </span>
                )}
                <div className="text-xs font-bold truncate">{qp.shortLabel}</div>
                <div className="text-[10px] opacity-80 truncate">{qp.roleBadge}</div>
              </button>
            );
          })}
        </div>

        <select
          aria-label="Seleccionar otro participante"
          value={selectedPhoneId}
          onChange={(e) => onSelectPhoneId(e.target.value)}
          className="mt-2 w-full bg-slate-700 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 border border-slate-600 focus:outline-none"
        >
          <option value={SEED_IDS.rosa}>Celular de Rosa Martinez (Puerta a puerta)</option>
          <option value={SEED_IDS.padrinoCarlos}>
            Celular de Carlos Gomez (Padrino #104)
          </option>
          <option value={SEED_IDS.jorge}>Celular de Jorge Molina (Parada segura)</option>
          {otrosParticipantes.map((p) => (
            <option key={p.id} value={p.id}>
              Celular de {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Cabecera de WhatsApp */}
      <div className="bg-[#008069] text-white px-3.5 py-2.5 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm leading-tight">
            {participanteActual.nombre}
          </div>
          <div className="text-[11px] text-emerald-100">
            Bot Oficial • WhatsApp en Tiempo Real ({participanteActual.telefono})
          </div>
        </div>
        <a
          href={`tel:${participanteActual.telefono}`}
          title="Llamar al participante"
          className="p-1.5 rounded-full hover:bg-white/10 transition"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>

      {/* Sub-barra con saldo del titular del telefono */}
      <div className="bg-slate-100 border-b border-slate-200 px-3.5 py-1.5 text-[11px] text-slate-700 flex items-center justify-between">
        <span>
          Titular: <strong>{participanteActual.nombre}</strong>
        </span>
        <span className="font-semibold text-slate-700">
          {participanteActual.rol === "padrino"
            ? `Padrino ${participanteActual.credencial_nro || ""}`
            : "Adulto mayor"}
        </span>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#efeae2]">
        {mensajesChat.map((msg) => (
          <BurbujaMensaje
            key={msg.id}
            msg={msg}
            sendingButtonId={sendingButtonId}
            onTouchButton={handleTouchInteractiveButton}
          />
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Barra para enviar mensaje directo por WhatsApp */}
      <form
        onSubmit={handleSendManualMessage}
        className="bg-[#f0f2f5] border-t border-slate-200 px-3 py-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          disabled={sendingManual}
          placeholder={`Escribir mensaje por WhatsApp a ${
            participanteActual?.nombre?.split(" ")[0] || "participante"
          }...`}
          className="flex-1 bg-white text-slate-800 placeholder:text-slate-400 text-xs rounded-full px-3.5 py-2 border border-slate-200 focus:outline-none focus:border-[#008069]"
        />
        <button
          type="submit"
          disabled={!manualText.trim() || sendingManual}
          title="Enviar mensaje al WhatsApp real"
          className="w-8 h-8 rounded-full bg-[#008069] hover:bg-[#006d59] disabled:opacity-40 text-white flex items-center justify-center transition shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {showWebhookInspector && (
        <div className="bg-slate-900 text-emerald-300 p-3 border-t border-slate-700 max-h-40 overflow-y-auto text-[10px] font-mono">
          <div className="flex items-center justify-between text-slate-400 mb-1 font-sans">
            <span>Payload enviado a POST /api/whatsapp/webhook:</span>
            <button onClick={() => setShowWebhookInspector(false)}>Cerrar</button>
          </div>
          <pre className="whitespace-pre-wrap break-all">
            {lastWebhookPayload
              ? JSON.stringify(lastWebhookPayload, null, 2)
              : "// Toca un boton en el chat para ver el JSON enviado al webhook"}
          </pre>
        </div>
      )}
    </div>
  );
}
