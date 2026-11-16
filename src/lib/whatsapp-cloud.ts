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

function buildMetaPayload(
  cleanPhone: string,
  bodyText: string,
  activeButtons: WhatsAppReplyButton[]
): Record<string, unknown> {
  return activeButtons.length > 0
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
            text: "Sancor Seguros / Sancor Salud",
          },
          action: {
            buttons: activeButtons.map((btn) => ({
              type: "reply",
              reply: {
                id: btn.id,
                title: btn.title.slice(0, 20),
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
}

/**
 * Envia un mensaje 1 a 1 por WhatsApp Cloud API Oficial (Meta Graph API v21.0).
 * Soporta automaticamente la variante de numeracion Argentina con y sin el prefijo 9 (549... / 54...).
 */
export async function sendWhatsAppCloudMessage(
  toPhone: string,
  bodyText: string,
  buttons?: WhatsAppReplyButton[]
): Promise<CloudApiResult> {
  const cleanPhone = toPhone.replace(/[^0-9]/g, "");
  const activeButtons = (buttons || []).slice(0, 3);
  const payload = buildMetaPayload(cleanPhone, bodyText, activeButtons);

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
    let res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Si es un numero de Argentina (549...) y Meta lo tiene agendado sin el 9 (54...), reintentar automaticamente
    if (!res.ok && cleanPhone.startsWith("549")) {
      const altPhone = "54" + cleanPhone.slice(3);
      const altPayload = buildMetaPayload(altPhone, bodyText, activeButtons);
      const altRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(altPayload),
      });
      if (altRes.ok) {
        res = altRes;
      }
    }

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
