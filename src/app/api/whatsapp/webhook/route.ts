import { NextRequest, NextResponse } from "next/server";
import { procesarEventoWebhookWhatsApp } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/webhook
 * Verificacion oficial de Webhook para Meta for Developers (WhatsApp Cloud API v21.0)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "sancor_comunidad_vital_2026";

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
 * Procesa botones tactiles (interactive.button_reply), botones heredados y texto libre.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[Webhook WhatsApp POST]", JSON.stringify(body).slice(0, 500));

    // 1. Formato Estandar Meta Graph API v21.0 (Meta real o Simulador en pantalla)
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (message) {
      const fromPhone: string | undefined = message.from;
      const participanteId: string | undefined = message.participante_id;
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

      // Soporte de respuestas de botones tipo template/legacy
      if (message?.button?.payload || message?.button?.text) {
        const payloadId = message.button.payload || "btn_menu_convocatoria";
        const snapshot = await procesarEventoWebhookWhatsApp({
          fromPhone,
          participanteId,
          buttonId: payloadId,
          buttonTitle: message.button.text,
        });
        return NextResponse.json({
          ok: true,
          processed_via: "meta_graph_legacy_button",
          snapshot,
        });
      }

      // Soporte de texto libre enviado desde el telefono fisico ("hola", "test", "1", "2", "3")
      const textBody: string = (message?.text?.body || "").trim();
      if (textBody) {
        const lower = textBody.toLowerCase();
        let mappedButton = "btn_menu_convocatoria";
        if (lower === "1" || lower.includes("buscar")) {
          mappedButton = "btn_nivel_1";
        } else if (lower === "2" || lower.includes("esquina") || lower.includes("parada")) {
          mappedButton = "btn_nivel_2";
        } else if (lower === "3" || lower.includes("club") || lower.includes("directo")) {
          mappedButton = "btn_nivel_3";
        } else if (lower.includes("cancel") || lower.includes("no voy")) {
          mappedButton = "btn_adulto_cancela";
        }

        const snapshot = await procesarEventoWebhookWhatsApp({
          fromPhone,
          participanteId,
          buttonId: mappedButton,
          buttonTitle: textBody,
        });

        return NextResponse.json({
          ok: true,
          processed_via: "meta_graph_text_message",
          mapped_button: mappedButton,
          snapshot,
        });
      }
    }

    // 2. Fallback directo
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

    return NextResponse.json({ ok: true, note: "Evento procesado (status o sin mensajes)" });
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
