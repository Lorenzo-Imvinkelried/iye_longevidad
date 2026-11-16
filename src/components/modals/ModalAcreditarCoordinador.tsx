"use client";

import React, { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

interface ModalCoordinadorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    nombreTutor: string;
    dniTutor: string;
    claveTutor: string;
    telefonoTutor: string;
    especialidad: string;
    nombreLugar: string;
    direccionLugar: string;
    zonaKey: string;
    actividadInicial: string;
    horaCaminata: string;
    horaEncuentro: string;
    keepCurrentSession: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export default function ModalAcreditarCoordinador({
  open,
  onClose,
  onSubmit,
}: ModalCoordinadorProps) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombreTutor: "",
    dniTutor: "",
    claveTutor: "",
    telefonoTutor: "",
    especialidad: "Adulto Mayor Referente",
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
    if (!form.nombreTutor || !form.dniTutor || !form.claveTutor || !form.nombreLugar) {
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      const res = await onSubmit({
        ...form,
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
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-[#eaeced] space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#eaeced] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#a70355]" />
            <div>
              <div className="text-[10px] font-bold uppercase text-[#a70355]">
                Validacion Presencial Sancor / Club
              </div>
              <h3 className="font-bold text-sm text-[#363f48]">
                Acreditar Nuevo Coordinador / Referente y Sede
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
              <label className="font-semibold text-[#363f48] block mb-1">
                Clave / PIN inicial *
              </label>
              <input
                type="password"
                required
                minLength={4}
                placeholder="Min. 4 caracteres"
                value={form.claveTutor}
                onChange={(e) => setForm({ ...form, claveTutor: e.target.value })}
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Perfil / Rol acreditado *
              </label>
              <select
                value={form.especialidad}
                onChange={(e) =>
                  setForm({ ...form, especialidad: e.target.value })
                }
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
              >
                <option value="Adulto Mayor Referente">
                  Adulto Mayor Referente
                </option>
                <option value="Encargado de Club / Sala">
                  Encargado de Club / Sala
                </option>
                <option value="Profesional de Salud / Tutor">
                  Profesional de Salud / Tutor
                </option>
                <option value="Vecino Padrino Coordinador">
                  Vecino Padrino Coordinador
                </option>
              </select>
            </div>
          </div>

          <div className="border-t border-[#eaeced] pt-3 space-y-2.5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-[#363f48] block mb-1">
                  Direccion de la sede *
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

              <div>
                <label className="font-semibold text-[#363f48] block mb-1">
                  Zona / Barrio en Mapa *
                </label>
                <select
                  value={form.zonaKey}
                  onChange={(e) => setForm({ ...form, zonaKey: e.target.value })}
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
                >
                  <option value="candioti">Barrio Candioti Sur / Bv. Galvez</option>
                  <option value="guadalupe">Barrio Guadalupe / Costanera Este</option>
                  <option value="parque_federal">
                    Parque Federal / Sargento Cabral
                  </option>
                  <option value="centro">Centro / Parque Sur</option>
                </select>
              </div>
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
