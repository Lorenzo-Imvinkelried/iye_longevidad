"use client";

import React, { useState } from "react";
import { Participante, SystemSnapshot } from "@/types/domain";
import {
  getParticipanteAvatarUrl,
  getParticipantRewardInfo,
} from "@/lib/domain-helpers";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gift,
  MessageSquare,
  PlusCircle,
  Search,
  Send,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";

interface TabRecompensasProps {
  snapshot: SystemSnapshot;
  loadingAction: string | null;
  onExecuteAction: (action: string, payload?: Record<string, unknown>) => void;
  onOpenPhone: (participanteId: string) => void;
  onOpenPerfilParticipante: (participanteId: string) => void;
}

const ESCALA_NIVELES = [
  {
    nivel: "Nivel 1 • Bronce",
    rango: "250 a 499 pts ($2.500+)",
    descuento: "15% OFF",
    lugares: "Farmacias de Barrio + Buffet y Cuota del Club",
  },
  {
    nivel: "Nivel 2 • Plata Activa",
    rango: "500 a 999 pts ($5.000+)",
    descuento: "25% OFF",
    lugares: "Farmacias Sancor + Supermercados Barriales + 50% Talleres Club",
  },
  {
    nivel: "Nivel 3 • Oro Vital",
    rango: "1.000 a 1.499 pts ($10.000+)",
    descuento: "35% OFF",
    lugares: "Farmacias, Opticas y Ortopedia + Reintegro Coseguros Sancor",
  },
  {
    nivel: "Nivel 4 • Embajador",
    rango: "1.500+ pts ($15.000+)",
    descuento: "45% OFF",
    lugares: "Red Sancor Completa + Club 100% Bonificado + Bono Mensual",
  },
];

export default function TabRecompensas({
  snapshot,
  loadingAction,
  onExecuteAction,
  onOpenPhone,
  onOpenPerfilParticipante,
}: TabRecompensasProps) {
  const [filtroRol, setFiltroRol] = useState<"todos" | "adulto_mayor" | "padrino">(
    "todos"
  );
  const [busqueda, setBusqueda] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { circuito, jornada, participantes, asistencias } = snapshot;

  const asistenciasEvento = asistencias.filter(
    (a) => a.jornada_id === jornada.id
  );

  const beneficiarios: Participante[] = participantes
    .filter((p) => {
      if (p.rol === "coordinador" || p.estado_alta !== "activo") return false;
      if (filtroRol !== "todos" && p.rol !== filtroRol) return false;
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.dni.toLowerCase().includes(q) ||
        p.direccion.toLowerCase().includes(q)
      );
    })
    .sort(
      (a, b) =>
        Number(b.saldo_reintegro_sancor || 0) -
        Number(a.saldo_reintegro_sancor || 0)
    );

  const totalCreditosPesos = beneficiarios.reduce(
    (acc, p) => acc + Math.max(0, Number(p.saldo_reintegro_sancor || 0)),
    0
  );
  const totalPuntos = Math.round(totalCreditosPesos / 10);

  return (
    <div className="space-y-3">
      {/* Cabecera: Resumen del programa de puntos, creditos y descuentos */}
      <div className="bg-white rounded-xl p-3.5 border border-[#eaeced] shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Gift className="w-4 h-4 text-[#a70355]" />
            <h2 className="text-sm sm:text-base font-bold text-[#363f48]">
              Billetera de Puntos, Creditos y Descuentos Sancor
            </h2>
            <span className="text-[11px] font-bold bg-[#faf0f5] text-[#a70355] border border-[#e1a9c5] px-2.5 py-0.5 rounded-full">
              Acumulado Red: {totalPuntos.toLocaleString("es-AR")} pts ($
              {totalCreditosPesos.toLocaleString("es-AR")})
            </span>
          </div>
          <p className="text-xs text-[#52606d]">
            Cada actividad validada suma <strong>+250 Puntos (+$2.500 ARS en creditos)</strong> al abuelo asistente (y <strong>+400 pts / +$4.000</strong> al vecino padrino), acreditados automaticamente y enviados por WhatsApp.
          </p>
        </div>
      </div>

      {/* Escala compacta de Descuentos Actuales y Futuros en Comercios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {ESCALA_NIVELES.map((esc, i) => (
          <div
            key={esc.nivel}
            className={`rounded-xl p-2.5 border text-xs flex flex-col justify-between ${
              i === 3
                ? "bg-[#fdf9fb] border-[#e1a9c5]"
                : "bg-white border-[#eaeced]"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-[#363f48]">{esc.nivel}</span>
              <span className="text-[10px] font-extrabold bg-[#a70355] text-white px-2 py-0.5 rounded-full">
                {esc.descuento}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-[#a70355] mt-0.5">
              {esc.rango}
            </div>
            <div className="text-[11px] text-[#52606d] mt-1 leading-snug">
              {esc.lugares}
            </div>
          </div>
        ))}
      </div>

      {/* Barra de filtro por rol y buscador */}
      <div className="bg-white rounded-xl px-3.5 py-2 border border-[#eaeced] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFiltroRol("todos")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filtroRol === "todos"
                ? "bg-[#363f48] text-white"
                : "bg-[#f6f6f7] text-[#52606d] hover:text-[#363f48]"
            }`}
          >
            Todos ({beneficiarios.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroRol("adulto_mayor")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filtroRol === "adulto_mayor"
                ? "bg-[#a70355] text-white"
                : "bg-[#f6f6f7] text-[#52606d] hover:text-[#363f48]"
            }`}
          >
            Abuelos
          </button>
          <button
            type="button"
            onClick={() => setFiltroRol("padrino")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filtroRol === "padrino"
                ? "bg-[#a70355] text-white"
                : "bg-[#f6f6f7] text-[#52606d] hover:text-[#363f48]"
            }`}
          >
            Vecinos Padrinos
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const allExpanded =
                beneficiarios.length > 0 &&
                beneficiarios.every((b) => expandedIds[b.id]);
              if (allExpanded) {
                setExpandedIds({});
              } else {
                const next: Record<string, boolean> = {};
                beneficiarios.forEach((b) => {
                  next[b.id] = true;
                });
                setExpandedIds(next);
              }
            }}
            className="text-[11px] font-semibold text-[#52606d] hover:text-[#a70355] border border-[#eaeced] hover:border-[#e1a9c5] bg-[#f6f6f7] hover:bg-[#fdf9fb] px-2.5 py-1 rounded-full transition"
          >
            {beneficiarios.length > 0 &&
            beneficiarios.every((b) => expandedIds[b.id])
              ? "Contraer todos"
              : "Desplegar todos"}
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#52606d] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border border-[#c4c9cd] rounded-full pl-8 pr-3 py-1 text-xs text-[#363f48] w-48 sm:w-56 focus:outline-none focus:border-[#a70355]"
            />
          </div>
        </div>
      </div>

      {/* Grilla compacta y desplegable de perfiles con sus Puntos, Creditos ($ ARS) y Descuentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 items-start">
        {beneficiarios.map((part, idx) => {
          const reward = getParticipantRewardInfo(part);
          const avatarUrl = getParticipanteAvatarUrl(part, idx);
          const asisHoy = asistenciasEvento.find(
            (a) => a.participante_id === part.id
          );
          const presenteHoy = Boolean(asisHoy?.presente_validado_en_club);
          const isExpanded = Boolean(expandedIds[part.id]);

          return (
            <div
              key={part.id}
              className={`bg-white rounded-xl border transition p-3 flex flex-col gap-2 shadow-2xs ${
                isExpanded
                  ? "border-[#a70355] ring-2 ring-[#a70355]/10"
                  : "border-[#eaeced] hover:border-[#e1a9c5]"
              }`}
            >
              {/* Encabezado compacto: Foto + Nombre + Puntos/Plata (click abre ficha completa) */}
              <div
                onClick={() => onOpenPerfilParticipante(part.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenPerfilParticipante(part.id);
                  }
                }}
                className="flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={avatarUrl}
                    alt={part.nombre}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-xl object-cover border border-[#eaeced] shrink-0 bg-[#f6f6f7]"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#faf0f5] text-[#a70355]">
                        {part.rol === "padrino"
                          ? `Padrino ${part.credencial_nro || ""}`
                          : "Adulto Mayor"}
                      </span>
                      {presenteHoy && (
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Presente</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#363f48] group-hover:text-[#a70355] transition truncate mt-0.5">
                      {part.nombre}
                    </h3>
                    <div className="text-[10px] text-[#52606d] truncate">
                      DNI {part.dni} • {part.edad} anos
                    </div>
                  </div>
                </div>

                {/* Saldo compacto */}
                <div className="text-right bg-[#fdf9fb] border border-[#e1a9c5] rounded-lg px-2 py-1 shrink-0">
                  <div className="text-xs font-extrabold text-[#a70355] flex items-center justify-end gap-1 leading-tight">
                    <Award className="w-3 h-3" />
                    <span>{reward.puntos.toLocaleString("es-AR")} pts</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#363f48] leading-tight mt-0.5">
                    ${reward.creditoPesos.toLocaleString("es-AR")} ARS
                  </div>
                </div>
              </div>

              {/* Resumen compacto en 1 linea: Nivel + Cupon + Progreso */}
              <div className="flex items-center justify-between gap-2 bg-[#f6f6f7] rounded-lg px-2.5 py-1.5 text-[10px]">
                <span className="font-bold text-[#363f48] truncate">
                  {reward.nivelActual} ({reward.descuentoActualPct}% OFF)
                </span>
                <span className="font-mono font-bold text-[#a70355] bg-white border border-[#e1a9c5] px-1.5 py-0.5 rounded shrink-0">
                  {reward.codigoCupon}
                </span>
              </div>

              {/* Detalle desplegable por persona */}
              {isExpanded && (
                <div className="space-y-2.5 pt-1 border-t border-[#eaeced]">
                  {/* Descuentos actuales disponibles en distintos lugares */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#52606d] flex items-center gap-1">
                      <Store className="w-3 h-3 text-[#a70355]" />
                      <span>Descuentos y Creditos Actuales por Lugar:</span>
                    </div>
                    <div className="space-y-1">
                      {reward.comerciosActuales.map((com) => (
                        <div
                          key={com.lugar}
                          className="p-2 rounded-lg border border-[#eaeced] bg-white flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[#363f48] truncate">
                              {com.lugar}
                            </div>
                            <div className="text-[10px] text-[#52606d] truncate">
                              {com.detalle}
                            </div>
                          </div>
                          <span className="font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                            {com.beneficio}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Barra de progreso hacia proximo descuento futuro */}
                  <div className="p-2.5 rounded-xl bg-[#fdf9fb] border border-[#f4e1eb] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#a70355]">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>
                          {reward.proximoNivel
                            ? `Proximo: ${reward.proximoNivel}`
                            : "Nivel Maximo Desbloqueado"}
                        </span>
                      </span>
                      <span>{reward.progresoPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#f4e1eb] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#a70355] rounded-full transition-all"
                        style={{ width: `${reward.progresoPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#52606d] leading-snug">
                      {reward.proximoBeneficioResumen}
                    </p>
                  </div>

                  {/* Acciones rapidas (Canjear en comercio / Sumar actividad / Enviar por WhatsApp) */}
                  <div className="pt-1.5 border-t border-[#eaeced] flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={loadingAction === "ajustar_recompensa"}
                        onClick={() =>
                          onExecuteAction("ajustar_recompensa", {
                            participanteId: part.id,
                            deltaPesos: 2500,
                            motivo: `Asistencia validada en ${circuito.nombre_club}`,
                            enviarWhatsApp: true,
                          })
                        }
                        title="Acreditar +250 pts (+$2.500) y enviar aviso por WhatsApp"
                        className="bg-[#faf0f5] hover:bg-[#a70355] text-[#a70355] hover:text-white border border-[#e1a9c5] font-semibold px-2.5 py-1 rounded-full transition inline-flex items-center gap-1"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>+250 pts</span>
                      </button>

                      {reward.creditoPesos >= 2500 && (
                        <button
                          type="button"
                          disabled={loadingAction === "ajustar_recompensa"}
                          onClick={() =>
                            onExecuteAction("ajustar_recompensa", {
                              participanteId: part.id,
                              deltaPesos: -2500,
                              motivo: "Farmacia y Supermercado Adherido Sancor",
                              enviarWhatsApp: true,
                            })
                          }
                          title="Simular canje de $2.500 en Farmacia/Comercio y enviar comprobante por WhatsApp"
                          className="bg-white hover:bg-slate-100 text-[#363f48] border border-[#c4c9cd] font-semibold px-2.5 py-1 rounded-full transition inline-flex items-center gap-1"
                        >
                          <ShoppingBag className="w-3 h-3 text-[#a70355]" />
                          <span>Canjear $2.500</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={loadingAction === "ajustar_recompensa"}
                      onClick={() =>
                        onExecuteAction("ajustar_recompensa", {
                          participanteId: part.id,
                          deltaPesos: 0,
                          motivo: "Resumen de Beneficios Sancor",
                          enviarWhatsApp: true,
                        })
                      }
                      title="Enviar resumen de puntos y descuentos actuales al WhatsApp"
                      className="text-[#a70355] hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Enviar a WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pie compacto: Boton desplegar/contraer + accesos rapidos */}
              <div className="pt-1.5 border-t border-[#eaeced] flex items-center justify-between gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => toggleExpand(part.id)}
                  className="font-semibold text-[#a70355] hover:underline inline-flex items-center gap-1"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Ocultar detalle</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Ver descuentos y acciones</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPerfilParticipante(part.id)}
                    className="text-[#52606d] hover:text-[#363f48] font-medium"
                  >
                    Ficha
                  </button>
                  <span className="text-[#c4c9cd]">|</span>
                  <button
                    type="button"
                    onClick={() => onOpenPhone(part.id)}
                    className="text-[#363f48] hover:text-[#a70355] font-semibold inline-flex items-center gap-0.5"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
