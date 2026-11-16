import { NextRequest, NextResponse } from "next/server";
import { procesarEventoWebhookWhatsApp } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/webhook
 * Endpoint oficial de verificación de Webhook para Meta for Developers (WhatsApp Cloud API v21.0)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "sancor_comunidad_vital_2026";

  if (mode === "subscribe" && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    {
      status: "ok",
      endpoint: "WhatsApp Cloud API v21.0 Webhook — Sancor Seguros / Salud",
      verify_token_configured: Boolean(expectedToken),
    },
    { status: 200 }
  );
}

/**
 * POST /api/whatsapp/webhook
 * Procesa los eventos de botones táctiles (`type: "interactive"`, `interactive.type: "button_reply"`)
 * provenientes tanto de Meta Graph API v21.0 real como del Simulador de WhatsApp en Pantalla.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Formato Estándar de Meta Graph API v21.0 (usado por Meta real Y por nuestro Simulador)
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (message) {
      const fromPhone: string | undefined = message.from;
      const participanteId: string | undefined = message.participante_id; // metadato opcional del simulador
      const buttonReply = message?.interactive?.button_reply;

      if (buttonReply?.id) {
        const snapshot = await procesarEventoWebhookWhatsApp({
          fromPhone,
          participanteId,
          buttonId: buttonReply.id,
          buttonTitle: buttonReply.title,
        });

        return NextResponse.json({
          ok: true,
          processed_via: "meta_graph_v21_interactive_webhook",
          button_id: buttonReply.id,
          snapshot,
        });
      }
    }

    // 2. Fallback directo si se invoca con { participanteId, buttonId, buttonTitle }
    if (body?.buttonId) {
      const snapshot = await procesarEventoWebhookWhatsApp({
        fromPhone: body.fromPhone,
        participanteId: body.participanteId,
        buttonId: body.buttonId,
        buttonTitle: body.buttonTitle,
      });

      return NextResponse.json({
        ok: true,
        processed_via: "direct_interactive_webhook",
        button_id: body.buttonId,
        snapshot,
      });
    }

    return NextResponse.json({ ok: true, note: "Evento sin acción interactiva" });
  } catch (err: unknown) {
    console.error("Error en /api/whatsapp/webhook:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error interno en webhook",
      },
      { status: 500 }
    );
  }
}
