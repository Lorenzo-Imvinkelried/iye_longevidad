import { WhatsAppReplyButton } from "@/types/domain";

function cleanEnv(val?: string): string {
  return (val || "").trim().replace(/^["']|["']$/g, "");
}

export function isWhatsAppCloudConfigured(): boolean {
  const token = cleanEnv(process.env.WHATSAPP_TOKEN);
  const phoneId = cleanEnv(process.env.WHATSAPP_PHONE_ID);
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

function buildArgentinaPhoneCandidates(cleanPhone: string): string[] {
  const candidates = new Set<string>([cleanPhone]);
  let rest = "";
  if (cleanPhone.startsWith("549") && cleanPhone.length === 13) {
    rest = cleanPhone.slice(3);
  } else if (
    cleanPhone.startsWith("54") &&
    !cleanPhone.startsWith("549") &&
    cleanPhone.length === 12
  ) {
    rest = cleanPhone.slice(2);
  }

  if (rest.length === 10) {
    candidates.add(`549${rest}`);
    candidates.add(`54${rest}`);
    candidates.add(`54${rest.slice(0, 4)}15${rest.slice(4)}`);
    candidates.add(`54${rest.slice(0, 3)}15${rest.slice(3)}`);
    if (rest.startsWith("11")) {
      candidates.add(`541115${rest.slice(2)}`);
    }
  } else if (cleanPhone.startsWith("54") && !cleanPhone.startsWith("549")) {
    candidates.add(`549${cleanPhone.slice(2)}`);
  }

  return Array.from(candidates);
}

/**
 * Envia un mensaje 1 a 1 por WhatsApp Cloud API Oficial (Meta Graph API v21.0).
 * Soporta automaticamente variantes de numeracion Argentina (549..., 54..., 54+<area>+15+...).
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

  const phoneId = cleanEnv(process.env.WHATSAPP_PHONE_ID);
  const token = cleanEnv(process.env.WHATSAPP_TOKEN);
  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const phoneCandidates = buildArgentinaPhoneCandidates(cleanPhone);

  try {
    let lastRes: Response | null = null;
    for (const candidatePhone of phoneCandidates) {
      const candidatePayload =
        candidatePhone === cleanPhone
          ? payload
          : buildMetaPayload(candidatePhone, bodyText, activeButtons);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(candidatePayload),
      });
      lastRes = res;
      if (res.ok || res.status === 401) {
        break;
      }
    }

    const res = lastRes!;

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let parsedMessage = errBody;
      try {
        const parsedJson = JSON.parse(errBody) as {
          error?: { message?: string; code?: number };
        };
        if (parsedJson?.error?.message) {
          parsedMessage = `${parsedJson.error.message}${parsedJson.error.code ? ` (code ${parsedJson.error.code})` : ""
            }`;
        }
      } catch {
        // Use raw text
      }
      console.error("[WhatsApp Cloud API Error]", res.status, parsedMessage);
      return {
        dispatched: false,
        payload,
        responseStatus: res.status,
        error: `HTTP ${res.status}: ${parsedMessage}`,
      };
    }

    return {
      dispatched: true,
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
