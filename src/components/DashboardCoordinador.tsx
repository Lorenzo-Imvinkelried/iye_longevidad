"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SEED_IDS, SystemSnapshot } from "@/types/domain";
import {
  getTutorCircuitos,
  getTutorJornadas,
  projectSnapshotForTutor,
} from "@/lib/domain-helpers";
import HeaderInstitucional, { TabId } from "@/components/layout/HeaderInstitucional";
import FooterInstitucional from "@/components/layout/FooterInstitucional";
import PantallaLoginTutor from "@/components/auth/PantallaLoginTutor";
import TabMonitorCircuito from "@/components/tabs/TabMonitorCircuito";
import {
  GlobalLoadingProvider,
  useGlobalLoading,
} from "@/components/modals/ModalCargando";
import { AlertTriangle, X } from "lucide-react";

const TabRecepcionClub = dynamic(
  () => import("@/components/tabs/TabRecepcionClub"),
  { ssr: false }
);
const TabCadenaConfianza = dynamic(
  () => import("@/components/tabs/TabCadenaConfianza"),
  { ssr: false }
);
const TabRecompensas = dynamic(
  () => import("@/components/tabs/TabRecompensas"),
  { ssr: false }
);
const ModalLectorQr = dynamic(
  () => import("@/components/modals/ModalLectorQr"),
  { ssr: false }
);
const ModalDerivacionFamiliar = dynamic(
  () => import("@/components/modals/ModalDerivacionFamiliar"),
  { ssr: false }
);
const ModalAcreditarPadrino = dynamic(
  () => import("@/components/modals/ModalAcreditarPadrino"),
  { ssr: false }
);
const ModalCrearEventoLugar = dynamic(
  () => import("@/components/modals/ModalCrearEventoLugar"),
  { ssr: false }
);
const ModalSuspenderEvento = dynamic(
  () => import("@/components/modals/ModalSuspenderEvento"),
  { ssr: false }
);
const SimuladorWhatsApp = dynamic(
  () => import("@/components/SimuladorWhatsApp"),
  { ssr: false }
);

const SESSION_STORAGE_KEY = "sancor_tutor_session_v2";

const ACTION_LOADING_MESSAGES: Record<
  string,
  { title: string; detail: string }
> = {
  login_tutor: {
    title: "Verificando credenciales...",
    detail: "Validando DNI acreditado y cargando tus eventos...",
  },
  seleccionar_evento: {
    title: "Cargando evento y circuito...",
    detail: "Actualizando mapa, paradas seguras y participantes...",
  },
  registrar_tutor_lugar: {
    title: "Acreditando coordinador y sede...",
    detail: "Guardando credencial, trazado de calles y registro inicial...",
  },
  crear_evento_lugar: {
    title: "Guardando evento y sede...",
    detail: "Calculando ruta segura por calles y registrando el encuentro...",
  },
  actualizar_ruta_circuito: {
    title: "Guardando ruta segura...",
    detail: "Persistiendo paradas y trazado de calles en la base...",
  },
  vincular_abuelo_evento: {
    title: "Sumando adulto mayor al evento...",
    detail: "Verificando disponibilidad horaria y guardando inscripcion...",
  },
  lanzar_convocatoria: {
    title: "Enviando convocatoria por WhatsApp...",
    detail: "Despachando mensajes a los adultos mayores del evento...",
  },
  suspender_emergencia: {
    title: "Suspendiendo actividad...",
    detail: "Enviando aviso por WhatsApp a los abuelos enlistados...",
  },
  reasignar_tutor: {
    title: "Reasignando padrino...",
    detail: "Actualizando acompanamiento y enviando ficha por WhatsApp...",
  },
  frenar_salida: {
    title: "Enviando alerta de espera...",
    detail: "Notificando al adulto mayor para evitar salida sin compania...",
  },
  validar_club: {
    title: "Actualizando presencias...",
    detail: "Registrando asistencia del encuentro en la base...",
  },
  validar_actividad_recompensas: {
    title: "Validando actividad y acreditando puntos...",
    detail: "Sumando puntos/creditos en Supabase y enviando descuentos por WhatsApp...",
  },
  ajustar_recompensa: {
    title: "Actualizando puntos y beneficios...",
    detail: "Guardando saldo en Supabase y enviando comprobante por WhatsApp...",
  },
  actualizar_participante_adulto: {
    title: "Guardando ficha del abuelo...",
    detail: "Actualizando telefono, domicilio y modalidad en la base...",
  },
  aprobar_solicitud_familiar: {
    title: "Aprobando alta de participante...",
    detail: "Activando adulto mayor y asignando padrino responsable...",
  },
  crear_solicitud_familiar: {
    title: "Guardando inscripcion...",
    detail: "Registrando al adulto mayor y verificando horarios...",
  },
  acreditar_padrino: {
    title: "Emitiendo credencial de padrino...",
    detail: "Guardando vecino acreditado en el padron de confianza...",
  },
  reset_demo: {
    title: "Restaurando configuracion inicial...",
    detail: "Sincronizando circuitos y participantes base...",
  },
};

interface SessionData {
  tutorId: string;
  jornadaId?: string;
}

export default function DashboardCoordinador({
  initialSnapshot,
  initialTutorId = null,
  initialJornadaId = null,
}: {
  initialSnapshot: SystemSnapshot;
  initialTutorId?: string | null;
  initialJornadaId?: string | null;
}) {
  return (
    <GlobalLoadingProvider>
      <DashboardCoordinadorInner
        initialSnapshot={initialSnapshot}
        initialTutorId={initialTutorId}
        initialJornadaId={initialJornadaId}
      />
    </GlobalLoadingProvider>
  );
}

function DashboardCoordinadorInner({
  initialSnapshot,
  initialTutorId = null,
  initialJornadaId = null,
}: {
  initialSnapshot: SystemSnapshot;
  initialTutorId?: string | null;
  initialJornadaId?: string | null;
}) {
  const { startTask } = useGlobalLoading();
  const actionInFlightRef = useRef<boolean>(false);

  const [snapshot, setSnapshot] = useState<SystemSnapshot>(initialSnapshot);
  const [loggedInTutorId, setLoggedInTutorId] = useState<string | null>(
    initialTutorId
  );
  const [selectedJornadaId, setSelectedJornadaId] = useState<string | null>(
    initialJornadaId
  );
  const [loginError, setLoginError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("tab1_monitor");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>(SEED_IDS.rosa);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [familiarModalOpen, setFamiliarModalOpen] = useState<boolean>(false);
  const [padrinoModalOpen, setPadrinoModalOpen] = useState<boolean>(false);
  const [crearEventoModalOpen, setCrearEventoModalOpen] = useState<boolean>(false);
  const [suspenderModalOpen, setSuspenderModalOpen] = useState<boolean>(false);

  const saveSession = (tutorId: string, jornadaId?: string | null) => {
    const payload: SessionData = {
      tutorId,
      jornadaId: jornadaId || undefined,
    };
    const encoded = JSON.stringify(payload);
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, encoded);
    } catch {
      // Ignore storage access errors
    }
    try {
      document.cookie = `${SESSION_STORAGE_KEY}=${encodeURIComponent(
        encoded
      )}; path=/; max-age=604800; SameSite=Lax`;
    } catch {
      // Ignore cookie errors
    }
  };

  useEffect(() => {
    try {
      const savedRaw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as SessionData;
        if (parsed?.tutorId && !initialTutorId) {
          setSnapshot((prev) =>
            projectSnapshotForTutor(prev, parsed.tutorId, parsed.jornadaId || null)
          );
          setLoggedInTutorId(parsed.tutorId);
          setSelectedJornadaId(parsed.jornadaId || null);
          saveSession(parsed.tutorId, parsed.jornadaId || null);
          return;
        }
      }
      if (initialTutorId) {
        saveSession(initialTutorId, initialJornadaId);
      }
    } catch {
      // Ignore malformed sessionStorage
    }
  }, [initialTutorId, initialJornadaId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (actionInFlightRef.current) return;
      try {
        const params = new URLSearchParams();
        if (loggedInTutorId) params.set("tutorId", loggedInTutorId);
        if (selectedJornadaId) params.set("jornadaId", selectedJornadaId);
        const query = params.toString() ? `?${params.toString()}` : "";

        const res = await fetch(`/api/state${query}`, { cache: "no-store" });
        if (res.ok && !actionInFlightRef.current) {
          const data = (await res.json()) as SystemSnapshot;
          setSnapshot(data);
        }
      } catch {
        // Ignore transient polling error
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [loggedInTutorId, selectedJornadaId]);

  const executeCoordinatorAction = async (
    actionName: string,
    payload: Record<string, unknown> = {}
  ): Promise<{ ok: boolean; error?: string; snapshot?: SystemSnapshot }> => {
    if (actionInFlightRef.current) {
      return { ok: false, error: "Ya hay una operacion en curso." };
    }
    actionInFlightRef.current = true;
    const msgMeta = ACTION_LOADING_MESSAGES[actionName] || {
      title: "Procesando informacion...",
      detail: "Guardando cambios en el sistema...",
    };
    const stopLoading = startTask(msgMeta.title, msgMeta.detail);
    setLoadingAction(actionName);
    setActionError(null);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionName,
          activeTutorId: loggedInTutorId,
          activeJornadaId: selectedJornadaId || snapshot.jornada.id,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        const msg = data?.error || "No se pudo completar la accion.";
        if (actionName === "login_tutor" || actionName === "registrar_tutor_lugar") {
          setLoginError(msg);
        } else {
          setActionError(msg);
        }
        return { ok: false, error: msg };
      }

      if (data?.warning) {
        setActionError(String(data.warning));
      }

      if (data?.snapshot) {
        const nextSnap = data.snapshot as SystemSnapshot;
        setSnapshot(nextSnap);
        return { ok: true, snapshot: nextSnap };
      }
      return { ok: true };
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error de red ejecutando accion.";
      setActionError(msg);
      return { ok: false, error: msg };
    } finally {
      stopLoading();
      actionInFlightRef.current = false;
      setLoadingAction(null);
    }
  };

  const handleLoginWithClave = async (identificador: string, clave: string) => {
    setLoginError(null);
    const res = await executeCoordinatorAction("login_tutor", {
      identificador,
      clave,
    });
    if (res.ok && res.snapshot) {
      const tutorId = res.snapshot.tutorActivoId;
      const projected = projectSnapshotForTutor(res.snapshot, tutorId);
      setSnapshot(projected);
      setLoggedInTutorId(tutorId);
      setSelectedJornadaId(projected.jornada.id);
      saveSession(tutorId, projected.jornada.id);
    }
  };

  const handleSelectEventoDelTutor = async (jornadaId: string) => {
    setSelectedJornadaId(jornadaId);
    if (loggedInTutorId) {
      saveSession(loggedInTutorId, jornadaId);
    }
    const projected = projectSnapshotForTutor(snapshot, loggedInTutorId, jornadaId);
    setSnapshot(projected);
    await executeCoordinatorAction("seleccionar_evento", {
      tutorId: loggedInTutorId,
      jornadaId,
    });
  };

  const handleLogoutTutor = () => {
    setLoggedInTutorId(null);
    setSelectedJornadaId(null);
    setLoginError(null);
    setActionError(null);
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    try {
      document.cookie = `${SESSION_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
      // Ignore
    }
  };

  const tutores = snapshot.participantes.filter((p) => p.rol === "coordinador");

  if (!loggedInTutorId) {
    return (
      <PantallaLoginTutor
        tutores={tutores}
        circuitos={snapshot.circuitos || [snapshot.circuito]}
        loading={loadingAction === "login_tutor"}
        errorMessage={loginError}
        onLoginConClave={handleLoginWithClave}
      />
    );
  }

  const vistaActual = projectSnapshotForTutor(
    snapshot,
    loggedInTutorId,
    selectedJornadaId
  );
  const { circuito, jornada, circuitos, jornadas, participantes, asistencias } =
    vistaActual;

  const circuitosDelTutor = getTutorCircuitos(
    circuitos || [circuito],
    loggedInTutorId
  );
  const jornadasDelTutor = getTutorJornadas(
    jornadas || [jornada],
    circuitos || [circuito],
    loggedInTutorId
  );
  const tutorActivo =
    participantes.find((p) => p.id === loggedInTutorId) ||
    participantes.find((p) => p.rol === "coordinador");

  const asistenciasEvento = asistencias.filter(
    (a) => a.jornada_id === jornada.id
  );
  const idsDelEvento = new Set(asistenciasEvento.map((a) => a.participante_id));

  const adultosActivos = participantes.filter(
    (p) =>
      p.rol === "adulto_mayor" &&
      p.estado_alta === "activo" &&
      idsDelEvento.has(p.id)
  );
  const solicitudesPendientes = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "pendiente_aprobacion"
  );
  const alertasPadrinoCaido = asistenciasEvento.filter(
    (a) =>
      a.modalidad_elegida === "nivel_1_puerta" &&
      a.estado_padrino === "rechazado_buscando_reemplazo"
  );
  const validadosCount = asistenciasEvento.filter(
    (a) => a.presente_validado_en_club
  ).length;

  const handleOpenPhoneInSimulator = (partId: string) => {
    setSelectedPhoneId(partId);
    setSimulatorOpen(true);
  };

  const lockViewportDesktop =
    activeTab === "tab1_monitor" &&
    jornada.estado !== "suspendida_emergencia" &&
    alertasPadrinoCaido.length === 0;

  return (
    <div
      className={
        lockViewportDesktop
          ? "min-h-screen lg:h-screen bg-[#f6f6f7] text-[#363f48] flex flex-col lg:overflow-hidden"
          : "min-h-screen bg-[#f6f6f7] text-[#363f48] flex flex-col"
      }
    >
      <HeaderInstitucional
        nombreClub={circuito.nombre_club}
        nombreTutorActivo={tutorActivo?.nombre || "Coordinacion Barrial"}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertasCount={alertasPadrinoCaido.length}
        validadosCount={validadosCount}
        totalAdultos={adultosActivos.length}
        solicitudesCount={solicitudesPendientes.length}
        loadingReset={loadingAction === "reset_demo"}
        simulatorOpen={simulatorOpen}
        onResetDemo={async () => {
          const res = await executeCoordinatorAction("reset_demo");
          if (res.ok && res.snapshot) {
            setLoggedInTutorId(SEED_IDS.coordinadoraMarta);
            setSelectedJornadaId(SEED_IDS.jornada);
            saveSession(SEED_IDS.coordinadoraMarta, SEED_IDS.jornada);
          }
        }}
        onToggleSim={() => setSimulatorOpen(!simulatorOpen)}
        onOpenCrearEvento={() => setCrearEventoModalOpen(true)}
        onLogoutTutor={handleLogoutTutor}
      />

      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto px-3 sm:px-5 py-2 flex flex-col gap-2">
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-red-700 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-500 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === "tab1_monitor" && (
            <TabMonitorCircuito
              snapshot={vistaActual}
              loggedInTutorId={loggedInTutorId}
              loadingAction={loadingAction}
              onExecuteAction={executeCoordinatorAction}
              onSelectEvento={handleSelectEventoDelTutor}
              onOpenPhone={handleOpenPhoneInSimulator}
              onOpenFamiliarModal={() => setFamiliarModalOpen(true)}
              onOpenSuspenderModal={() => setSuspenderModalOpen(true)}
            />
          )}

          {activeTab === "tab2_club" && (
            <TabRecepcionClub
              snapshot={vistaActual}
              loadingAction={loadingAction}
              onExecuteAction={executeCoordinatorAction}
              onOpenPhone={handleOpenPhoneInSimulator}
              onOpenQrModal={() => setQrModalOpen(true)}
            />
          )}

          {activeTab === "tab3_confianza" && (
            <TabCadenaConfianza
              snapshot={vistaActual}
              onExecuteAction={executeCoordinatorAction}
              onOpenPhone={handleOpenPhoneInSimulator}
              onOpenFamiliarModal={() => setFamiliarModalOpen(true)}
              onOpenPadrinoModal={() => setPadrinoModalOpen(true)}
            />
          )}

          {activeTab === "tab4_recompensas" && (
            <TabRecompensas
              snapshot={vistaActual}
              loadingAction={loadingAction}
              onExecuteAction={executeCoordinatorAction}
              onOpenPhone={handleOpenPhoneInSimulator}
            />
          )}
        </div>
      </main>

      <FooterInstitucional />

      {simulatorOpen && (
        <aside className="fixed inset-3 sm:inset-auto sm:right-4 sm:bottom-4 sm:top-20 sm:w-[390px] z-40 shadow-2xl rounded-xl">
          <button
            onClick={() => setSimulatorOpen(false)}
            aria-label="Cerrar simulador"
            className="absolute -top-2.5 -right-2.5 z-50 bg-slate-900 hover:bg-slate-800 text-white rounded-full p-1.5 shadow-md border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
          <SimuladorWhatsApp
            snapshot={vistaActual}
            selectedPhoneId={selectedPhoneId}
            onSelectPhoneId={setSelectedPhoneId}
            onSnapshotUpdate={setSnapshot}
          />
        </aside>
      )}

      {qrModalOpen && (
        <ModalLectorQr
          open={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          nombreClub={circuito.nombre_club}
          jornada={jornada}
          adultosActivos={adultosActivos}
          asistencias={asistenciasEvento}
          onValidarParticipante={async (partId) => {
            await executeCoordinatorAction("validar_club", {
              participanteId: partId,
              presente: true,
            });
            setQrModalOpen(false);
          }}
        />
      )}

      {familiarModalOpen && (
        <ModalDerivacionFamiliar
          open={familiarModalOpen}
          onClose={() => setFamiliarModalOpen(false)}
          nombreClub={circuito.nombre_club}
          jornada={jornada}
          jornadas={jornadas || [jornada]}
          circuitos={circuitos || [circuito]}
          participantes={participantes}
          asistencias={asistencias}
          onVincularExistente={async (adultoId) => {
            const res = await executeCoordinatorAction("vincular_abuelo_evento", {
              adultoId,
              jornadaId: jornada.id,
            });
            return { ok: res.ok, error: res.error };
          }}
          onSubmit={async (payload) => {
            const res = await executeCoordinatorAction("crear_solicitud_familiar", {
              payload,
              jornadaId: jornada.id,
            });
            return { ok: res.ok, error: res.error };
          }}
        />
      )}

      {padrinoModalOpen && (
        <ModalAcreditarPadrino
          open={padrinoModalOpen}
          onClose={() => setPadrinoModalOpen(false)}
          onSubmit={async (payload) => {
            const res = await executeCoordinatorAction("acreditar_padrino", {
              payload,
            });
            return { ok: res.ok, error: res.error };
          }}
        />
      )}

      {crearEventoModalOpen && (
        <ModalCrearEventoLugar
          open={crearEventoModalOpen}
          onClose={() => setCrearEventoModalOpen(false)}
          tutorId={tutorActivo?.id || loggedInTutorId}
          circuitosDelTutor={
            circuitosDelTutor.length > 0 ? circuitosDelTutor : [circuito]
          }
          allCircuitos={circuitos || [circuito]}
          jornadasDelTutor={
            jornadasDelTutor.length > 0 ? jornadasDelTutor : [jornada]
          }
          jornadaActualId={jornada.id}
          circuitoActualId={circuito.id}
          participantes={participantes}
          asistencias={asistencias}
          onSelectEvento={handleSelectEventoDelTutor}
          onEditEvento={async (payload) => {
            const res = await executeCoordinatorAction("editar_evento_lugar", {
              payload,
            });
            return { ok: res.ok, error: res.error };
          }}
          onPasarAbuelo={async (payload) => {
            const res = await executeCoordinatorAction("pasar_abuelo_evento", {
              payload,
            });
            return { ok: res.ok, error: res.error };
          }}
          onSubmit={async (payload) => {
            const res = await executeCoordinatorAction("crear_evento_lugar", {
              payload,
            });
            if (res.ok && res.snapshot) {
              setSelectedJornadaId(res.snapshot.jornada.id);
              saveSession(loggedInTutorId, res.snapshot.jornada.id);
            }
            return { ok: res.ok, error: res.error };
          }}
        />
      )}

      {suspenderModalOpen && (
        <ModalSuspenderEvento
          open={suspenderModalOpen}
          onClose={() => setSuspenderModalOpen(false)}
          circuito={circuito}
          jornada={jornada}
          cantidadAbuelos={adultosActivos.length}
          loading={loadingAction === "suspender_emergencia"}
          onConfirm={async (motivo) => {
            await executeCoordinatorAction("suspender_emergencia", {
              motivo,
              jornadaId: jornada.id,
            });
          }}
        />
      )}
    </div>
  );
}
