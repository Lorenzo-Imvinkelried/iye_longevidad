"use client";

import React from "react";
import { CalendarPlus, LogOut, RefreshCw, Smartphone } from "lucide-react";
import { getCoordinatorAvatarUrl } from "@/components/auth/PantallaLoginTutor";

export type TabId = "tab1_monitor" | "tab2_club" | "tab3_confianza";

interface HeaderProps {
  nombreClub: string;
  nombreTutorActivo: string;
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
  onOpenCrearEvento: () => void;
  onLogoutTutor: () => void;
}

export default function HeaderInstitucional({
  nombreClub,
  nombreTutorActivo,
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
  onOpenCrearEvento,
  onLogoutTutor,
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
      label: "Recepcion en el Lugar",
      badge: `${validadosCount}/${totalAdultos}`,
    },
    {
      id: "tab3_confianza",
      label: "Lista de Abuelos y Padrinos",
      badge: solicitudesCount > 0 ? `${solicitudesCount}` : undefined,
    },
  ];

  return (
    <header className="bg-white border-b border-[#eaeced] sticky top-0 z-30 shadow-xs">
      {/* Franja superior institucional estilo Sancor Seguros */}
      <div className="bg-[#a70355] text-white text-[11px] font-medium">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-0.5 flex items-center justify-between gap-2">
          <span className="truncate">
            Cuenta activa: <strong>{nombreTutorActivo}</strong> • Sede: {nombreClub}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-pink-100">
              Sancor Seguros • Sancor Salud
            </span>
            <button
              onClick={onLogoutTutor}
              className="text-white hover:text-pink-100 underline font-semibold flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Cambiar cuenta / lugar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navbar principal blanco con logo oficial Sancor Seguros */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/sancor-logo.svg"
            alt="Sancor Seguros"
            width={110}
            height={28}
            className="h-6 sm:h-7 w-auto shrink-0"
          />
          <span className="hidden sm:inline-block h-5 w-px bg-[#eaeced]" />
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={getCoordinatorAvatarUrl(nombreTutorActivo)}
              alt={nombreTutorActivo}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover border border-[#eaeced] shrink-0 hidden sm:block"
            />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-[#363f48] tracking-tight truncate">
                {nombreClub}
              </h1>
              <p className="text-[10px] text-[#52606d] truncate hidden sm:block leading-tight">
                Coordinador: {nombreTutorActivo}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenCrearEvento}
            className="rounded-full bg-[#a70355] hover:bg-[#8c0347] text-white text-[11px] sm:text-xs font-semibold px-3.5 py-1.5 transition flex items-center gap-1.5 shadow-xs"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>+ Nuevo Evento / Lugar</span>
          </button>

          <button
            onClick={onResetDemo}
            disabled={loadingReset}
            aria-label="Reiniciar configuracion inicial"
            title="Reiniciar configuracion inicial"
            className="rounded-full border border-[#c4c9cd] text-[#52606d] hover:border-[#a70355] hover:text-[#a70355] bg-white text-[11px] sm:text-xs font-semibold px-3 py-1.5 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReset ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>

          <button
            onClick={onToggleSim}
            title="Abrir o cerrar Simulador de WhatsApp"
            className={`rounded-full text-[11px] sm:text-xs font-semibold px-3 py-1.5 transition flex items-center gap-1.5 border ${
              simulatorOpen
                ? "bg-[#363f48] border-[#363f48] text-white"
                : "border-[#c4c9cd] text-[#363f48] hover:border-[#a70355] hover:text-[#a70355] bg-white"
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
              className={`px-3 sm:px-4 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                active
                  ? "border-[#a70355] text-[#a70355] bg-white"
                  : "border-transparent text-[#52606d] hover:text-[#a70355]"
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
