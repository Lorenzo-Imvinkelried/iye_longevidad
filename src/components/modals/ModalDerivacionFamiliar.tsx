"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface ModalFamiliarProps {
  open: boolean;
  onClose: () => void;
  nombreClub: string;
  onSubmit: (payload: {
    nombreAdulto: string;
    edad: number;
    dni: string;
    telefonoAdulto: string;
    direccion: string;
    nombreFamiliar: string;
    vinculo: string;
    telefonoFamiliar: string;
    notas: string;
    aprobarDirecto: boolean;
  }) => Promise<void>;
}

export default function ModalDerivacionFamiliar({
  open,
  onClose,
  nombreClub,
  onSubmit,
}: ModalFamiliarProps) {
  const [form, setForm] = useState({
    nombreAdulto: "",
    edad: 77,
    dni: "",
    telefonoAdulto: "+5493424889900",
    direccion: "Sarmiento 3485, Santa Fe",
    nombreFamiliar: "Inscripcion directa por Tutor",
    vinculo: "Coordinacion / Familiar",
    telefonoFamiliar: "+5493425443322",
    notas: "Requiere acompanamiento puerta a puerta para salir con tranquilidad.",
    aprobarDirecto: true,
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreAdulto || !form.nombreFamiliar) return;
    await onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">
              Formulario para Nietos y Familiares
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              Inscribir a un Abuelo / Familiar en {nombreClub}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Nombre y apellido del adulto mayor *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Elsa Pereyra"
                value={form.nombreAdulto}
                onChange={(e) => setForm({ ...form, nombreAdulto: e.target.value })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                DNI del adulto mayor *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 08.452.110"
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Telefono WhatsApp *
              </label>
              <input
                type="text"
                required
                value={form.telefonoAdulto}
                onChange={(e) => setForm({ ...form, telefonoAdulto: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Domicilio en el barrio *
            </label>
            <input
              type="text"
              required
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nombre del familiar solicitante *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Valentin Gomez"
                value={form.nombreFamiliar}
                onChange={(e) => setForm({ ...form, nombreFamiliar: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Vinculo
              </label>
              <input
                type="text"
                value={form.vinculo}
                onChange={(e) => setForm({ ...form, vinculo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Observaciones para el coordinador
            </label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <label className="flex items-start gap-2 bg-[#f6f6f7] p-3 rounded-lg border border-[#eaeced] cursor-pointer">
            <input
              type="checkbox"
              checked={form.aprobarDirecto}
              onChange={(e) => setForm({ ...form, aprobarDirecto: e.target.checked })}
              className="mt-0.5 rounded border-[#c4c9cd] text-[#0a4494]"
            />
            <span className="text-[11px] text-[#363f48]">
              <strong>Incorporar directamente a la lista activa de {nombreClub}</strong> (si lo desmarcas, quedara como solicitud pendiente de aprobacion familiar).
            </span>
          </label>

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
              className="bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold px-5 py-2 rounded-full transition"
            >
              {form.aprobarDirecto ? "Sumar a la lista del lugar" : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
