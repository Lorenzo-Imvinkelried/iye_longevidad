import fs from "fs";
import path from "path";
import {
  Participante,
  SystemSnapshot,
  WebhookEventLog,
  WhatsAppMessage,
  WhatsAppReplyButton,
} from "@/types/domain";
import { buildInitialState } from "@/lib/seed-data";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { isWhatsAppCloudConfigured, sendWhatsAppCloudMessage } from "@/lib/whatsapp-cloud";

const STATE_FILE_PATH = path.join(process.cwd(), ".demo-runtime-state.json");

export function nowTimeStr(): string {
  const now = new Date();
  return now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function formatPesos(amount: number): string {
  return amount.toLocaleString("es-AR");
}

export function readState(): SystemSnapshot {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as SystemSnapshot;
      parsed.modoConexion = isSupabaseConfigured()
        ? "supabase_realtime"
        : "memoria_reactiva_local";
      parsed.whatsappCloudConfigurado = isWhatsAppCloudConfigured();
      return parsed;
    }
  } catch {
    // Fallback to initial state
  }
  const initial = buildInitialState();
  writeState(initial);
  return initial;
}

export function writeState(state: SystemSnapshot): void {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error guardando estado de demo:", err);
  }
}

export function resetState(): SystemSnapshot {
  const fresh = buildInitialState();
  writeState(fresh);
  return fresh;
}

export function addLog(
  state: SystemSnapshot,
  actor: string,
  evento: string,
  detalle: string,
  tipo: WebhookEventLog["tipo"] = "info"
) {
  state.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowTimeStr(),
    actor,
    evento,
    detalle,
    tipo,
  });
  if (state.logs.length > 40) {
    state.logs = state.logs.slice(0, 40);
  }
}

export async function appendBotMessage(
  state: SystemSnapshot,
  participante: Participante,
  text: string,
  options?: {
    buttons?: WhatsAppReplyButton[];
    fichaSeguridad?: WhatsAppMessage["fichaSeguridad"];
    recompensaSancor?: WhatsAppMessage["recompensaSancor"];
    esAlertaPrioritaria?: boolean;
  }
) {
  state.mensajes.forEach((m) => {
    if (m.participante_id === participante.id && m.buttons) {
      m.buttons = m.buttons.map((b) => ({ ...b, disabled: true }));
    }
  });

  const cloudResult = await sendWhatsAppCloudMessage(
    participante.telefono,
    text,
    options?.buttons
  );

  const msg: WhatsAppMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    participante_id: participante.id,
    telefono: participante.telefono,
    sender: "bot_sancor",
    text,
    timestamp: nowTimeStr(),
    buttons: options?.buttons,
    fichaSeguridad: options?.fichaSeguridad,
    recompensaSancor: options?.recompensaSancor,
    esAlertaPrioritaria: options?.esAlertaPrioritaria,
    cloudApiDispatched: cloudResult.dispatched,
  };

  state.mensajes.push(msg);
}

export function appendUserMessage(
  state: SystemSnapshot,
  participante: Participante,
  text: string
) {
  state.mensajes.forEach((m) => {
    if (m.participante_id === participante.id && m.buttons) {
      m.buttons = m.buttons.map((b) => ({ ...b, disabled: true }));
    }
  });

  state.mensajes.push({
    id: `msg-usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    participante_id: participante.id,
    telefono: participante.telefono,
    sender: "usuario",
    text,
    timestamp: nowTimeStr(),
  });
}

export async function syncToSupabaseIfConfigured(state: SystemSnapshot) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    await supabase.from("jornadas").upsert({
      id: state.jornada.id,
      circuito_id: state.jornada.circuito_id,
      fecha: state.jornada.fecha,
      hora_inicio_caminata: state.jornada.hora_inicio_caminata,
      hora_encuentro_club: state.jornada.hora_encuentro_club,
      actividad_cierre: state.jornada.actividad_cierre,
      monto_reintegro_asistencia: state.jornada.monto_reintegro_asistencia,
      plus_reintegro_padrino: state.jornada.plus_reintegro_padrino,
      estado: state.jornada.estado,
      motivo_suspension: state.jornada.motivo_suspension,
      updated_at: new Date().toISOString(),
    });

    for (const a of state.asistencias) {
      await supabase.from("asistencias").upsert({
        id: a.id,
        jornada_id: a.jornada_id,
        participante_id: a.participante_id,
        modalidad_elegida: a.modalidad_elegida,
        parada_esquina_id: a.parada_esquina_id,
        padrino_asignado_id: a.padrino_asignado_id,
        estado_padrino: a.estado_padrino,
        acuse_suspension_leido: a.acuse_suspension_leido,
        presente_validado_en_club: a.presente_validado_en_club,
        codigo_canje_farmacia: a.codigo_canje_farmacia,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("Sincronizacion opcional con Supabase omitida:", err);
  }
}
