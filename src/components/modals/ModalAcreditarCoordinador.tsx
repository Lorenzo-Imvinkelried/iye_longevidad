"use client";

import React, { useState } from "react";
import { CircuitoBarrial, Coords } from "@/types/domain";
import SelectorMapaLugar from "@/components/mapa/SelectorMapaLugar";
import { Eye, EyeOff, ShieldCheck, X } from "lucide-react";

interface ModalCoordinadorProps {
  open: boolean;
  onClose: () => void;
  circuitosExistentes?: CircuitoBarrial[];
  onSubmit: (payload: {
    nombreTutor: string;
    dniTutor: string;
    claveTutor: string;
    telefonoTutor: string;
    especialidad: string;
    nombreLugar: string;
    direccionLugar: string;
    zonaKey: string;
    coordsCustom?: Coords | null;
    barrioCustom?: string;
    actividadInicial: string;
    horaCaminata: string;
    horaEncuentro: string;
    keepCurrentSession: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export default function ModalAcreditarCoordinador({
  open,
  onClose,
  circuitosExistentes = [],
  onSubmit,
}: ModalCoordinadorProps) {
  const [saving, setSaving] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [coordsCustom, setCoordsCustom] = useState<Coords | null>(null);
  const [barrioCustom, setBarrioCustom] = useState<string | undefined>(undefined);
  const [form, setForm] = useState({
    nombreTutor: "",
    dniTutor: "",
    claveTutor: "",
    telefonoTutor: "",
    especialidad: "Encargado de Club / Sala",
    nombreLugar: "",
    direccionLugar: "",
    zonaKey: "candioti",
    actividadInicial: "Caminata Grupal, Torneo de Truco y Bingo",
    horaCaminata: "18:00",
    horaEncuentro: "18:20",
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.nombreTutor || !form.dniTutor || !form.claveTutor || !form.nombreLugar) {
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      const res = await onSubmit({
        ...form,
        coordsCustom,
        barrioCustom,
        keepCurrentSession: true,
      });
      if (!res.ok) {
        setErrorMsg(res.error || "No se pudo acreditar el coordinador.");
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-xl border border-[#eaeced] space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#eaeced] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#a70355]" />
            <div>
              <div className="text-[10px] font-bold uppercase text-[#a70355]">
                Validacion Presencial Sancor / Club
              </div>
              <h3 className="font-bold text-sm text-[#363f48]">
                Acreditar Nuevo Coordinador y Sede
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-[#52606d] hover:text-[#363f48]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[#52606d]">
          Habilita a un nuevo profesional, encargado de club, vecino o adulto mayor referente tras validar su DNI para que pueda ingresar con su clave y convocar encuentros en su sede.
        </p>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Nombre y Apellido *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Beatriz Gomez"
                value={form.nombreTutor}
                onChange={(e) => setForm({ ...form, nombreTutor: e.target.value })}
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                DNI validado *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 18.452.100"
                value={form.dniTutor}
                onChange={(e) => setForm({ ...form, dniTutor: e.target.value })}
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-coord-clave"
                className="font-semibold text-[#363f48] block mb-1"
              >
                Clave / PIN inicial *
              </label>
              <div className="relative">
                <input
                  id="modal-coord-clave"
                  type={mostrarClave ? "text" : "password"}
                  required
                  minLength={4}
                  placeholder="Min. 4 caracteres"
                  value={form.claveTutor}
                  onChange={(e) =>
                    setForm({ ...form, claveTutor: e.target.value })
                  }
                  className="w-full border border-[#c4c9cd] rounded-lg pl-3 pr-9 py-2"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  aria-label={mostrarClave ? "Ocultar clave" : "Ver clave"}
                  title={mostrarClave ? "Ocultar clave" : "Ver clave"}
                  className="absolute inset-y-0 right-0 px-2.5 flex items-center text-[#52606d] hover:text-[#a70355] transition"
                >
                  {mostrarClave ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Que es / Profesion u ocupacion en la sede *
              </label>
              <select
                value={form.especialidad}
                onChange={(e) =>
                  setForm({ ...form, especialidad: e.target.value })
                }
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
              >
                <option value="Encargado de Club / Sala">
                  Encargado de Club / Sala
                </option>
                <option value="Kinesiologo / Profesional de Salud">
                  Kinesiologo / Profesional de Salud
                </option>
                <option value="Adulto Mayor Referente">
                  Adulto Mayor Referente
                </option>
                <option value="Vecino Coordinador">
                  Vecino Coordinador
                </option>
              </select>
            </div>
          </div>

          <div className="border-t border-[#eaeced] pt-3 space-y-2.5">
            <SelectorMapaLugar
              mode="nuevo"
              circuitos={circuitosExistentes}
              pickedCoords={coordsCustom}
              onLocationPicked={({ coords, address, barrio, suggestedName }) => {
                setCoordsCustom(coords);
                if (barrio) setBarrioCustom(barrio);
                setForm((prev) => ({
                  ...prev,
                  direccionLugar: address || prev.direccionLugar,
                  nombreLugar:
                    !prev.nombreLugar && suggestedName
                      ? suggestedName
                      : prev.nombreLugar,
                }));
              }}
            />

            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Sede / Lugar de Encuentro asignado *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Centro Cultural y Vecinal El Molino"
                value={form.nombreLugar}
                onChange={(e) => setForm({ ...form, nombreLugar: e.target.value })}
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Direccion de la sede (autocompletada al tocar mapa o buscar) *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Bv. Galvez 2350"
                value={form.direccionLugar}
                onChange={(e) =>
                  setForm({ ...form, direccionLugar: e.target.value })
                }
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eaeced]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#c4c9cd] text-[#52606d] font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold px-5 py-2 rounded-full transition"
            >
              {saving ? "Acreditando..." : "Acreditar coordinador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
