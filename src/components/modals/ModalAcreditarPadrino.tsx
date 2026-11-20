"use client";

import React, { useRef, useState } from "react";
import { Participante } from "@/types/domain";
import { Users, X } from "lucide-react";

interface ModalPadrinoProps {
  open: boolean;
  participantes: Participante[];
  onClose: () => void;
  onSubmit: (payload: {
    nombre: string;
    edad: number;
    dni: string;
    telefono: string;
    direccion: string;
    adultosAsignadosIds: string[];
  }) => Promise<{ ok: boolean; error?: string } | void>;
}

export default function ModalAcreditarPadrino({
  open,
  participantes,
  onClose,
  onSubmit,
}: ModalPadrinoProps) {
  const submitRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAdultosIds, setSelectedAdultosIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    nombre: "",
    edad: 65,
    dni: "",
    telefono: "+5493424776655",
    direccion: "Bv. Galvez 1920, Barrio Candioti",
  });

  if (!open) return null;

  const adultosActivos = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );

  const toggleAdulto = (id: string) => {
    setSelectedAdultosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitRef.current || submitting) return;
    if (!form.nombre || !form.dni) return;
    submitRef.current = true;
    setSubmitting(true);
    try {
      const res = await onSubmit({
        ...form,
        adultosAsignadosIds: selectedAdultosIds,
      });
      if (res && res.ok === false) return;
      setSelectedAdultosIds([]);
      onClose();
    } finally {
      submitRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 flex flex-col gap-4 max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">
              Acreditacion Presencial
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              Registrar Nuevo Vecino Padrino
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-3 text-xs pr-1">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nombre y apellido *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Ruben Castellanos"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                DNI verificado *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 13.998.221"
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Edad *</label>
              <input
                type="number"
                required
                value={form.edad}
                onChange={(e) => setForm({ ...form, edad: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                WhatsApp *
              </label>
              <input
                type="text"
                required
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Domicilio barrial *
            </label>
            <input
              type="text"
              required
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#fdf9fb] border border-[#f4e1eb] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="font-bold text-[#363f48] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#a70355]" />
                <span>Asignar abuelos a su cargo (opcional)</span>
              </label>
              <span className="text-[10px] font-bold text-[#a70355]">
                {selectedAdultosIds.length} seleccionados
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {adultosActivos.map((ad) => {
                const checked = selectedAdultosIds.includes(ad.id);
                const padrinoActual = participantes.find(
                  (p) => p.id === ad.padrino_preferido_id
                );
                return (
                  <label
                    key={ad.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer transition ${
                      checked
                        ? "bg-white border-[#a70355]"
                        : "bg-white/70 border-[#eaeced] hover:border-[#e1a9c5]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAdulto(ad.id)}
                        className="accent-[#a70355] w-3.5 h-3.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#363f48] truncate">
                          {ad.nombre}
                        </div>
                        <div className="text-[10px] text-[#52606d] truncate">
                          {ad.direccion}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#52606d] bg-[#f6f6f7] px-2 py-0.5 rounded-full shrink-0">
                      {padrinoActual
                        ? `Actual: ${padrinoActual.nombre.split(" ")[0]}`
                        : "Sin padrino"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
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
              {submitting ? "Guardando..." : "Emitir credencial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
