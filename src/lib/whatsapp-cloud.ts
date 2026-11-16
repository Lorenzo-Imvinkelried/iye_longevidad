import { WhatsAppReplyButton } from "@/types/domain";

export function isWhatsAppCloudConfigured(): boolean {
  const token = process.env.WHATSAPP_TOKEN || "";
  const phoneId = process.env.WHATSAPP_PHONE_ID || "";
  return (
    Boolean(token) &&
    Boolean(phoneId) &&
    !token.startsWith("EAAGm0PX4ZCpsBA") &&
    phoneId !== "109283746510293"
  );
}

export interface CloudApiResult {
  dispatched: boolean;
  payload: Record<string, unknown>;
  responseStatus?: number;
  error?: string;
}

/**
 * Envía un mensaje 1 a 1 por WhatsApp Cloud API Oficial (Meta Graph API v21.0).
 * Soporta botones táctiles interactivos (`type: "interactive"`, `interactive.type: "button"`).
 */
export async function sendWhatsAppCloudMessage(
  toPhone: string,
  bodyText: string,
  buttons?: WhatsAppReplyButton[]
): Promise<CloudApiResult> {
  const cleanPhone = toPhone.replace(/[^0-9]/g, "");
  const activeButtons = (buttons || []).slice(0, 3); // Meta Graph API permite hasta 3 Reply Buttons por mensaje interactivo

  const payload: Record<string, unknown> =
    activeButtons.length > 0
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: bodyText,
            },
            footer: {
              text: "Nos encontramos al paso • Sancor Seguros / Salud",
            },
            action: {
              buttons: activeButtons.map((btn) => ({
                type: "reply",
                reply: {
                  id: btn.id,
                  title: btn.title.slice(0, 20), // Meta limita el título de Reply Button a 20 chars en API real
                },
              })),
            },
          },
        }
      : {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: {
            preview_url: false,
            body: bodyText,
          },
        };

  if (!isWhatsAppCloudConfigured()) {
    return {
      dispatched: false,
      payload,
    };
  }

  const phoneId = process.env.WHATSAPP_PHONE_ID!;
  const token = process.env.WHATSAPP_TOKEN!;
  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return {
      dispatched: res.ok,
      payload,
      responseStatus: res.status,
    };
  } catch (err: unknown) {
    return {
      dispatched: false,
      payload,
      error: err instanceof Error ? err.message : "Error de red con Meta Graph API",
    };
  }
}
