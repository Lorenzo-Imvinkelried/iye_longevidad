"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface ModalPadrinoProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    nombre: string;
    edad: number;
    dni: string;
    telefono: string;
    direccion: string;
  }) => Promise<void>;
}

export default function ModalAcreditarPadrino({
  open,
  onClose,
  onSubmit,
}: ModalPadrinoProps) {
  const [form, setForm] = useState({
    nombre: "",
    edad: 65,
    dni: "",
    telefono: "+5493424776655",
    direccion: "Bv. Galvez 1920, Barrio Candioti",
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.dni) return;
    await onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#c4c9cd] text-[#52606d] font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold px-5 py-2 rounded-full transition"
            >
              Emitir credencial
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
