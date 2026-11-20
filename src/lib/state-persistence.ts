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
import {
  CloudApiResult,
  isWhatsAppCloudConfigured,
  sendWhatsAppCloudMessage,
  WhatsAppTemplateSpec,
} from "@/lib/whatsapp-cloud";

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
  const fallback = buildInitialState();
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as SystemSnapshot;
      if (!parsed.circuitos || parsed.circuitos.length === 0) {
        parsed.circuitos = fallback.circuitos;
      }
      if (!parsed.jornadas || parsed.jornadas.length === 0) {
        parsed.jornadas = fallback.jornadas;
      }
      if (!parsed.tutorActivoId) {
        parsed.tutorActivoId = SEED_IDS.coordinadoraMarta;
      }
      parsed.modoConexion = isSupabaseConfigured()
        ? "supabase_realtime"
        : "memoria_reactiva_local";
      parsed.whatsappCloudConfigurado = isWhatsAppCloudConfigured();
      return parsed;
    }
  } catch {
    // Fallback to initial state
  }
  writeState(fallback);
  return fallback;
}

/**
 * Lee todos los circuitos (lugares), jornadas (eventos), participantes y asistencias desde Supabase.
 * La jornada con `updated_at` mas reciente es la jornada activa del panel y del webhook de WhatsApp.
 */
export async function readStateAsync(): Promise<SystemSnapshot> {
  const state = readState();
  const supabase = getSupabaseServerClient();
  if (!supabase) return state;

  try {
    const [circRes, partRes, jorRes, asisRes] = await Promise.all([
      supabase.from("circuitos_barriales").select("*"),
      supabase.from("participantes").select("*"),
      supabase
        .from("jornadas")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("asistencias").select("*"),
    ]);

    if (circRes.data && circRes.data.length > 0) {
      const dbCircuitos = circRes.data as CircuitoBarrial[];
      const mergedMap = new Map<string, CircuitoBarrial>();
      for (const c of state.circuitos) mergedMap.set(c.id, c);
      for (const c of dbCircuitos) {
        if (
          c.id === SEED_IDS.circuito &&
          c.poliza_nro &&
          !c.poliza_nro.includes(SEED_IDS.coordinadoraLaura)
        ) {
          c.poliza_nro = `${c.poliza_nro}|tutor:${SEED_IDS.coordinadoraLaura}`;
        }
        mergedMap.set(c.id, c);
      }
      state.circuitos = Array.from(mergedMap.values());
    }

    if (partRes.data && partRes.data.length > 0) {
      const dbParts = partRes.data.map((row) => ({
        ...(row as Participante),
        saldo_reintegro_sancor: Number(row.saldo_reintegro_sancor || 0),
      }));
      const mergedParts = new Map<string, Participante>();
      for (const p of state.participantes) mergedParts.set(p.id, p);
      for (const p of dbParts) mergedParts.set(p.id, p);
      state.participantes = Array.from(mergedParts.values());
    }

    if (jorRes.data && jorRes.data.length > 0) {
      const dbJornadas: Jornada[] = jorRes.data.map((j) => ({
        ...(j as Jornada),
        monto_reintegro_asistencia: Number(j.monto_reintegro_asistencia || 2500),
        plus_reintegro_padrino: Number(j.plus_reintegro_padrino || 1500),
      }));
      const mergedJor = new Map<string, Jornada>();
      for (const j of state.jornadas) mergedJor.set(j.id, j);
      for (const j of dbJornadas) mergedJor.set(j.id, j);
      state.jornadas = Array.from(mergedJor.values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // La jornada mas recientemente actualizada es la activa
      state.jornada = state.jornadas[0];
      const activeCircuito = state.circuitos.find(
        (c) => c.id === state.jornada.circuito_id
      );
      if (activeCircuito) {
        state.circuito = activeCircuito;
      }
    }

    if (asisRes.data && asisRes.data.length > 0) {
      const dbAsis = asisRes.data as Asistencia[];
      const mergedAsis = new Map<string, Asistencia>();
      for (const a of state.asistencias) mergedAsis.set(a.id, a);
      for (const a of dbAsis) mergedAsis.set(a.id, a);
      state.asistencias = Array.from(mergedAsis.values());

      // Restaurar mensajes de WhatsApp guardados en Supabase (CHAT_V1:...)
      // Ordenamos por updated_at ascendente para que el historial mas reciente de cada participante prevalezca
      const sortedDbAsis = [...dbAsis].sort(
        (a, b) =>
          new Date(a.updated_at || 0).getTime() -
          new Date(b.updated_at || 0).getTime()
      );
      const msgsByParticipant = new Map<string, WhatsAppMessage[]>();
      for (const m of state.mensajes) {
        if (m.id.startsWith("msg-sync-")) continue;
        const arr = msgsByParticipant.get(m.participante_id) || [];
        arr.push(m);
        msgsByParticipant.set(m.participante_id, arr);
      }

      for (const a of sortedDbAsis) {
        if (
          typeof a.codigo_canje_farmacia === "string" &&
          a.codigo_canje_farmacia.startsWith("CHAT_V1:")
        ) {
          try {
            const parsedMsgs = JSON.parse(
              a.codigo_canje_farmacia.slice("CHAT_V1:".length)
            ) as WhatsAppMessage[];
            if (Array.isArray(parsedMsgs)) {
              const cleanMsgs = parsedMsgs.filter(
                (pm) => pm && pm.id && !pm.id.startsWith("msg-sync-")
              );
              msgsByParticipant.set(a.participante_id, cleanMsgs);
            }
          } catch {
            // Ignore malformed chat history
          }
        }
      }

      state.mensajes = Array.from(msgsByParticipant.values()).flat();
      reconcileSimulatorMessagesFromSupabase(state);
    }

    state.modoConexion = "supabase_realtime";
    state.whatsappCloudConfigurado = isWhatsAppCloudConfigured();
    writeState(state);
  } catch (err) {
    console.warn("Lectura desde Supabase omitida (usando estado local):", err);
  }

  return state;
}

function reconcileSimulatorMessagesFromSupabase(state: SystemSnapshot) {
  const activeAsistencias = state.asistencias.filter(
    (a) => a.jornada_id === state.jornada.id
  );
  for (const asis of activeAsistencias) {
    const part = state.participantes.find((p) => p.id === asis.participante_id);
    if (!part) continue;

    // Si ya tiene historial real persistido en CHAT_V1 o ya fue validado en el club, no inventar mensajes sincronizados falsos
    if (
      typeof asis.codigo_canje_farmacia === "string" &&
      asis.codigo_canje_farmacia.startsWith("CHAT_V1:")
    ) {
      continue;
    }
    if (asis.presente_validado_en_club) {
      continue;
    }

    const msgs = state.mensajes.filter((m) => m.participante_id === part.id);
    const hasUserReply = msgs.some((m) => m.sender === "usuario");

    if (asis.modalidad_elegida !== "sin_respuesta" && !hasUserReply) {
      const firstName = part.nombre.split(" ")[0];
      let replyLabel = "Respuesta recibida por WhatsApp";
      let botConfirmation = "";

      if (asis.modalidad_elegida === "nivel_1_puerta") {
        replyLabel = "Pasen a buscarme";
        const pad = state.participantes.find((p) => p.id === asis.padrino_asignado_id);
        botConfirmation =
          asis.estado_padrino === "confirmado" && pad
            ? `Confirmado, ${firstName}. Pasa por tu puerta ${pad.nombre} (Credencial ${pad.credencial_nro}).`
            : `Barbaro, ${firstName}. Ya le avisamos a tu vecino padrino para confirmar.`;
      } else if (asis.modalidad_elegida === "nivel_2_esquina") {
        const parada = state.circuito.paradas_seguras.find(
          (ps) => ps.id === asis.parada_esquina_id
        );
        replyLabel = parada ? parada.nombre_esquina : "Voy a la esquina";
        botConfirmation = parada
          ? `Agendado, ${firstName}. Te esperamos en ${parada.nombre_esquina} (${parada.horario_paso}).`
          : `Agendado, ${firstName}. Parada confirmada.`;
      } else if (asis.modalidad_elegida === "nivel_3_directo") {
        replyLabel = "Voy directo al club";
        botConfirmation = `Excelente, ${firstName}. Te esperamos directamente a las ${state.jornada.hora_encuentro_club} hs en el ${state.circuito.nombre_club}.`;
      } else if (asis.modalidad_elegida === "no_asiste") {
        replyLabel = "No voy hoy";
        botConfirmation = `Entendido, ${firstName}. Registramos que hoy no asistis.`;
      }

      state.mensajes.forEach((m) => {
        if (m.participante_id === part.id && m.buttons) {
          m.buttons = m.buttons.map((b) => ({ ...b, disabled: true }));
        }
      });

      state.mensajes.push({
        id: `msg-sync-usr-${part.id}-${asis.updated_at}`,
        participante_id: part.id,
        telefono: part.telefono,
        sender: "usuario",
        text: replyLabel,
        timestamp: nowTimeStr(),
      });

      if (botConfirmation) {
        state.mensajes.push({
          id: `msg-sync-bot-${part.id}-${asis.updated_at}`,
          participante_id: part.id,
          telefono: part.telefono,
          sender: "bot_sancor",
          text: botConfirmation,
          timestamp: nowTimeStr(),
        });
      }
    }
  }
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
      const seedJornIds = fresh.jornadas.map((j) => j.id);
      const seedCircIds = fresh.circuitos.map((c) => c.id);

      const { data: existingAsis } = await supabase.from("asistencias").select("id");
      if (existingAsis) {
        const extraAsis = existingAsis
          .map((r) => r.id as string)
          .filter((id) => !seedAsisIds.includes(id));
        if (extraAsis.length > 0) {
          await supabase.from("asistencias").delete().in("id", extraAsis);
        }
      }

      const { data: existingJor } = await supabase.from("jornadas").select("id");
      if (existingJor) {
        const extraJor = existingJor
          .map((r) => r.id as string)
          .filter((id) => !seedJornIds.includes(id));
        if (extraJor.length > 0) {
          await supabase.from("jornadas").delete().in("id", extraJor);
        }
      }

      const { data: existingCirc } = await supabase
        .from("circuitos_barriales")
        .select("id");
      if (existingCirc) {
        const extraCirc = existingCirc
          .map((r) => r.id as string)
          .filter((id) => !seedCircIds.includes(id));
        if (extraCirc.length > 0) {
          await supabase.from("circuitos_barriales").delete().in("id", extraCirc);
        }
      }

      const { data: existingParts } = await supabase.from("participantes").select("id");
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
    template?: WhatsAppTemplateSpec;
    fichaSeguridad?: WhatsAppMessage["fichaSeguridad"];
    recompensaSancor?: WhatsAppMessage["recompensaSancor"];
    esAlertaPrioritaria?: boolean;
  }
): Promise<CloudApiResult> {
  state.mensajes.forEach((m) => {
    if (m.participante_id === participante.id && m.buttons) {
      m.buttons = m.buttons.map((b) => ({ ...b, disabled: true }));
    }
  });

  const cloudResult = await sendWhatsAppCloudMessage(
    participante.telefono,
    text,
    options?.buttons,
    options?.template
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
  return cloudResult;
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
    for (const c of state.circuitos) {
      const { error } = await supabase.from("circuitos_barriales").upsert({
        id: c.id,
        nombre_barrio: c.nombre_barrio,
        nombre_club: c.nombre_club,
        direccion_club: c.direccion_club,
        coords_club: c.coords_club,
        poliza_sancor_activa: c.poliza_sancor_activa,
        poliza_nro: c.poliza_nro || "SANCOR-RC-ACTIVA",
        paradas_seguras: c.paradas_seguras,
        ruta_polilinea: c.ruta_polilinea,
      });
      if (error) console.error("[Supabase upsert circuitos_barriales]", error.message);
    }

    for (const j of state.jornadas) {
      const { error } = await supabase.from("jornadas").upsert({
        id: j.id,
        circuito_id: j.circuito_id,
        fecha: j.fecha,
        hora_inicio_caminata: j.hora_inicio_caminata,
        hora_encuentro_club: j.hora_encuentro_club,
        actividad_cierre: j.actividad_cierre,
        monto_reintegro_asistencia: j.monto_reintegro_asistencia,
        plus_reintegro_padrino: j.plus_reintegro_padrino,
        estado: j.estado,
        motivo_suspension: j.motivo_suspension,
        updated_at: j.updated_at,
      });
      if (error) console.error("[Supabase upsert jornadas]", error.message);
    }

    for (const p of state.participantes) {
      const { error } = await supabase.from("participantes").upsert({
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
      if (error) console.error("[Supabase upsert participantes]", error.message);
    }

    for (const a of state.asistencias) {
      const msgsForPart = state.mensajes
        .filter((m) => m.participante_id === a.participante_id)
        .slice(-14);
      const chatPayload =
        msgsForPart.length > 0
          ? `CHAT_V1:${JSON.stringify(msgsForPart)}`
          : a.codigo_canje_farmacia;

      const { error } = await supabase.from("asistencias").upsert({
        id: a.id,
        jornada_id: a.jornada_id,
        participante_id: a.participante_id,
        modalidad_elegida: a.modalidad_elegida,
        parada_esquina_id: a.parada_esquina_id,
        padrino_asignado_id: a.padrino_asignado_id,
        estado_padrino: a.estado_padrino,
        acuse_suspension_leido: a.acuse_suspension_leido,
        presente_validado_en_club: a.presente_validado_en_club,
        codigo_canje_farmacia: chatPayload,
        updated_at: a.updated_at,
      });
      if (error) console.error("[Supabase upsert asistencias]", error.message);
    }
  } catch (err) {
    console.warn("Sincronizacion opcional con Supabase omitida:", err);
  }
}
