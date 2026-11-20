"use client";

import React, { useState } from "react";
import { CircuitoBarrial, SEED_IDS, SystemSnapshot } from "@/types/domain";
import {
  formatDistanceMeters,
  getDistanceMeters,
  getParticipanteAvatarUrl,
  getTutorCircuitos,
  isSeniorNearForWalking,
} from "@/lib/domain-helpers";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";

interface TabConfianzaProps {
  snapshot: SystemSnapshot;
  onExecuteAction: (action: string, payload?: Record<string, unknown>) => void;
  onOpenPhone: (participanteId: string) => void;
  onOpenPerfilParticipante: (participanteId: string) => void;
  onOpenFamiliarModal: () => void;
  onOpenPadrinoModal: () => void;
}

export default function TabCadenaConfianza({
  snapshot,
  onExecuteAction,
  onOpenPhone,
  onOpenPerfilParticipante,
  onOpenFamiliarModal,
  onOpenPadrinoModal,
}: TabConfianzaProps) {
  const [selectedPadrinoForApproval, setSelectedPadrinoForApproval] = useState<
    Record<string, string>
  >({});
  const [filtroSedeId, setFiltroSedeId] = useState<string>("todas");
  const [collapsedSedes, setCollapsedSedes] = useState<Record<string, boolean>>(
    {}
  );
  const [busqueda, setBusqueda] = useState<string>("");

  const {
    circuito,
    jornada,
    circuitos,
    jornadas,
    participantes,
    asistencias,
    tutorActivoId,
  } = snapshot;

  const todasLasSedes: CircuitoBarrial[] =
    getTutorCircuitos(circuitos || [circuito], tutorActivoId).length > 0
      ? getTutorCircuitos(circuitos || [circuito], tutorActivoId)
      : circuitos || [circuito];

  const todosLosAdultosActivos = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );
  const padrinosAcreditados = participantes.filter(
    (p) => p.rol === "padrino" && p.acreditado_por_club
  );
  const solicitudesPendientes = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "pendiente_aprobacion"
  );

  const getAdultosDeSede = (sedeId: string) => {
    const jornadasDeSede = (jornadas || [jornada])
      .filter((j) => j.circuito_id === sedeId)
      .map((j) => j.id);
    const partIds = new Set(
      asistencias
        .filter((a) => jornadasDeSede.includes(a.jornada_id))
        .map((a) => a.participante_id)
    );
    return todosLosAdultosActivos.filter((ad) => {
      if (!partIds.has(ad.id)) return false;
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        ad.nombre.toLowerCase().includes(q) ||
        ad.direccion.toLowerCase().includes(q) ||
        ad.dni.toLowerCase().includes(q) ||
        ad.telefono.toLowerCase().includes(q)
      );
    });
  };

  const sedesOrdenadas = [...todasLasSedes].sort((a, b) => {
    if (a.id === circuito.id) return -1;
    if (b.id === circuito.id) return 1;
    return 0;
  });

  const sedesMostradas =
    filtroSedeId === "todas"
      ? sedesOrdenadas
      : sedesOrdenadas.filter((s) => s.id === filtroSedeId);

  const toggleCollapseSede = (sedeId: string) => {
    setCollapsedSedes((prev) => ({ ...prev, [sedeId]: !prev[sedeId] }));
  };

  return (
    <div className="space-y-2.5">
      {/* Barra superior compacta con filtro de sedes, buscador y botones */}
      <div className="bg-white rounded-xl px-3.5 py-2.5 border border-[#eaeced] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-[#363f48] mr-1">
            Agrupar por Sede:
          </span>
          <button
            type="button"
            onClick={() => setFiltroSedeId("todas")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition border ${
              filtroSedeId === "todas"
                ? "bg-[#363f48] text-white border-[#363f48]"
                : "bg-[#f6f6f7] text-[#52606d] border-[#eaeced] hover:text-[#363f48]"
            }`}
          >
            Todas las sedes ({todasLasSedes.length})
          </button>
          {sedesOrdenadas.map((s) => {
            const count = getAdultosDeSede(s.id).length;
            const active = filtroSedeId === s.id;
            const isCurrentActiveSede = s.id === circuito.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFiltroSedeId(s.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition border inline-flex items-center gap-1 max-w-[260px] ${
                  active
                    ? "bg-[#a70355] text-white border-[#a70355]"
                    : isCurrentActiveSede
                    ? "bg-[#faf0f5] text-[#a70355] border-[#a70355] font-bold"
                    : "bg-white text-[#363f48] border-[#c4c9cd] hover:border-[#a70355]"
                }`}
              >
                <span className="truncate">{s.nombre_club}</span>
                {isCurrentActiveSede && (
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full shrink-0 ${
                      active
                        ? "bg-white text-[#a70355]"
                        : "bg-[#a70355] text-white"
                    }`}
                  >
                    Activa
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-1.5 rounded-full ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#faf0f5] text-[#a70355]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#52606d] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar abuelo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border border-[#c4c9cd] rounded-full pl-8 pr-3 py-1 text-xs text-[#363f48] w-40 sm:w-48 focus:outline-none focus:border-[#a70355]"
            />
          </div>

          <button
            onClick={onOpenFamiliarModal}
            className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Sumar abuelo</span>
          </button>

          <button
            onClick={onOpenPadrinoModal}
            className="border border-[#a70355] text-[#a70355] hover:bg-[#a70355] hover:text-white font-semibold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>+ Padrino</span>
          </button>
        </div>
      </div>

      {/* Grilla principal de un vistazo: Izquierda (8 cols) Abuelos agrupados por Sede | Derecha (4 cols) Padrinos y Solicitudes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        {/* Columna izquierda (8 cols): Grupos de abuelos por Sede */}
        <div className="lg:col-span-8 space-y-2.5">
          {sedesMostradas.map((sede) => {
            const adultosSede = getAdultosDeSede(sede.id);
            const isCollapsed = Boolean(collapsedSedes[sede.id]);
            const isActiveSede = sede.id === circuito.id;

            return (
              <div
                key={sede.id}
                className={`bg-white rounded-2xl overflow-hidden transition ${
                  isActiveSede
                    ? "border-2 border-[#a70355] ring-4 ring-[#a70355]/10 shadow-md"
                    : "border border-[#eaeced] opacity-90 hover:opacity-100 shadow-2xs"
                }`}
              >
                {/* Cabecera del grupo de la sede */}
                <div
                  onClick={() => toggleCollapseSede(sede.id)}
                  className={`flex items-center justify-between gap-2 cursor-pointer transition ${
                    isActiveSede
                      ? "px-4 py-3 bg-[#a70355] text-white"
                      : "px-3.5 py-2 bg-[#f6f6f7] border-b border-[#eaeced] hover:bg-[#faf0f5]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isActiveSede && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-white text-[#a70355] px-2.5 py-0.5 rounded-full shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#a70355] animate-pulse" />
                            <span>Sede Activa Actualmente</span>
                          </span>
                        )}
                        <h3
                          className={`font-bold truncate ${
                            isActiveSede
                              ? "text-sm sm:text-base text-white"
                              : "text-xs sm:text-sm text-[#363f48]"
                          }`}
                        >
                          {sede.nombre_club}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActiveSede
                              ? "bg-white/20 text-white border border-white/30"
                              : "bg-white text-[#52606d] border border-[#c4c9cd]"
                          }`}
                        >
                          {adultosSede.length}{" "}
                          {adultosSede.length === 1 ? "abuelo" : "abuelos"}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          isActiveSede ? "text-pink-100" : "text-[#52606d]"
                        }`}
                      >
                        {sede.direccion_club} • {sede.nombre_barrio}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Colapsar o expandir sede"
                    className={`p-1 rounded-full ${
                      isActiveSede
                        ? "text-white hover:bg-white/15"
                        : "text-[#52606d] hover:text-[#363f48]"
                    }`}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {!isCollapsed && (
                  <div className={isActiveSede ? "p-3.5 bg-[#fdf9fb]/50" : "p-2.5"}>
                    {adultosSede.length === 0 ? (
                      <div className="py-3 text-center text-xs text-[#52606d]">
                        Sin abuelos vinculados en esta sede con ese filtro.
                      </div>
                    ) : (
                      <div
                        className={`grid grid-cols-1 sm:grid-cols-2 ${
                          isActiveSede ? "xl:grid-cols-2 gap-2.5" : "xl:grid-cols-3 gap-2"
                        }`}
                      >
                        {adultosSede.map((adulto, idx) => {
                          const padrinoPref = participantes.find(
                            (p) => p.id === adulto.padrino_preferido_id
                          );
                          const avatarUrl = getParticipanteAvatarUrl(
                            adulto,
                            idx
                          );
                          const distMeters = getDistanceMeters(
                            adulto.coords_domicilio,
                            sede.coords_club
                          );
                          const distFormatted =
                            formatDistanceMeters(distMeters);
                          const canWalk = isSeniorNearForWalking(
                            adulto.coords_domicilio,
                            sede.coords_club
                          );

                          // Otros centros a los que tambien asiste este abuelo
                          const otrasSedesDelAbuelo = todasLasSedes.filter(
                            (os) =>
                              os.id !== sede.id &&
                              getAdultosDeSede(os.id).some(
                                (a) => a.id === adulto.id
                              )
                          );

                          return (
                            <div
                              key={`${sede.id}-${adulto.id}`}
                              onClick={() => onOpenPerfilParticipante(adulto.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onOpenPerfilParticipante(adulto.id);
                                }
                              }}
                              className={`rounded-xl transition flex flex-col justify-between cursor-pointer group ${
                                isActiveSede
                                  ? "border-2 border-[#e1a9c5] p-3 bg-white shadow-xs hover:border-[#a70355] gap-2"
                                  : "border border-[#eaeced] p-2.5 bg-[#f6f6f7]/40 hover:bg-white hover:border-[#a70355]/50 gap-1.5"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <img
                                  src={avatarUrl}
                                  alt={adulto.nombre}
                                  width={isActiveSede ? 48 : 40}
                                  height={isActiveSede ? 48 : 40}
                                  className={`${
                                    isActiveSede ? "w-12 h-12" : "w-10 h-10"
                                  } rounded-xl object-cover border border-[#eaeced] shrink-0 bg-white`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`font-bold text-[#363f48] truncate ${
                                        isActiveSede ? "text-sm" : "text-xs"
                                      }`}
                                    >
                                      {adulto.nombre}
                                    </span>
                                    <span className="text-[11px] font-medium text-[#52606d] shrink-0">
                                      {adulto.edad} anos
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#52606d] truncate">
                                    {adulto.direccion}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                        canWalk
                                          ? "bg-white text-[#363f48] border-[#eaeced]"
                                          : "bg-amber-50 text-amber-800 border-amber-200"
                                      }`}
                                      title={
                                        canWalk
                                          ? "Apto para ir caminando a Parada Segura"
                                          : "Mayor a 1 km: solo Puerta a Puerta o Directo"
                                      }
                                    >
                                      <MapPin className="w-2.5 h-2.5 text-[#a70355]" />
                                      <span>{distFormatted}</span>
                                    </span>

                                    <span className="text-[10px] font-bold bg-[#faf0f5] text-[#a70355] px-1.5 py-0.5 rounded-full">
                                      {!canWalk &&
                                      adulto.nivel_autonomia_habitual === 2
                                        ? "Puerta / Directo"
                                        : adulto.nivel_autonomia_habitual === 1
                                        ? "Puerta a puerta"
                                        : adulto.nivel_autonomia_habitual === 2
                                        ? "Esquina"
                                        : "Directo"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-1.5 border-t border-[#eaeced] flex items-center justify-between gap-1 text-[10px] text-[#52606d]">
                                <span className="truncate font-semibold text-[#52606d] group-hover:text-[#a70355] transition">
                                  {otrasSedesDelAbuelo.length > 0
                                    ? `+${otrasSedesDelAbuelo.length} otra sede • Ver ficha`
                                    : "Ver ficha y editar"}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPhone(adulto.id);
                                  }}
                                  className="text-[#a70355] hover:underline font-bold inline-flex items-center gap-0.5 shrink-0"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Chat</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Columna derecha (4 cols): Padrinos Acreditados + Solicitudes Familiares */}
        <div className="lg:col-span-4 space-y-2.5">
          {/* Padron de Padrinos Acreditados compacto */}
          <div className="bg-white rounded-xl border border-[#eaeced] overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2 bg-[#f6f6f7] border-b border-[#eaeced] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#363f48]">
                Vecinos Padrinos ({padrinosAcreditados.length})
              </h3>
              <span className="text-[10px] text-[#52606d]">
                Click para ver ficha / editar
              </span>
            </div>

            <div className="divide-y divide-[#eaeced]">
              {padrinosAcreditados.map((pad, idx) => {
                const asignadosHoy = asistencias.filter(
                  (a) =>
                    a.modalidad_elegida === "nivel_1_puerta" &&
                    a.padrino_asignado_id === pad.id
                );
                const distPad = formatDistanceMeters(
                  getDistanceMeters(pad.coords_domicilio, circuito.coords_club)
                );

                return (
                  <div
                    key={pad.id}
                    onClick={() => onOpenPerfilParticipante(pad.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenPerfilParticipante(pad.id);
                      }
                    }}
                    className="p-2.5 flex items-center justify-between gap-2.5 hover:bg-[#fdf9fb] transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getParticipanteAvatarUrl(pad, idx)}
                        alt={pad.nombre}
                        width={38}
                        height={38}
                        className="w-9.5 h-9.5 rounded-xl object-cover border border-[#eaeced] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#363f48] group-hover:text-[#a70355] transition truncate">
                            {pad.nombre}
                          </span>
                          <span className="text-[10px] font-bold bg-[#faf0f5] text-[#a70355] px-1.5 py-0.5 rounded">
                            {pad.credencial_nro}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#52606d] truncate">
                          {pad.direccion} • <strong>A {distPad}</strong>
                        </div>
                        <div className="text-[10px] text-[#52606d]">
                          Acompana hoy:{" "}
                          <strong className="text-[#363f48]">
                            {asignadosHoy.length}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPhone(pad.id);
                      }}
                      className="border border-[#c4c9cd] hover:border-[#a70355] text-[#363f48] hover:text-[#a70355] text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition"
                    >
                      Chat
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Solicitudes de familiares para inscribir abuelos al centro */}
          <div className="bg-white rounded-xl border border-[#eaeced] overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2.5 bg-[#f6f6f7] border-b border-[#eaeced] space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#363f48] leading-snug">
                Solicitudes de Familiares para Inscribir Abuelos en{" "}
                <span className="text-[#a70355]">{circuito.nombre_club}</span> (
                {solicitudesPendientes.length})
              </h3>
              <p className="text-[10px] text-[#52606d] leading-snug">
                Pedidos enviados por hijos o nietos para sumar un adulto mayor a este centro y asignarle un padrino.
              </p>
            </div>

            {solicitudesPendientes.length === 0 ? (
              <div className="p-3.5 text-center text-[11px] text-[#52606d]">
                Sin solicitudes pendientes de aprobacion.
              </div>
            ) : (
              <div className="divide-y divide-[#eaeced]">
                {solicitudesPendientes.map((sol, idx) => {
                  const chosenPadrinoId =
                    selectedPadrinoForApproval[sol.id] ||
                    SEED_IDS.padrinoCarlos;

                  return (
                    <div key={sol.id} className="p-3 space-y-2 text-xs">
                      <div className="flex items-start gap-2.5">
                        <img
                          src={getParticipanteAvatarUrl(sol, idx)}
                          alt={sol.nombre}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-xl object-cover border border-[#eaeced] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-[#363f48] truncate">
                            {sol.nombre} ({sol.edad}a)
                          </div>
                          <div className="text-[10px] text-[#52606d] truncate">
                            {sol.direccion} • Fam: {sol.contacto_familiar_nombre}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label="Seleccionar padrino"
                          value={chosenPadrinoId}
                          onChange={(e) =>
                            setSelectedPadrinoForApproval({
                              ...selectedPadrinoForApproval,
                              [sol.id]: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 bg-[#f6f6f7] border border-[#c4c9cd] text-[#363f48] text-[11px] font-medium rounded-lg px-2 py-1"
                        >
                          {padrinosAcreditados.map((pad) => (
                            <option key={pad.id} value={pad.id}>
                              {pad.nombre} ({pad.credencial_nro})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            onOpenPhone(chosenPadrinoId);
                            onExecuteAction("aprobar_solicitud_familiar", {
                              participanteId: sol.id,
                              padrinoId: chosenPadrinoId,
                            });
                          }}
                          className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold text-[11px] px-3 py-1 rounded-full flex items-center gap-1 shrink-0 transition"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Aprobar e inscribir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
