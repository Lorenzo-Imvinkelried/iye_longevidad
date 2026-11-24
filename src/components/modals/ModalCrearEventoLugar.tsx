"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Asistencia,
  CircuitoBarrial,
  Coords,
  Jornada,
  Participante,
} from "@/types/domain";
import {
  DEFAULT_CUPO_MAXIMO,
  getCircuitoTutoresIds,
  getJornadaCupoMaximo,
  getParticipanteAvatarUrl,
} from "@/lib/domain-helpers";
import SelectorMapaLugar from "@/components/mapa/SelectorMapaLugar";
import {
  ArrowRightLeft,
  Building2,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";

interface ModalEventoProps {
  open: boolean;
  initialView?: "lista" | "crear";
  onClose: () => void;
  tutorId: string;
  circuitosDelTutor: CircuitoBarrial[];
  allCircuitos: CircuitoBarrial[];
  jornadasDelTutor: Jornada[];
  jornadaActualId: string;
  circuitoActualId: string;
  participantes: Participante[];
  asistencias: Asistencia[];
  onSelectEvento: (jornadaId: string) => void;
  onEditEvento: (payload: {
    jornadaId: string;
    nombreClub: string;
    direccionClub: string;
    coordsClub?: Coords | null;
    barrioClub?: string;
    actividad: string;
    fecha: string;
    horaCaminata: string;
    horaEncuentro: string;
    cupoMaximo?: number;
    coordinadoresIds: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  onPasarAbuelo: (payload: {
    adultoId: string;
    fromJornadaId: string;
    toJornadaId: string;
    quitarDeOrigen: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onSubmit: (payload: {
    tutorId: string;
    modoLugar: "existente" | "nuevo";
    circuitoExistenteId?: string;
    nombreNuevoLugar?: string;
    direccionNuevoLugar?: string;
    zonaKey?: string;
    coordsCustom?: Coords | null;
    barrioCustom?: string;
    actividad: string;
    fecha: string;
    horaCaminata: string;
    horaEncuentro: string;
    cupoMaximo: number;
    montoReintegro: number;
    plusPadrino: number;
    incluirAbuelosDelTutor: boolean;
    coCoordinadoresIds: string[];
  }) => Promise<{ ok: boolean; error?: string } | void>;
}

export default function ModalCrearEventoLugar({
  open,
  initialView = "lista",
  onClose,
  tutorId,
  circuitosDelTutor,
  allCircuitos,
  jornadasDelTutor,
  jornadaActualId,
  circuitoActualId,
  participantes,
  asistencias,
  onSelectEvento,
  onEditEvento,
  onPasarAbuelo,
  onSubmit,
}: ModalEventoProps) {
  const submitRef = useRef(false);
  const [vista, setVista] = useState<"lista" | "crear">(initialView);
  const [expandedJornadaId, setExpandedJornadaId] = useState<string | null>(null);
  const [editingJornadaId, setEditingJornadaId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    nombreClub: string;
    direccionClub: string;
    originalDireccionClub: string;
    coordsClub: Coords | null;
    barrioClub?: string;
    actividad: string;
    fecha: string;
    horaCaminata: string;
    horaEncuentro: string;
    cupoMaximo: number;
    coordinadoresIds: string[];
  }>({
    nombreClub: "",
    direccionClub: "",
    originalDireccionClub: "",
    coordsClub: null,
    barrioClub: undefined,
    actividad: "",
    fecha: "",
    horaCaminata: "",
    horaEncuentro: "",
    cupoMaximo: DEFAULT_CUPO_MAXIMO,
    coordinadoresIds: [tutorId],
  });

  const [submitting, setSubmitting] = useState(false);
  const [modoLugar, setModoLugar] = useState<"existente" | "nuevo">("existente");
  const [circuitoId, setCircuitoId] = useState<string>(circuitoActualId);
  const [nombreNuevoLugar, setNombreNuevoLugar] = useState("");
  const [direccionNuevoLugar, setDireccionNuevoLugar] = useState("");
  const [zonaKey, setZonaKey] = useState("candioti");
  const [coordsCustom, setCoordsCustom] = useState<Coords | null>(null);
  const [barrioCustom, setBarrioCustom] = useState<string | undefined>(undefined);
  const [actividad, setActividad] = useState(
    "Encuentro Recreativo, Caminata y Juegos de Mesa"
  );
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [horaCaminata, setHoraCaminata] = useState("16:00");
  const [horaEncuentro, setHoraEncuentro] = useState("16:20");
  const [cupoMaximo, setCupoMaximo] = useState<number>(DEFAULT_CUPO_MAXIMO);
  const [montoReintegro] = useState(0);
  const [plusPadrino] = useState(0);
  const [incluirAbuelosDelTutor, setIncluirAbuelosDelTutor] = useState(true);
  const [coCoordinadoresIds, setCoCoordinadoresIds] = useState<string[]>([
    tutorId,
  ]);

  const todosLosCoordinadores = participantes.filter(
    (p) => p.rol === "coordinador"
  );
  const todosLosAdultosActivos = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );

  useEffect(() => {
    if (open) {
      submitRef.current = false;
      setSubmitting(false);
      setVista(initialView);
      setExpandedJornadaId(null);
      setEditingJornadaId(null);
      setCircuitoId(circuitoActualId);
      setCoordsCustom(null);
      setBarrioCustom(undefined);
      setCoCoordinadoresIds([tutorId]);
    }
  }, [open, initialView, circuitoActualId, jornadaActualId, tutorId]);

  if (!open) return null;

  const handleStartEditEvento = (j: Jornada, c: CircuitoBarrial) => {
    setExpandedJornadaId(j.id);
    setEditingJornadaId(j.id);
    setEditForm({
      nombreClub: c.nombre_club,
      direccionClub: c.direccion_club,
      originalDireccionClub: c.direccion_club,
      coordsClub: c.coords_club,
      barrioClub: c.nombre_barrio,
      actividad: j.actividad_cierre,
      fecha: j.fecha,
      horaCaminata: j.hora_inicio_caminata,
      horaEncuentro: j.hora_encuentro_club,
      cupoMaximo: getJornadaCupoMaximo(j),
      coordinadoresIds: getCircuitoTutoresIds(c),
    });
  };

  const handleSaveEditEvento = async (e: React.FormEvent, jornadaId: string) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      let resolvedCoords = editForm.coordsClub;
      const addrTrim = editForm.direccionClub.trim();
      if (addrTrim && addrTrim !== editForm.originalDireccionClub.trim()) {
        try {
          const query = addrTrim.toLowerCase().includes("santa fe")
            ? addrTrim
            : `${addrTrim}, Santa Fe, Argentina`;
          const resGeo = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
              query
            )}&limit=1`
          );
          if (resGeo.ok) {
            const rows = (await resGeo.json()) as Array<{
              lat: string;
              lon: string;
            }>;
            if (rows.length > 0) {
              const lat = Number(rows[0].lat);
              const lng = Number(rows[0].lon);
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                resolvedCoords = { lat, lng };
              }
            }
          }
        } catch {
          // Keep existing/map coords
        }
      }

      const res = await onEditEvento({
        jornadaId,
        nombreClub: editForm.nombreClub,
        direccionClub: editForm.direccionClub,
        coordsClub: resolvedCoords,
        barrioClub: editForm.barrioClub,
        actividad: editForm.actividad,
        fecha: editForm.fecha,
        horaCaminata: editForm.horaCaminata,
        horaEncuentro: editForm.horaEncuentro,
        cupoMaximo: Number(editForm.cupoMaximo) || DEFAULT_CUPO_MAXIMO,
        coordinadoresIds: editForm.coordinadoresIds,
      });
      if (res.ok) {
        setEditingJornadaId(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitRef.current || submitting) return;
    if (modoLugar === "nuevo" && !nombreNuevoLugar.trim()) return;
    submitRef.current = true;
    setSubmitting(true);
    try {
      const res = await onSubmit({
        tutorId,
        modoLugar,
        circuitoExistenteId: circuitoId || circuitoActualId,
        nombreNuevoLugar,
        direccionNuevoLugar,
        zonaKey,
        coordsCustom,
        barrioCustom,
        actividad,
        fecha,
        horaCaminata,
        horaEncuentro,
        cupoMaximo: Number(cupoMaximo) || DEFAULT_CUPO_MAXIMO,
        montoReintegro,
        plusPadrino,
        incluirAbuelosDelTutor,
        coCoordinadoresIds,
      });
      if (res && res.ok === false) return;
      setVista("lista");
    } finally {
      submitRef.current = false;
      setSubmitting(false);
    }
  };

  const toggleCoordInList = (
    list: string[],
    id: string,
    setter: (next: string[]) => void
  ) => {
    if (list.includes(id)) {
      if (list.length <= 1) return; // Keep at least 1 coordinator
      setter(list.filter((x) => x !== id));
    } else {
      setter([...list, id]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-[#eaeced] space-y-3.5 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera compacta */}
        <div className="flex items-center justify-between border-b border-[#eaeced] pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-[#a70355]" />
            <div>
              <div className="text-[10px] font-bold uppercase text-[#a70355]">
                Mis Centros y Actividades
              </div>
              <h3 className="font-bold text-sm text-[#363f48]">
                Eventos, Lugares y Padron por Encuentro
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#52606d] hover:text-[#363f48] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de pestaña: Lista de eventos vs Crear nuevo */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f6f6f7] rounded-full text-xs shrink-0">
          <button
            type="button"
            onClick={() => setVista("lista")}
            className={`py-1.5 px-3 rounded-full font-semibold transition flex items-center justify-center gap-1.5 ${vista === "lista"
                ? "bg-[#363f48] text-white"
                : "text-[#52606d] hover:text-[#363f48]"
              }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Mis Eventos Guardados ({jornadasDelTutor.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setVista("crear")}
            className={`py-1.5 px-3 rounded-full font-semibold transition flex items-center justify-center gap-1.5 ${vista === "crear"
                ? "bg-[#a70355] text-white"
                : "text-[#52606d] hover:text-[#363f48]"
              }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span> Nuevo Evento o Sede</span>
          </button>
        </div>

        {vista === "lista" ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 text-xs">
            <p className="text-[11px] text-[#52606d]">
              Hace clic en cualquier evento para desplegar su lista de abuelos, editar sus datos o pasar participantes de un evento a otro.
            </p>

            {jornadasDelTutor.map((j) => {
              const c =
                allCircuitos.find((ci) => ci.id === j.circuito_id) ||
                circuitosDelTutor[0];
              const isCurrent = j.id === jornadaActualId;
              const isExpanded = expandedJornadaId === j.id;
              const isEditing = editingJornadaId === j.id;

              const asisDelEvento = asistencias.filter(
                (a) => a.jornada_id === j.id
              );
              const idsEnEvento = new Set(
                asisDelEvento.map((a) => a.participante_id)
              );
              const abuelosEnEvento = todosLosAdultosActivos.filter((p) =>
                idsEnEvento.has(p.id)
              );
              const abuelosFueraDeEvento = todosLosAdultosActivos.filter(
                (p) => !idsEnEvento.has(p.id)
              );
              const coordsDeEsteCentro = todosLosCoordinadores.filter((co) =>
                getCircuitoTutoresIds(c).includes(co.id)
              );
              const otrosEventos = jornadasDelTutor.filter(
                (oj) => oj.id !== j.id
              );

              return (
                <div
                  key={j.id}
                  className={`rounded-xl border transition overflow-hidden ${isCurrent
                      ? "border-[#a70355] bg-[#fdf9fb]"
                      : "border-[#eaeced] bg-white"
                    }`}
                >
                  {/* Fila compacta del evento */}
                  <div
                    onClick={() =>
                      setExpandedJornadaId(isExpanded ? null : j.id)
                    }
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-[#faf0f5]/40 transition"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase bg-[#a70355] text-white px-2 py-0.5 rounded-full">
                            Activo en mapa
                          </span>
                        )}
                        <span className="font-bold text-xs sm:text-sm text-[#363f48] truncate">
                          {c.nombre_club}
                        </span>
                        <span
                          className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${
                            abuelosEnEvento.length >= getJornadaCupoMaximo(j)
                              ? "text-amber-800 bg-amber-50 border-amber-300"
                              : "text-[#a70355] bg-[#faf0f5] border-[#e1a9c5]"
                          }`}
                        >
                          {abuelosEnEvento.length} / {getJornadaCupoMaximo(j)} abuelos
                        </span>
                      </div>
                      <div className="text-[11px] text-[#363f48] font-medium truncate">
                        {j.actividad_cierre} •{" "}
                        <span className="text-[#52606d]">
                          {j.fecha} ({j.hora_inicio_caminata} hs)
                        </span>
                      </div>
                      <div className="text-[10px] text-[#52606d] flex items-center gap-1.5 flex-wrap">
                        <MapPin className="w-3 h-3 text-[#a70355] shrink-0" />
                        <span className="truncate">{c.direccion_club}</span>
                        <span>•</span>
                        <span>
                          Coord:{" "}
                          <strong className="text-[#363f48]">
                            {coordsDeEsteCentro.map((co) => co.nombre).join(", ")}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectEvento(j.id);
                            onClose();
                          }}
                          className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold text-[11px] px-3 py-1 rounded-full transition"
                        >
                          Activar en mapa
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEditEvento(j, c)}
                        className="border border-[#c4c9cd] hover:border-[#a70355] text-[#363f48] hover:text-[#a70355] bg-white font-semibold text-[11px] px-2.5 py-1 rounded-full transition inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedJornadaId(isExpanded ? null : j.id)
                        }
                        className="p-1 text-[#52606d] hover:text-[#363f48]"
                        aria-label="Desplegar evento"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Contenido desplegable: Edicion y/o Lista de Abuelos con Pasar entre eventos */}
                  {isExpanded && (
                    <div className="border-t border-[#eaeced] bg-white p-3 space-y-3">
                      {isEditing && (
                        <form
                          onSubmit={(e) => handleSaveEditEvento(e, j.id)}
                          className="p-3 rounded-xl bg-[#f6f6f7] border border-[#eaeced] space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase text-[#a70355]">
                              Editar Evento y Sede
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingJornadaId(null)}
                              className="text-[11px] text-[#52606d] hover:underline"
                            >
                              Cancelar edicion
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="font-semibold text-[#363f48] block mb-0.5 text-[11px]">
                                Nombre del Centro / Club *
                              </label>
                              <input
                                type="text"
                                required
                                value={editForm.nombreClub}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    nombreClub: e.target.value,
                                  })
                                }
                                className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-1.5 bg-white"
                              />
                            </div>
                            <div>
                              <label className="font-semibold text-[#363f48] block mb-0.5 text-[11px]">
                                Direccion (escribila o hace clic en el mapa de abajo) *
                              </label>
                              <input
                                type="text"
                                required
                                value={editForm.direccionClub}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    direccionClub: e.target.value,
                                  })
                                }
                                className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-1.5 bg-white"
                              />
                            </div>
                          </div>

                          <SelectorMapaLugar
                            mode="nuevo"
                            circuitos={allCircuitos}
                            pickedCoords={editForm.coordsClub || c.coords_club}
                            onLocationPicked={({
                              coords,
                              address,
                              barrio,
                              suggestedName,
                            }) => {
                              setEditForm((prev) => ({
                                ...prev,
                                coordsClub: coords,
                                direccionClub: address || prev.direccionClub,
                                originalDireccionClub: address || prev.direccionClub,
                                barrioClub: barrio || prev.barrioClub,
                                nombreClub:
                                  !prev.nombreClub.trim() && suggestedName
                                    ? suggestedName
                                    : prev.nombreClub,
                              }));
                            }}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-5">
                              <label className="font-semibold text-[#363f48] block mb-0.5 text-[11px]">
                                Actividad del Encuentro *
                              </label>
                              <input
                                type="text"
                                required
                                value={editForm.actividad}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    actividad: e.target.value,
                                  })
                                }
                                className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-1.5 bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="font-semibold text-[#363f48] block mb-0.5 text-[11px]">
                                Cupo max.
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                required
                                value={editForm.cupoMaximo}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    cupoMaximo: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                                className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5 bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="font-semibold text-[#363f48] block mb-0.5 text-[11px]">
                                Fecha
                              </label>
                              <input
                                type="date"
                                value={editForm.fecha}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    fecha: e.target.value,
                                  })
                                }
                                className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5 bg-white"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="font-semibold text-[#363f48] block mb-0.5 text-[11px]">
                                Hora Salida / Sede
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editForm.horaCaminata}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      horaCaminata: e.target.value,
                                    })
                                  }
                                  className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5 bg-white"
                                />
                                <input
                                  type="text"
                                  value={editForm.horaEncuentro}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      horaEncuentro: e.target.value,
                                    })
                                  }
                                  className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5 bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="font-semibold text-[#363f48] block mb-1 text-[11px]">
                              Coordinadores asignados a este Centro (pueden ser varios):
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {todosLosCoordinadores.map((co) => {
                                const active =
                                  editForm.coordinadoresIds.includes(co.id);
                                return (
                                  <button
                                    key={co.id}
                                    type="button"
                                    onClick={() =>
                                      toggleCoordInList(
                                        editForm.coordinadoresIds,
                                        co.id,
                                        (next) =>
                                          setEditForm({
                                            ...editForm,
                                            coordinadoresIds: next,
                                          })
                                      )
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${active
                                        ? "bg-[#a70355] text-white border-[#a70355]"
                                        : "bg-white text-[#52606d] border-[#c4c9cd]"
                                      }`}
                                  >
                                    <img
                                      src={getParticipanteAvatarUrl(co)}
                                      alt={co.nombre}
                                      className="w-4 h-4 rounded-full object-cover"
                                    />
                                    <span>{co.nombre}</span>
                                    {active && <Check className="w-3 h-3" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="submit"
                              disabled={submitting}
                              className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold px-4 py-1.5 rounded-full text-xs transition"
                            >
                              {submitting ? "Guardando..." : "Guardar cambios del evento"}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Lista de abuelos en este evento con opcion de pasarlos a otro evento */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#363f48]">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#a70355]" />
                            <span>
                              Abuelos en este evento ({abuelosEnEvento.length})
                            </span>
                          </span>
                          {otrosEventos.length > 0 && (
                            <span className="text-[10px] font-normal text-[#52606d]">
                              Podes pasar o copiar abuelos entre tus eventos
                            </span>
                          )}
                        </div>

                        {abuelosEnEvento.length === 0 ? (
                          <div className="text-[11px] text-[#52606d] py-2">
                            No hay abuelos en este evento todavia. Sumalos abajo con 1 clic.
                          </div>
                        ) : (
                          <div className="divide-y divide-[#eaeced] border border-[#eaeced] rounded-xl overflow-hidden">
                            {abuelosEnEvento.map((ad, idx) => (
                              <div
                                key={ad.id}
                                className="px-2.5 py-1.5 bg-white flex flex-wrap items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={getParticipanteAvatarUrl(ad, idx)}
                                    alt={ad.nombre}
                                    className="w-7 h-7 rounded-lg object-cover border border-[#eaeced] shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-[#363f48] text-xs truncate">
                                      {ad.nombre}{" "}
                                      <span className="text-[10px] font-normal text-[#52606d]">
                                        ({ad.edad}a)
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-[#52606d] truncate">
                                      {ad.direccion}
                                    </div>
                                  </div>
                                </div>

                                {otrosEventos.length > 0 && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <ArrowRightLeft className="w-3 h-3 text-[#a70355]" />
                                    <select
                                      aria-label={`Pasar a ${ad.nombre} a otro evento`}
                                      defaultValue=""
                                      onChange={async (e) => {
                                        const val = e.target.value;
                                        if (!val) return;
                                        const [mode, targetJornadaId] =
                                          val.split(":");
                                        e.target.value = "";
                                        await onPasarAbuelo({
                                          adultoId: ad.id,
                                          fromJornadaId: j.id,
                                          toJornadaId: targetJornadaId,
                                          quitarDeOrigen: mode === "mover",
                                        });
                                      }}
                                      className="border border-[#c4c9cd] rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#363f48] bg-[#f6f6f7] hover:border-[#a70355] cursor-pointer"
                                    >
                                      <option value="">
                                        Pasar / copiar a otro evento...
                                      </option>
                                      {otrosEventos.map((oe) => {
                                        const oc =
                                          allCircuitos.find(
                                            (ci) => ci.id === oe.circuito_id
                                          ) || c;
                                        return (
                                          <React.Fragment key={oe.id}>
                                            <option value={`mover:${oe.id}`}>
                                              Mover a: {oc.nombre_club} (
                                              {oe.hora_inicio_caminata} hs)
                                            </option>
                                            <option value={`copiar:${oe.id}`}>
                                              Sumar tambien a: {oc.nombre_club} (
                                              {oe.hora_inicio_caminata} hs)
                                            </option>
                                          </React.Fragment>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {abuelosFueraDeEvento.length > 0 && (
                          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-[#52606d]">
                              + Traer abuelo de otro evento a este:
                            </span>
                            {abuelosFueraDeEvento.map((ad) => (
                              <button
                                key={ad.id}
                                type="button"
                                onClick={() =>
                                  onPasarAbuelo({
                                    adultoId: ad.id,
                                    fromJornadaId: "",
                                    toJornadaId: j.id,
                                    quitarDeOrigen: false,
                                  })
                                }
                                className="inline-flex items-center gap-1 bg-[#f6f6f7] hover:bg-[#faf0f5] border border-[#c4c9cd] hover:border-[#a70355] text-[#363f48] hover:text-[#a70355] px-2 py-0.5 rounded-full text-[10px] font-semibold transition"
                              >
                                <img
                                  src={getParticipanteAvatarUrl(ad)}
                                  alt={ad.nombre}
                                  className="w-3.5 h-3.5 rounded-full object-cover"
                                />
                                <span>+ {ad.nombre.split(" ")[0]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={handleSubmitNew}
            className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 text-xs"
          >
            {/* Selector: usar lugar guardado vs nuevo lugar */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f6f6f7] rounded-full">
              <button
                type="button"
                onClick={() => setModoLugar("existente")}
                className={`py-1.5 px-3 rounded-full font-semibold transition ${modoLugar === "existente"
                    ? "bg-[#363f48] text-white"
                    : "text-[#52606d] hover:text-[#363f48]"
                  }`}
              >
                En un centro ya guardado
              </button>
              <button
                type="button"
                onClick={() => setModoLugar("nuevo")}
                className={`py-1.5 px-3 rounded-full font-semibold transition ${modoLugar === "nuevo"
                    ? "bg-[#a70355] text-white"
                    : "text-[#52606d] hover:text-[#363f48]"
                  }`}
              >
                + Ubicar nuevo centro en mapa
              </button>
            </div>

            {modoLugar === "existente" ? (
              <div className="space-y-2">
                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Seleccionar Centro / Club donde se organiza *
                  </label>
                  <select
                    value={circuitoId || circuitoActualId}
                    onChange={(e) => setCircuitoId(e.target.value)}
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5 bg-white font-medium text-[#363f48]"
                  >
                    {allCircuitos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_club} — {c.direccion_club}
                      </option>
                    ))}
                  </select>
                </div>

                <SelectorMapaLugar
                  mode="existente"
                  circuitos={allCircuitos}
                  selectedCircuitoId={circuitoId || circuitoActualId}
                  pickedCoords={null}
                  onSelectCircuitoExistente={(id) => setCircuitoId(id)}
                  onLocationPicked={() => { }}
                />
              </div>
            ) : (
              <div className="space-y-2.5 p-3 rounded-xl bg-[#fdf9fb] border border-[#edcddd]">
                <SelectorMapaLugar
                  mode="nuevo"
                  circuitos={allCircuitos}
                  pickedCoords={coordsCustom}
                  onLocationPicked={({
                    coords,
                    address,
                    barrio,
                    suggestedName,
                  }) => {
                    setCoordsCustom(coords);
                    if (barrio) setBarrioCustom(barrio);
                    if (address) setDireccionNuevoLugar(address);
                    if (suggestedName && !nombreNuevoLugar.trim()) {
                      setNombreNuevoLugar(suggestedName);
                    }
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Nombre del Centro / Club / Vecinal *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Vecinal Centro Cultural El Molino"
                      value={nombreNuevoLugar}
                      onChange={(e) => setNombreNuevoLugar(e.target.value)}
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Direccion *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Bv. Galvez 2350"
                      value={direccionNuevoLugar}
                      onChange={(e) => setDireccionNuevoLugar(e.target.value)}
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5 bg-white"
                    />
                  </div>
                </div>

                {!coordsCustom && (
                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Zona aproximada
                    </label>
                    <select
                      value={zonaKey}
                      onChange={(e) => setZonaKey(e.target.value)}
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5 bg-white"
                    >
                      <option value="candioti">Barrio Candioti / Bv. Galvez</option>
                      <option value="guadalupe">Barrio Guadalupe / Costanera</option>
                      <option value="parque_federal">
                        Parque Federal / Sargento Cabral
                      </option>
                      <option value="centro">Centro / Parque Sur</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <label className="font-semibold text-[#363f48] block mb-1">
                  Actividad del Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Caminata Suave y Torneo de Truco"
                  value={actividad}
                  onChange={(e) => setActividad(e.target.value)}
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-semibold text-[#363f48] block mb-1">
                  Limite abuelos *
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={cupoMaximo}
                  onChange={(e) =>
                    setCupoMaximo(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-semibold text-[#363f48] block mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="font-semibold text-[#363f48] block mb-1">
                  Salida / En Sede
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={horaCaminata}
                    onChange={(e) => setHoraCaminata(e.target.value)}
                    className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5"
                  />
                  <input
                    type="text"
                    value={horaEncuentro}
                    onChange={(e) => setHoraEncuentro(e.target.value)}
                    className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Coordinadores a cargo de este centro (pueden ser multiples):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {todosLosCoordinadores.map((co) => {
                  const active = coCoordinadoresIds.includes(co.id);
                  return (
                    <button
                      key={co.id}
                      type="button"
                      onClick={() =>
                        toggleCoordInList(
                          coCoordinadoresIds,
                          co.id,
                          setCoCoordinadoresIds
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${active
                          ? "bg-[#a70355] text-white border-[#a70355]"
                          : "bg-white text-[#52606d] border-[#c4c9cd]"
                        }`}
                    >
                      <img
                        src={getParticipanteAvatarUrl(co)}
                        alt={co.nombre}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span>{co.nombre}</span>
                      {active && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 bg-[#f6f6f7] p-2.5 rounded-lg border border-[#eaeced] cursor-pointer">
              <input
                type="checkbox"
                checked={incluirAbuelosDelTutor}
                onChange={(e) => setIncluirAbuelosDelTutor(e.target.checked)}
                className="mt-0.5 rounded border-[#c4c9cd] text-[#a70355] accent-[#a70355]"
              />
              <span className="text-[11px] text-[#363f48]">
                <strong>Incluir lista de abuelos de la sede</strong> (luego podes quitar o pasar abuelos entre eventos en 1 clic).
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eaeced]">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setVista("lista")}
                className="px-4 py-1.5 rounded-full border border-[#c4c9cd] text-[#52606d] font-medium"
              >
                Volver a mis eventos
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#a70355] hover:bg-[#8c0347] disabled:bg-slate-400 text-white font-semibold px-5 py-1.5 rounded-full transition"
              >
                {submitting ? "Guardando..." : "Guardar y activar evento"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
