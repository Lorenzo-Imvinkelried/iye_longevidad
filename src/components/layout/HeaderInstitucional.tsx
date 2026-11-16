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
      label: "Mapa y Monitoreo",
      badge: alertasCount > 0 ? `${alertasCount} alerta` : undefined,
      isAlert: alertasCount > 0,
    },
    {
      id: "tab2_club",
      label: "Recepcion en el Club",
      badge: `${validadosCount}/${totalAdultos}`,
    },
    {
      id: "tab3_confianza",
      label: "Padrinos y Familiares",
      badge: solicitudesCount > 0 ? `${solicitudesCount}` : undefined,
    },
    {
      id: "tab4_impacto",
      label: "Impacto Sancor",
    },
  ];

  return (
    <header className="bg-white border-b border-[#eaeced] sticky top-0 z-30 shadow-xs">
      {/* Franja superior institucional estilo Sancor Seguros */}
      <div className="bg-[#a70355] text-white text-[11px] font-medium">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-1 flex items-center justify-between gap-2">
          <span className="truncate">
            Programa de Longevidad Activa • {nombreClub}
          </span>
          <span className="hidden sm:inline text-pink-100 shrink-0">
            Sancor Seguros • Sancor Salud
          </span>
        </div>
      </div>

      {/* Navbar principal blanco con logo oficial Sancor Seguros */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/sancor-logo.svg"
            alt="Sancor Seguros"
            className="h-7 sm:h-8 w-auto shrink-0"
          />
          <span className="hidden sm:inline-block h-5 w-px bg-[#eaeced]" />
          <h1 className="text-xs sm:text-sm font-bold text-[#363f48] tracking-tight truncate">
            Panel de Coordinacion Barrial
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onResetDemo}
            disabled={loadingReset}
            className="rounded-full border border-[#c4c9cd] text-[#52606d] hover:border-[#0a4494] hover:text-[#0a4494] bg-white text-[11px] sm:text-xs font-semibold px-3 py-1.5 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReset ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Reiniciar demo</span>
            <span className="sm:hidden">Reiniciar</span>
          </button>

          <button
            onClick={onToggleSim}
            title="Abrir o cerrar Simulador de WhatsApp"
            className={`rounded-full text-[11px] sm:text-xs font-semibold px-3.5 py-1.5 transition flex items-center gap-1.5 border ${
              simulatorOpen
                ? "bg-[#a70355] border-[#a70355] text-white"
                : "border-[#a70355] text-[#a70355] hover:bg-[#a70355] hover:text-white bg-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{simulatorOpen ? "Ocultar" : "Simulador"}</span>
          </button>
        </div>
      </div>

      {/* Navegacion horizontal por pestanas */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-[#eaeced] bg-[#fdf9fb]">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id)}
              className={`px-3.5 sm:px-4 py-2 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                active
                  ? "border-[#a70355] text-[#a70355] bg-white"
                  : "border-transparent text-[#52606d] hover:text-[#0a4494]"
              }`}
            >
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.isAlert
                      ? "bg-[#bf2020] text-white"
                      : active
                      ? "bg-[#faf0f5] text-[#a70355]"
                      : "bg-[#eaeced] text-[#38414a]"
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
