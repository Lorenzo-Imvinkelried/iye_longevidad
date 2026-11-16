"use client";

import React, { useState } from "react";
import {
  Asistencia,
  CircuitoBarrial,
  Jornada,
  Participante,
} from "@/types/domain";
import {
  findExistingSeniorByDniOrPhone,
  findScheduleConflict,
} from "@/lib/domain-helpers";
import { AlertTriangle, CheckCircle2, UserCheck, UserPlus, X } from "lucide-react";

interface ModalFamiliarProps {
  open: boolean;
  onClose: () => void;
  nombreClub: string;
  jornada: Jornada;
  jornadas: Jornada[];
  circuitos: CircuitoBarrial[];
  participantes: Participante[];
  asistencias: Asistencia[];
  onVincularExistente: (adultoId: string) => Promise<{ ok: boolean; error?: string }>;
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
  }) => Promise<{ ok: boolean; error?: string }>;
}

export default function ModalDerivacionFamiliar({
  open,
  onClose,
  nombreClub,
  jornada,
  jornadas,
  circuitos,
  participantes,
  asistencias,
  onVincularExistente,
  onSubmit,
}: ModalFamiliarProps) {
  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombreAdulto: "",
    edad: 77,
    dni: "",
    telefonoAdulto: "",
    direccion: "Sarmiento 3485, Santa Fe",
    nombreFamiliar: "Inscripcion directa por Tutor",
    vinculo: "Coordinacion / Familiar",
    telefonoFamiliar: "+5493425443322",
    notas: "Requiere acompanamiento puerta a puerta para salir con tranquilidad.",
    aprobarDirecto: true,
  });

  if (!open) return null;

  const idsYaEnEsteEvento = new Set(
    asistencias
      .filter((a) => a.jornada_id === jornada.id)
      .map((a) => a.participante_id)
  );

  const abuelosDisponibles = participantes.filter(
    (p) => p.rol === "adulto_mayor" && !idsYaEnEsteEvento.has(p.id)
  );

  const coincidenciaExistente = findExistingSeniorByDniOrPhone(
    participantes,
    form.dni,
    form.telefonoAdulto
  );
  const conflictoForm = coincidenciaExistente
    ? findScheduleConflict(
        coincidenciaExistente.id,
        jornada,
        jornadas,
        asistencias,
        circuitos
      )
    : null;

  const handleVincularClick = async (adultoId: string) => {
    setSubmitError(null);
    setSaving(true);
    try {
      const res = await onVincularExistente(adultoId);
      if (!res.ok) {
        setSubmitError(res.error || "No se pudo vincular al adulto mayor.");
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreAdulto || !form.nombreFamiliar) return;
    setSubmitError(null);
    setSaving(true);
    try {
      const res = await onSubmit(form);
      if (!res.ok) {
        setSubmitError(res.error || "Error al guardar participante.");
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-[#eaeced] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#eaeced] pb-3">
          <div>
            <div className="text-[10px] font-bold uppercase text-[#a70355]">
              Evento: {jornada.fecha} • {jornada.hora_inicio_caminata} hs
            </div>
            <h3 className="font-bold text-sm text-[#363f48]">
              Sumar Adulto Mayor a {nombreClub}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#52606d] hover:text-[#363f48]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de modo */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f6f6f7] rounded-full text-xs">
          <button
            type="button"
            onClick={() => {
              setModo("existente");
              setSubmitError(null);
            }}
            className={`py-1.5 px-3 rounded-full font-semibold transition flex items-center justify-center gap-1.5 ${
              modo === "existente"
                ? "bg-[#0a4494] text-white"
                : "text-[#52606d] hover:text-[#363f48]"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Ya registrado ({abuelosDisponibles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("nuevo");
              setSubmitError(null);
            }}
            className={`py-1.5 px-3 rounded-full font-semibold transition flex items-center justify-center gap-1.5 ${
              modo === "nuevo"
                ? "bg-[#a70355] text-white"
                : "text-[#52606d] hover:text-[#363f48]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cargar nuevo abuelo</span>
          </button>
        </div>

        {submitError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {modo === "existente" ? (
          <div className="space-y-2.5 text-xs">
            <p className="text-[11px] text-[#52606d]">
              Vincula a un adulto mayor ya registrado en Sancor sin duplicar su perfil ni su WhatsApp. El sistema verifica automaticamente que no tenga otro evento superpuesto el{" "}
              <strong>{jornada.fecha}</strong> cerca de las{" "}
              <strong>{jornada.hora_inicio_caminata} hs</strong>.
            </p>

            {abuelosDisponibles.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#f6f6f7] border border-[#eaeced] text-center space-y-2">
                <p className="font-semibold text-[#363f48]">
                  Todos los adultos mayores cargados ya forman parte de este evento.
                </p>
                <button
                  type="button"
                  onClick={() => setModo("nuevo")}
                  className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold px-4 py-1.5 rounded-full"
                >
                  Cargar un nuevo adulto mayor
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {abuelosDisponibles.map((ad) => {
                  const conflicto = findScheduleConflict(
                    ad.id,
                    jornada,
                    jornadas,
                    asistencias,
                    circuitos
                  );

                  return (
                    <div
                      key={ad.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        conflicto
                          ? "bg-red-50/50 border-red-200"
                          : "bg-white border-[#eaeced]"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-[#363f48] truncate">
                          {ad.nombre} ({ad.edad} anos • DNI {ad.dni})
                        </div>
                        <div className="text-[11px] text-[#52606d] truncate">
                          {ad.direccion} • Tel: {ad.telefono}
                        </div>
                        {conflicto ? (
                          <div className="text-[11px] font-semibold text-red-700 flex items-center gap-1 pt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{conflicto.mensaje}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-[#168003] flex items-center gap-1 pt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Disponible para sumar sin superposicion</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(conflicto) || saving}
                        onClick={() => handleVincularClick(ad.id)}
                        className={`shrink-0 px-4 py-1.5 rounded-full font-semibold text-[11px] transition ${
                          conflicto
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-[#0a4494] hover:bg-[#08397c] text-white"
                        }`}
                      >
                        {conflicto ? "Horario ocupado" : "Vincular al lugar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
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
                  Telefono WhatsApp (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: +5493424889900"
                  value={form.telefonoAdulto}
                  onChange={(e) => setForm({ ...form, telefonoAdulto: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {coincidenciaExistente && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] font-medium ${
                  conflictoForm
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-blue-50 border-blue-200 text-[#0a4494]"
                }`}
              >
                {conflictoForm
                  ? `Atencion: Ya existe ${coincidenciaExistente.nombre} y tiene superposicion horaria (${conflictoForm.mensaje}).`
                  : `Nota: ${coincidenciaExistente.nombre} ya existe en Sancor; se vinculara su perfil sin duplicarlo.`}
              </div>
            )}

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
                  Nombre del familiar / tutor solicitante *
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
                onChange={(e) =>
                  setForm({ ...form, aprobarDirecto: e.target.checked })
                }
                className="mt-0.5 rounded border-[#c4c9cd] text-[#0a4494]"
              />
              <span className="text-[11px] text-[#363f48]">
                <strong>Incorporar directamente a la lista activa de {nombreClub}</strong>{" "}
                (si lo desmarcas, quedara como solicitud pendiente de aprobacion familiar).
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
                disabled={Boolean(conflictoForm) || saving}
                className="bg-[#0a4494] hover:bg-[#08397c] disabled:bg-slate-300 text-white font-semibold px-5 py-2 rounded-full transition"
              >
                {saving
                  ? "Guardando..."
                  : form.aprobarDirecto
                  ? "Sumar a la lista del lugar"
                  : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
