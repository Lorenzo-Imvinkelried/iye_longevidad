"use client";

import React, { useEffect, useState } from "react";
import { SEED_IDS, SystemSnapshot } from "@/types/domain";
import HeaderInstitucional, { TabId } from "@/components/layout/HeaderInstitucional";
import PantallaLoginTutor from "@/components/auth/PantallaLoginTutor";
import TabMonitorCircuito from "@/components/tabs/TabMonitorCircuito";
import TabRecepcionClub from "@/components/tabs/TabRecepcionClub";
import TabCadenaConfianza from "@/components/tabs/TabCadenaConfianza";
import TabMetricasImpacto from "@/components/tabs/TabMetricasImpacto";
import ModalLectorQr from "@/components/modals/ModalLectorQr";
import ModalDerivacionFamiliar from "@/components/modals/ModalDerivacionFamiliar";
import ModalAcreditarPadrino from "@/components/modals/ModalAcreditarPadrino";
import ModalCrearEventoLugar from "@/components/modals/ModalCrearEventoLugar";
import SimuladorWhatsApp from "@/components/SimuladorWhatsApp";
import { X } from "lucide-react";

const SESSION_STORAGE_KEY = "sancor_tutor_logged_in_v1";

export default function DashboardCoordinador({
  initialSnapshot,
}: {
  initialSnapshot: SystemSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<SystemSnapshot>(initialSnapshot);
  const [loggedInTutorId, setLoggedInTutorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("tab1_monitor");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>(SEED_IDS.rosa);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [familiarModalOpen, setFamiliarModalOpen] = useState<boolean>(false);
  const [padrinoModalOpen, setPadrinoModalOpen] = useState<boolean>(false);
  const [crearEventoModalOpen, setCrearEventoModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        setLoggedInTutorId(saved);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as SystemSnapshot;
          setSnapshot(data);
        }
      } catch {
        // Ignore transient polling error
      }
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const executeCoordinatorAction = async (
    actionName: string,
    payload: Record<string, unknown> = {}
  ): Promise<SystemSnapshot | null> => {
    setLoadingAction(actionName);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, ...payload }),
      });
      const data = await res.json();
      if (data?.snapshot) {
        setSnapshot(data.snapshot);
        return data.snapshot as SystemSnapshot;
      }
      return null;
    } catch (error) {
      console.error("Error ejecutando accion:", error);
      return null;
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLoginExistente = async (tutorId: string, jornadaId?: string) => {
    await executeCoordinatorAction("seleccionar_evento", {
      tutorId,
      jornadaId,
    });
    setLoggedInTutorId(tutorId);
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, tutorId);
    } catch {
      // Ignore
    }
  };

  const handleRegistrarNuevoTutor = async (payload: {
    nombreTutor: string;
    dniTutor: string;
    telefonoTutor: string;
    especialidad: string;
    nombreLugar: string;
    direccionLugar: string;
    zonaKey: string;
    actividadInicial: string;
    horaCaminata: string;
    horaEncuentro: string;
  }) => {
    const updated = await executeCoordinatorAction("registrar_tutor_lugar", {
      payload,
    });
    const newTutorId = updated?.tutorActivoId || SEED_IDS.coordinadoraMarta;
    setLoggedInTutorId(newTutorId);
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, newTutorId);
    } catch {
      // Ignore
    }
  };

  const handleLogoutTutor = () => {
    setLoggedInTutorId(null);
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
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
        jornadas={snapshot.jornadas || [snapshot.jornada]}
        loading={
          loadingAction === "seleccionar_evento" ||
          loadingAction === "registrar_tutor_lugar"
        }
        onSelectTutor={handleLoginExistente}
        onRegisterTutor={handleRegistrarNuevoTutor}
      />
    );
  }

  const { circuito, jornada, circuitos, participantes, asistencias } = snapshot;

  const tutorActivo =
    participantes.find((p) => p.id === (loggedInTutorId || snapshot.tutorActivoId)) ||
    participantes.find((p) => p.rol === "coordinador");

  const asistenciasEvento = asistencias.filter(
    (a) => a.jornada_id === jornada.id
  );
  const idsDelEvento = new Set(asistenciasEvento.map((a) => a.participante_id));

  const adultosActivos = participantes.filter(
    (p) =>
      p.rol === "adulto_mayor" &&
      p.estado_alta === "activo" &&
      (idsDelEvento.size === 0 || idsDelEvento.has(p.id))
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

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#363f48] flex flex-col">
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
        onResetDemo={() => executeCoordinatorAction("reset_demo")}
        onToggleSim={() => setSimulatorOpen(!simulatorOpen)}
        onOpenCrearEvento={() => setCrearEventoModalOpen(true)}
        onLogoutTutor={handleLogoutTutor}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 py-3">
        <div>
          {activeTab === "tab1_monitor" && (
            <TabMonitorCircuito
              snapshot={snapshot}
              loadingAction={loadingAction}
              onExecuteAction={executeCoordinatorAction}
              onOpenPhone={handleOpenPhoneInSimulator}
              onOpenFamiliarModal={() => setFamiliarModalOpen(true)}
            />
          )}

          {activeTab === "tab2_club" && (
            <TabRecepcionClub
              snapshot={snapshot}
              loadingAction={loadingAction}
              onExecuteAction={executeCoordinatorAction}
              onOpenPhone={handleOpenPhoneInSimulator}
              onOpenQrModal={() => setQrModalOpen(true)}
            />
          )}

          {activeTab === "tab3_confianza" && (
            <TabCadenaConfianza
              snapshot={snapshot}
              onExecuteAction={executeCoordinatorAction}
              onOpenPhone={handleOpenPhoneInSimulator}
              onOpenFamiliarModal={() => setFamiliarModalOpen(true)}
              onOpenPadrinoModal={() => setPadrinoModalOpen(true)}
            />
          )}

          {activeTab === "tab4_impacto" && <TabMetricasImpacto />}
        </div>
      </main>

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
            snapshot={snapshot}
            selectedPhoneId={selectedPhoneId}
            onSelectPhoneId={setSelectedPhoneId}
            onSnapshotUpdate={setSnapshot}
          />
        </aside>
      )}

      <ModalLectorQr
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        nombreClub={circuito.nombre_club}
        jornada={jornada}
        adultosActivos={adultosActivos}
        asistencias={asistenciasEvento}
        onValidarParticipante={async (partId) => {
          handleOpenPhoneInSimulator(partId);
          await executeCoordinatorAction("validar_club", {
            participanteId: partId,
          });
          setQrModalOpen(false);
        }}
      />

      <ModalDerivacionFamiliar
        open={familiarModalOpen}
        onClose={() => setFamiliarModalOpen(false)}
        nombreClub={circuito.nombre_club}
        onSubmit={async (payload) => {
          await executeCoordinatorAction("crear_solicitud_familiar", { payload });
        }}
      />

      <ModalAcreditarPadrino
        open={padrinoModalOpen}
        onClose={() => setPadrinoModalOpen(false)}
        onSubmit={async (payload) => {
          await executeCoordinatorAction("acreditar_padrino", { payload });
        }}
      />

      <ModalCrearEventoLugar
        open={crearEventoModalOpen}
        onClose={() => setCrearEventoModalOpen(false)}
        tutorId={tutorActivo?.id || SEED_IDS.coordinadoraMarta}
        circuitosDelTutor={circuitos || [circuito]}
        circuitoActualId={circuito.id}
        onSubmit={async (payload) => {
          await executeCoordinatorAction("crear_evento_lugar", { payload });
        }}
      />
    </div>
  );
}
