export const SEED_IDS = {
  circuito: "11111111-1111-4111-8111-111111111111",
  circuitoGuadalupe: "11111111-1111-4111-8111-111111111112",
  jornada: "55555555-5555-4555-8555-555555555001",
  jornadaGuadalupe: "55555555-5555-4555-8555-555555555002",
  coordinadoraMarta: "22222222-2222-4222-8222-222222222200",
  tutorRoberto: "22222222-2222-4222-8222-222222222201",
  padrinoCarlos: "33333333-3333-4333-8333-333333333104",
  padrinoHector: "33333333-3333-4333-8333-333333333108",
  rosa: "44444444-4444-4444-8444-444444444001",
  nelida: "44444444-4444-4444-8444-444444444002",
  jorge: "44444444-4444-4444-8444-444444444003",
  hilda: "44444444-4444-4444-8444-444444444004",
  oscar: "44444444-4444-4444-8444-444444444005",
  ernestoPendiente: "44444444-4444-4444-8444-444444444006",
};

export interface Coords {
  lat: number;
  lng: number;
}

export interface ParadaSegura {
  id: string;
  nombre_esquina: string;
  lat: number;
  lng: number;
  horario_paso: string;
  estado_veredas: string;
  tiene_rampa: boolean;
  iluminacion_ok: boolean;
}

export interface CircuitoBarrial {
  id: string;
  nombre_barrio: string;
  nombre_club: string;
  direccion_club: string;
  coords_club: Coords;
  poliza_sancor_activa: boolean;
  poliza_nro?: string;
  paradas_seguras: ParadaSegura[];
  ruta_polilinea: [number, number][];
}

export type RolParticipante = "adulto_mayor" | "padrino" | "coordinador";
export type NivelAutonomia = 1 | 2 | 3;
export type EstadoAlta = "pendiente_aprobacion" | "activo";

export interface Participante {
  id: string;
  nombre: string;
  edad: number;
  dni: string;
  telefono: string;
  rol: RolParticipante;
  direccion: string;
  coords_domicilio: Coords;
  nivel_autonomia_habitual: NivelAutonomia;
  padrino_preferido_id: string | null;
  acreditado_por_club: boolean;
  credencial_nro: string | null;
  saldo_reintegro_sancor: number;
  contacto_familiar_nombre: string;
  contacto_familiar_tel: string;
  notas_vulnerabilidad?: string;
  estado_alta: EstadoAlta;
}

export type EstadoJornada =
  | "programada"
  | "convocando"
  | "en_marcha"
  | "en_club"
  | "finalizada"
  | "suspendida_emergencia";

export interface Jornada {
  id: string;
  circuito_id: string;
  fecha: string;
  hora_inicio_caminata: string;
  hora_encuentro_club: string;
  actividad_cierre: string;
  monto_reintegro_asistencia: number;
  plus_reintegro_padrino: number;
  estado: EstadoJornada;
  motivo_suspension: string | null;
  updated_at: string;
}

export type ModalidadElegida =
  | "sin_respuesta"
  | "nivel_1_puerta"
  | "nivel_2_esquina"
  | "nivel_3_directo"
  | "no_asiste";

export type EstadoPadrino =
  | "no_aplica"
  | "esperando_confirmacion"
  | "confirmado"
  | "rechazado_buscando_reemplazo"
  | "sin_padrino_frenado";

export interface Asistencia {
  id: string;
  jornada_id: string;
  participante_id: string;
  modalidad_elegida: ModalidadElegida;
  parada_esquina_id: string | null;
  padrino_asignado_id: string | null;
  estado_padrino: EstadoPadrino;
  acuse_suspension_leido: boolean;
  presente_validado_en_club: boolean;
  codigo_canje_farmacia: string | null;
  updated_at: string;
}

export interface WhatsAppReplyButton {
  id: string;
  title: string;
  variant?: "primary" | "success" | "danger" | "warning" | "neutral";
  disabled?: boolean;
}

export interface FichaSeguridadData {
  padrinoNombre: string;
  credencialNro: string;
  dni: string;
  horarioPuerta: string;
  clubAcreditador: string;
}

export interface RecompensaSancorData {
  montoAcreditado: number;
  plusPadrinazgo?: number;
  saldoTotal: number;
  codigoCanje: string;
}

export interface WhatsAppMessage {
  id: string;
  participante_id: string;
  telefono: string;
  sender: "bot_sancor" | "usuario";
  text: string;
  timestamp: string;
  buttons?: WhatsAppReplyButton[];
  fichaSeguridad?: FichaSeguridadData;
  recompensaSancor?: RecompensaSancorData;
  esAlertaPrioritaria?: boolean;
  cloudApiDispatched?: boolean;
}

export interface WebhookEventLog {
  id: string;
  timestamp: string;
  actor: string;
  evento: string;
  detalle: string;
  tipo: "info" | "success" | "warning" | "danger";
}

export interface SystemSnapshot {
  circuito: CircuitoBarrial;
  jornada: Jornada;
  circuitos: CircuitoBarrial[];
  jornadas: Jornada[];
  tutorActivoId: string;
  participantes: Participante[];
  asistencias: Asistencia[];
  mensajes: WhatsAppMessage[];
  logs: WebhookEventLog[];
  modoConexion: "supabase_realtime" | "memoria_reactiva_local";
  whatsappCloudConfigurado: boolean;
}
