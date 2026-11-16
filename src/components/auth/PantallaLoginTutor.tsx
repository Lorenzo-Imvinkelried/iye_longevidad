"use client";

import React, { useState } from "react";
import { CircuitoBarrial, Jornada, Participante } from "@/types/domain";
import { Building2, LogIn, MapPin, UserPlus, Users } from "lucide-react";

interface LoginProps {
  tutores: Participante[];
  circuitos: CircuitoBarrial[];
  jornadas: Jornada[];
  loading: boolean;
  onSelectTutor: (tutorId: string, jornadaId?: string) => void;
  onRegisterTutor: (payload: {
    nombreTutor: string;
    dniTutor: string;
    telefonoTutor: string;
    especialidad: string;
    nombreLugar: string;
    direccionLugar: string;
    zonaKey: string;
    actividadInicial: string;
    horaCaminata: string;
    horaEncuentro: string;
  }) => Promise<void>;
}

export default function PantallaLoginTutor({
  tutores,
  circuitos,
  jornadas,
  loading,
  onSelectTutor,
  onRegisterTutor,
}: LoginProps) {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [filtroDni, setFiltroDni] = useState("");

  const [form, setForm] = useState({
    nombreTutor: "",
    dniTutor: "",
    telefonoTutor: "+5493425001122",
    especialidad: "Profesional de Salud / Tutor",
    nombreLugar: "",
    direccionLugar: "",
    zonaKey: "candioti",
    actividadInicial: "Caminata Grupal, Torneo de Truco y Bingo",
    horaCaminata: "16:00",
    horaEncuentro: "16:20",
  });

  const tutoresFiltrados = tutores.filter((t) => {
    if (!filtroDni.trim()) return true;
    const q = filtroDni.toLowerCase();
    return (
      t.nombre.toLowerCase().includes(q) ||
      t.dni.toLowerCase().includes(q) ||
      (t.credencial_nro || "").toLowerCase().includes(q)
    );
  });

  const getCircuitosDeTutor = (tutorId: string): CircuitoBarrial[] => {
    const propios = circuitos.filter((c) =>
      (c.poliza_nro || "").includes(`tutor:${tutorId}`)
    );
    return propios.length > 0 ? propios : [circuitos[0]].filter(Boolean);
  };

  const handleSubmitRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreTutor || !form.nombreLugar) return;
    await onRegisterTutor(form);
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex flex-col">
      {/* Franja superior Sancor Seguros */}
      <div className="bg-[#a70355] text-white text-[11px] font-medium">
        <div className="max-w-[1200px] mx-auto px-4 py-1.5 flex items-center justify-between">
          <span>Programa de Longevidad Activa y Comunidad Barrial</span>
          <span>Sancor Seguros • Sancor Salud</span>
        </div>
      </div>

      {/* Navbar blanca */}
      <div className="bg-white border-b border-[#eaeced]">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/sancor-logo.svg"
              alt="Sancor Seguros"
              className="h-8 w-auto"
            />
            <span className="h-5 w-px bg-[#eaeced]" />
            <span className="text-sm font-bold text-[#363f48]">
              Acceso para Profesionales, Tutores y Organizadores
            </span>
          </div>
        </div>
      </div>

      {/* Contenedor central de ingreso / registro */}
      <main className="flex-1 max-w-[980px] w-full mx-auto px-4 py-6 sm:py-10 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-[#eaeced] shadow-xs overflow-hidden">
          {/* Selector de pestañas Ingresar vs Registrar */}
          <div className="grid grid-cols-2 border-b border-[#eaeced] bg-[#fdf9fb]">
            <button
              type="button"
              onClick={() => setModo("login")}
              className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                modo === "login"
                  ? "border-[#a70355] text-[#a70355] bg-white"
                  : "border-transparent text-[#52606d] hover:text-[#0a4494]"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Ingresar con mi cuenta</span>
            </button>

            <button
              type="button"
              onClick={() => setModo("registro")}
              className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                modo === "registro"
                  ? "border-[#a70355] text-[#a70355] bg-white"
                  : "border-transparent text-[#52606d] hover:text-[#0a4494]"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear cuenta y registrar lugar</span>
            </button>
          </div>

          {modo === "login" ? (
            <div className="p-5 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#363f48]">
                    Selecciona tu perfil de Organizador / Tutor
                  </h2>
                  <p className="text-xs text-[#52606d]">
                    Cada cuenta conserva sus lugares guardados (clubes, salas o vecinales), sus eventos y su padron de adultos mayores.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Buscar por nombre o DNI..."
                  value={filtroDni}
                  onChange={(e) => setFiltroDni(e.target.value)}
                  className="border border-[#c4c9cd] rounded-full px-4 py-2 text-xs text-[#363f48] w-full sm:w-64 focus:outline-none focus:border-[#0a4494]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tutoresFiltrados.map((tutor) => {
                  const sedes = getCircuitosDeTutor(tutor.id);
                  const sedesIds = sedes.map((s) => s.id);
                  const eventosTutor = jornadas.filter((j) =>
                    sedesIds.includes(j.circuito_id)
                  );

                  return (
                    <div
                      key={tutor.id}
                      className="border border-[#eaeced] hover:border-[#a70355] rounded-xl p-4 flex flex-col justify-between gap-4 transition bg-white"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[#a70355] bg-[#faf0f5] px-2.5 py-0.5 rounded-full">
                              {tutor.credencial_nro || "Tutor / Organizador"}
                            </span>
                            <h3 className="text-base font-bold text-[#363f48] mt-1">
                              {tutor.nombre}
                            </h3>
                          </div>
                          <span className="text-xs text-[#52606d] font-medium">
                            DNI {tutor.dni}
                          </span>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-[#eaeced] text-xs text-[#52606d]">
                          <div className="font-semibold text-[#363f48] flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#0a4494]" />
                            <span>Lugares administrados ({sedes.length}):</span>
                          </div>
                          {sedes.map((s) => (
                            <div
                              key={s.id}
                              className="pl-5 text-[11px] text-[#52606d] truncate"
                            >
                              • <strong>{s.nombre_club}</strong> ({s.direccion_club})
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#eaeced] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#52606d] flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#a70355]" />
                          <span>{eventosTutor.length} evento(s) activos</span>
                        </span>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            onSelectTutor(tutor.id, eventosTutor[0]?.id)
                          }
                          className="bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold text-xs px-5 py-2 rounded-full transition"
                        >
                          {loading ? "Ingresando..." : "Ingresar al panel"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitRegistro} className="p-5 sm:p-7 space-y-4 text-xs">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#363f48]">
                  Registrar nueva cuenta de Profesional / Tutor y Lugar de Encuentro
                </h2>
                <p className="text-xs text-[#52606d]">
                  Completa tus datos y el lugar (club, sala vecinal, centro de salud o espacio barrial) donde vas a organizar los encuentros.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Tu Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Lic. Sofia Pereyra"
                    value={form.nombreTutor}
                    onChange={(e) =>
                      setForm({ ...form, nombreTutor: e.target.value })
                    }
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    DNI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 30.456.789"
                    value={form.dniTutor}
                    onChange={(e) => setForm({ ...form, dniTutor: e.target.value })}
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Rol / Especialidad *
                  </label>
                  <select
                    value={form.especialidad}
                    onChange={(e) =>
                      setForm({ ...form, especialidad: e.target.value })
                    }
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="Profesional de Salud / Tutor">
                      Profesional de Salud / Tutor
                    </option>
                    <option value="Encargado de Club / Sala">
                      Encargado de Club / Sala
                    </option>
                    <option value="Vecino Padrino Organizador">
                      Vecino Padrino Organizador
                    </option>
                    <option value="Adulto Mayor Referente">
                      Adulto Mayor Referente
                    </option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[#eaeced] pt-3 space-y-3">
                <div className="font-bold text-[#0a4494] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#a70355]" />
                  <span>Datos del Lugar / Sala / Club de Encuentro</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Nombre del Lugar (Sala, Club, Vecinal) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Vecinal Sargento Cabral"
                      value={form.nombreLugar}
                      onChange={(e) =>
                        setForm({ ...form, nombreLugar: e.target.value })
                      }
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Direccion del Lugar *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Gral. Paz 5200, Santa Fe"
                      value={form.direccionLugar}
                      onChange={(e) =>
                        setForm({ ...form, direccionLugar: e.target.value })
                      }
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Zona / Barrio en el Mapa *
                    </label>
                    <select
                      value={form.zonaKey}
                      onChange={(e) =>
                        setForm({ ...form, zonaKey: e.target.value })
                      }
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="candioti">
                        Barrio Candioti Sur / Bv. Galvez
                      </option>
                      <option value="guadalupe">
                        Barrio Guadalupe / Costanera Este
                      </option>
                      <option value="parque_federal">
                        Parque Federal / Sargento Cabral
                      </option>
                      <option value="centro">
                        Centro / Parque Sur (Santa Fe)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Primer Evento / Actividad a organizar *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.actividadInicial}
                      onChange={(e) =>
                        setForm({ ...form, actividadInicial: e.target.value })
                      }
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Hora inicio caminata
                    </label>
                    <input
                      type="text"
                      value={form.horaCaminata}
                      onChange={(e) =>
                        setForm({ ...form, horaCaminata: e.target.value })
                      }
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Hora encuentro en el lugar
                    </label>
                    <input
                      type="text"
                      value={form.horaEncuentro}
                      onChange={(e) =>
                        setForm({ ...form, horaEncuentro: e.target.value })
                      }
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eaeced]">
                <button
                  type="button"
                  onClick={() => setModo("login")}
                  className="px-4 py-2 rounded-full border border-[#c4c9cd] text-[#52606d] font-semibold"
                >
                  Volver a cuentas existentes
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold px-6 py-2 rounded-full transition"
                >
                  {loading ? "Creando cuenta..." : "Crear cuenta e ingresar al panel"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
