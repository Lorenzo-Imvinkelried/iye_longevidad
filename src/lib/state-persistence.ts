import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  Asistencia,
  CircuitoBarrial,
  Jornada,
  Participante,
  SEED_IDS,
  SystemSnapshot,
  WebhookEventLog,
  WhatsAppMessage,
  WhatsAppReplyButton,
} from "@/types/domain";
import { buildInitialState } from "@/lib/seed-data";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { isWhatsAppCloudConfigured, sendWhatsAppCloudMessage } from "@/lib/whatsapp-cloud";

const STATE_FILE_PATH = process.env.VERCEL
  ? path.join("/tmp", ".demo-runtime-state.json")
  : path.join(process.cwd(), ".demo-runtime-state.json");

export function generateUuid(): string {
  return crypto.randomUUID();
}

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

/**
 * Lee el estado compartiendo la fuente de verdad en Supabase cuando esta configurado.
 * Esto permite que un webhook ejecutado en Vercel actualice inmediatamente la UI en Vercel y en localhost.
 */
export async function readStateAsync(): Promise<SystemSnapshot> {
  const state = readState();
  const supabase = getSupabaseServerClient();
  if (!supabase) return state;

  try {
    const [circRes, partRes, jorRes, asisRes] = await Promise.all([
      supabase.from("circuitos_barriales").select("*").limit(1),
      supabase.from("participantes").select("*"),
      supabase
        .from("jornadas")
        .select("*")
        .eq("id", SEED_IDS.jornada)
        .limit(1),
      supabase
        .from("asistencias")
        .select("*")
        .eq("jornada_id", SEED_IDS.jornada),
    ]);

    if (circRes.data && circRes.data.length > 0) {
      state.circuito = circRes.data[0] as CircuitoBarrial;
    }

    if (partRes.data && partRes.data.length > 0) {
      state.participantes = partRes.data.map((row) => ({
        ...(row as Participante),
        saldo_reintegro_sancor: Number(row.saldo_reintegro_sancor || 0),
      }));
    }

    if (jorRes.data && jorRes.data.length > 0) {
      const j = jorRes.data[0];
      state.jornada = {
        ...(j as Jornada),
        monto_reintegro_asistencia: Number(j.monto_reintegro_asistencia || 2500),
        plus_reintegro_padrino: Number(j.plus_reintegro_padrino || 1500),
      };
    }

    if (asisRes.data && asisRes.data.length > 0) {
      state.asistencias = asisRes.data as Asistencia[];
    }

    state.modoConexion = "supabase_realtime";
    state.whatsappCloudConfigurado = isWhatsAppCloudConfigured();
    writeState(state);
  } catch (err) {
    console.warn("Lectura desde Supabase omitida (usando estado local):", err);
  }

  return state;
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

export async function resetStateAsync(): Promise<SystemSnapshot> {
  const fresh = buildInitialState();
  writeState(fresh);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const seedPartIds = fresh.participantes.map((p) => p.id);
      const seedAsisIds = fresh.asistencias.map((a) => a.id);

      // Limpiar registros agregados durante pruebas
      const { data: existingAsis } = await supabase
        .from("asistencias")
        .select("id")
        .eq("jornada_id", SEED_IDS.jornada);
      if (existingAsis) {
        const extraAsis = existingAsis
          .map((r) => r.id as string)
          .filter((id) => !seedAsisIds.includes(id));
        if (extraAsis.length > 0) {
          await supabase.from("asistencias").delete().in("id", extraAsis);
        }
      }

      const { data: existingParts } = await supabase
        .from("participantes")
        .select("id");
      if (existingParts) {
        const extraParts = existingParts
          .map((r) => r.id as string)
          .filter((id) => !seedPartIds.includes(id));
        if (extraParts.length > 0) {
          await supabase.from("participantes").delete().in("id", extraParts);
        }
      }

      await syncToSupabaseIfConfigured(fresh);
    } catch (err) {
      console.warn("Error reseteando datos en Supabase:", err);
    }
  }

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

    for (const p of state.participantes) {
      await supabase.from("participantes").upsert({
        id: p.id,
        nombre: p.nombre,
        edad: p.edad,
        dni: p.dni,
        telefono: p.telefono,
        rol: p.rol,
        direccion: p.direccion,
        coords_domicilio: p.coords_domicilio,
        nivel_autonomia_habitual: p.nivel_autonomia_habitual,
        padrino_preferido_id: p.padrino_preferido_id,
        acreditado_por_club: p.acreditado_por_club,
        credencial_nro: p.credencial_nro,
        saldo_reintegro_sancor: p.saldo_reintegro_sancor,
        contacto_familiar_nombre: p.contacto_familiar_nombre,
        contacto_familiar_tel: p.contacto_familiar_tel,
        notas_vulnerabilidad: p.notas_vulnerabilidad,
        estado_alta: p.estado_alta,
      });
    }

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
