"use client";

import React, { useEffect, useState } from "react";
import { SEED_IDS, SystemSnapshot } from "@/types/domain";
import HeaderInstitucional, { TabId } from "@/components/layout/HeaderInstitucional";
import TabMonitorCircuito from "@/components/tabs/TabMonitorCircuito";
import TabRecepcionClub from "@/components/tabs/TabRecepcionClub";
import TabCadenaConfianza from "@/components/tabs/TabCadenaConfianza";
import TabMetricasImpacto from "@/components/tabs/TabMetricasImpacto";
import ModalLectorQr from "@/components/modals/ModalLectorQr";
import ModalDerivacionFamiliar from "@/components/modals/ModalDerivacionFamiliar";
import ModalAcreditarPadrino from "@/components/modals/ModalAcreditarPadrino";
import SimuladorWhatsApp from "@/components/SimuladorWhatsApp";
import { X } from "lucide-react";

export default function DashboardCoordinador({
  initialSnapshot,
}: {
  initialSnapshot: SystemSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<SystemSnapshot>(initialSnapshot);
  const [activeTab, setActiveTab] = useState<TabId>("tab1_monitor");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>(SEED_IDS.rosa);
  const [simulatorOpenMobile, setSimulatorOpenMobile] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [familiarModalOpen, setFamiliarModalOpen] = useState<boolean>(false);
  const [padrinoModalOpen, setPadrinoModalOpen] = useState<boolean>(false);

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
  ) => {
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
      }
    } catch (error) {
      console.error("Error ejecutando accion:", error);
    } finally {
      setLoadingAction(null);
    }
  };

  const { circuito, jornada, participantes, asistencias } = snapshot;

  const adultosActivos = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );
  const solicitudesPendientes = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "pendiente_aprobacion"
  );
  const alertasPadrinoCaido = asistencias.filter(
    (a) =>
      a.modalidad_elegida === "nivel_1_puerta" &&
      a.estado_padrino === "rechazado_buscando_reemplazo"
  );
  const validadosCount = asistencias.filter((a) => a.presente_validado_en_club).length;

  const handleOpenPhoneInSimulator = (partId: string) => {
    setSelectedPhoneId(partId);
    setSimulatorOpenMobile(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <HeaderInstitucional
        nombreClub={circuito.nombre_club}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertasCount={alertasPadrinoCaido.length}
        validadosCount={validadosCount}
        totalAdultos={adultosActivos.length}
        solicitudesCount={solicitudesPendientes.length}
        loadingReset={loadingAction === "reset_demo"}
        onResetDemo={() => executeCoordinatorAction("reset_demo")}
        onToggleMobileSim={() => setSimulatorOpenMobile(!simulatorOpenMobile)}
      />

      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8">
          {activeTab === "tab1_monitor" && (
            <TabMonitorCircuito
              snapshot={snapshot}
              loadingAction={loadingAction}
              onExecuteAction={executeCoordinatorAction}
              onOpenPhone={handleOpenPhoneInSimulator}
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

        <div
          className={`lg:col-span-4 lg:sticky lg:top-24 h-[720px] ${
            simulatorOpenMobile ? "fixed inset-4 z-50 h-auto" : "hidden lg:block"
          }`}
        >
          {simulatorOpenMobile && (
            <button
              onClick={() => setSimulatorOpenMobile(false)}
              className="lg:hidden absolute -top-3 -right-3 z-50 bg-slate-900 text-white rounded-full p-2 shadow"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <SimuladorWhatsApp
            snapshot={snapshot}
            selectedPhoneId={selectedPhoneId}
            onSelectPhoneId={setSelectedPhoneId}
            onSnapshotUpdate={setSnapshot}
          />
        </div>
      </main>

      <ModalLectorQr
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        nombreClub={circuito.nombre_club}
        jornada={jornada}
        adultosActivos={adultosActivos}
        asistencias={asistencias}
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
    </div>
  );
}
