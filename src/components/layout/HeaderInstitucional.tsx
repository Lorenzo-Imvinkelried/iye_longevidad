"use client";

import React from "react";
import { RefreshCw, Smartphone } from "lucide-react";

export type TabId = "tab1_monitor" | "tab2_club" | "tab3_confianza" | "tab4_impacto";

interface HeaderProps {
  nombreClub: string;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  alertasCount: number;
  validadosCount: number;
  totalAdultos: number;
  solicitudesCount: number;
  loadingReset: boolean;
  simulatorOpen: boolean;
  onResetDemo: () => void;
  onToggleSim: () => void;
}

export default function HeaderInstitucional({
  nombreClub,
  activeTab,
  onSelectTab,
  alertasCount,
  validadosCount,
  totalAdultos,
  solicitudesCount,
  loadingReset,
  simulatorOpen,
  onResetDemo,
  onToggleSim,
}: HeaderProps) {
  const tabs: { id: TabId; label: string; badge?: string; isAlert?: boolean }[] = [
    {
      id: "tab1_monitor",
      label: "1. Mapa y Monitoreo",
      badge: alertasCount > 0 ? `${alertasCount} alerta` : undefined,
      isAlert: alertasCount > 0,
    },
    {
      id: "tab2_club",
      label: "2. Recepcion en el Club",
      badge: `${validadosCount}/${totalAdultos}`,
    },
    {
      id: "tab3_confianza",
      label: "3. Padrinos y Familiares",
      badge: solicitudesCount > 0 ? `${solicitudesCount} pendiente` : undefined,
    },
    {
      id: "tab4_impacto",
      label: "4. Impacto Sancor",
    },
  ];

  return (
    <header className="bg-[#003b6f] text-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-sky-200 truncate">
            Sancor Seguros / Sancor Salud • {nombreClub}
          </div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
            Panel de Coordinacion Barrial
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onResetDemo}
            disabled={loadingReset}
            className="bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReset ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline sm:inline">Reiniciar demo</span>
            <span className="sm:hidden">Reiniciar</span>
          </button>

          <button
            onClick={onToggleSim}
            title="Abrir o cerrar Simulador de WhatsApp"
            className={`text-[11px] sm:text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 border ${
              simulatorOpen
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-white/10 hover:bg-white/20 border-white/15 text-sky-100"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{simulatorOpen ? "Ocultar" : "Simulador"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-white/10">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id)}
              className={`px-3 sm:px-4 py-2 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                active
                  ? "border-white text-white bg-white/10"
                  : "border-transparent text-sky-100/80 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    t.isAlert
                      ? "bg-red-600 text-white"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
