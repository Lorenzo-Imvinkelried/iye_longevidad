"use client";

import React, { useEffect, useRef, useState } from "react";
import { CircuitoBarrial, Coords } from "@/types/domain";
import SelectorMapaLugar from "@/components/mapa/SelectorMapaLugar";
import { CalendarPlus, X } from "lucide-react";

interface ModalEventoProps {
  open: boolean;
  onClose: () => void;
  tutorId: string;
  circuitosDelTutor: CircuitoBarrial[];
  circuitoActualId: string;
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
    montoReintegro: number;
    plusPadrino: number;
    incluirAbuelosDelTutor: boolean;
  }) => Promise<{ ok: boolean; error?: string } | void>;
}

export default function ModalCrearEventoLugar({
  open,
  onClose,
  tutorId,
  circuitosDelTutor,
  circuitoActualId,
  onSubmit,
}: ModalEventoProps) {
  const submitRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [modoLugar, setModoLugar] = useState<"existente" | "nuevo">("existente");
  const [circuitoId, setCircuitoId] = useState<string>(circuitoActualId);
  const [nombreNuevoLugar, setNombreNuevoLugar] = useState("");
  const [direccionNuevoLugar, setDireccionNuevoLugar] = useState("");
  const [zonaKey, setZonaKey] = useState("candioti");
  const [coordsCustom, setCoordsCustom] = useState<Coords | null>(null);
  const [barrioCustom, setBarrioCustom] = useState<string | undefined>(undefined);
  const [actividad, setActividad] = useState(
    "Caminata Activa, Torneo de Truco y Bingo"
  );
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [horaCaminata, setHoraCaminata] = useState("16:00");
  const [horaEncuentro, setHoraEncuentro] = useState("16:20");
  const [montoReintegro] = useState(0);
  const [plusPadrino] = useState(0);
  const [incluirAbuelosDelTutor, setIncluirAbuelosDelTutor] = useState(true);

  useEffect(() => {
    if (open) {
      submitRef.current = false;
      setSubmitting(false);
      setCircuitoId(circuitoActualId);
      setCoordsCustom(null);
      setBarrioCustom(undefined);
    }
  }, [open, circuitoActualId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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
        montoReintegro,
        plusPadrino,
        incluirAbuelosDelTutor,
      });
      if (res && res.ok === false) return;
      onClose();
    } finally {
      submitRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-xl border border-[#eaeced] space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#eaeced] pb-3">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-[#a70355]" />
            <div>
              <div className="text-[10px] font-bold uppercase text-[#a70355]">
                Gestion de Lugares y Eventos
              </div>
              <h3 className="font-bold text-sm text-[#363f48]">
                Organizar Nuevo Evento o Ubicar Otra Sede en el Mapa
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-[#52606d] hover:text-[#363f48]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Selector: usar lugar guardado vs nuevo lugar */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#f6f6f7] rounded-full">
            <button
              type="button"
              onClick={() => setModoLugar("existente")}
              className={`py-1.5 px-3 rounded-full font-semibold transition ${
                modoLugar === "existente"
                  ? "bg-[#363f48] text-white"
                  : "text-[#52606d] hover:text-[#363f48]"
              }`}
            >
              En un lugar guardado
            </button>
            <button
              type="button"
              onClick={() => setModoLugar("nuevo")}
              className={`py-1.5 px-3 rounded-full font-semibold transition ${
                modoLugar === "nuevo"
                  ? "bg-[#a70355] text-white"
                  : "text-[#52606d] hover:text-[#363f48]"
              }`}
            >
              + Ubicar nuevo lugar en mapa
            </button>
          </div>

          {modoLugar === "existente" ? (
            <div className="space-y-2.5">
              <div>
                <label className="font-semibold text-[#363f48] block mb-1">
                  Seleccionar Sala / Club donde se organiza *
                </label>
                <select
                  value={circuitoId || circuitoActualId}
                  onChange={(e) => setCircuitoId(e.target.value)}
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white font-medium text-[#363f48]"
                >
                  {circuitosDelTutor.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_club} — {c.direccion_club}
                    </option>
                  ))}
                </select>
              </div>

              <SelectorMapaLugar
                mode="existente"
                circuitos={circuitosDelTutor}
                selectedCircuitoId={circuitoId || circuitoActualId}
                pickedCoords={null}
                onSelectCircuitoExistente={(id) => setCircuitoId(id)}
                onLocationPicked={() => {}}
              />
            </div>
          ) : (
            <div className="space-y-3 p-3 rounded-xl bg-[#fdf9fb] border border-[#edcddd]">
              <SelectorMapaLugar
                mode="nuevo"
                circuitos={circuitosDelTutor}
                pickedCoords={coordsCustom}
                onLocationPicked={({ coords, address, barrio, suggestedName }) => {
                  setCoordsCustom(coords);
                  if (barrio) setBarrioCustom(barrio);
                  if (address) setDireccionNuevoLugar(address);
                  if (suggestedName && !nombreNuevoLugar.trim()) {
                    setNombreNuevoLugar(suggestedName);
                  }
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Nombre de la Sala / Club / Vecinal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Vecinal Centro Cultural El Molino"
                    value={nombreNuevoLugar}
                    onChange={(e) => setNombreNuevoLugar(e.target.value)}
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Direccion (se autocompleta desde el mapa) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Bv. Galvez 2350 o hace clic en el mapa"
                    value={direccionNuevoLugar}
                    onChange={(e) => setDireccionNuevoLugar(e.target.value)}
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
                  />
                </div>
              </div>

              {!coordsCustom && (
                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    O elegir zona aproximada (si no picaste en el mapa)
                  </label>
                  <select
                    value={zonaKey}
                    onChange={(e) => setZonaKey(e.target.value)}
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
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

          <div>
            <label className="font-semibold text-[#363f48] block mb-1">
              Actividad del Evento *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Caminata Suave, Taller Cognitivo y Torneo de Truco"
              value={actividad}
              onChange={(e) => setActividad(e.target.value)}
              className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-2"
              />
            </div>
            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Hora Caminata
              </label>
              <input
                type="text"
                value={horaCaminata}
                onChange={(e) => setHoraCaminata(e.target.value)}
                className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-2"
              />
            </div>
            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Hora en Sede
              </label>
              <input
                type="text"
                value={horaEncuentro}
                onChange={(e) => setHoraEncuentro(e.target.value)}
                className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-2"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 bg-[#f6f6f7] p-3 rounded-lg border border-[#eaeced] cursor-pointer">
            <input
              type="checkbox"
              checked={incluirAbuelosDelTutor}
              onChange={(e) => setIncluirAbuelosDelTutor(e.target.checked)}
              className="mt-0.5 rounded border-[#c4c9cd] text-[#a70355] accent-[#a70355]"
            />
            <span className="text-[11px] text-[#363f48]">
              <strong>Copiar mi lista guardada de abuelos de esta sede</strong> (los que ya tengan otro evento en la misma fecha y horario se omiten automaticamente para evitar superposiciones).
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eaeced]">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#c4c9cd] text-[#52606d] font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#a70355] hover:bg-[#8c0347] disabled:bg-slate-400 text-white font-semibold px-5 py-2 rounded-full transition"
            >
              {submitting ? "Guardando..." : "Guardar y activar evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
