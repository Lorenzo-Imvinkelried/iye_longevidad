"use client";

import React, { useState } from "react";
import {
  CircuitoBarrial,
  Jornada,
  Participante,
  SEED_IDS,
} from "@/types/domain";
import {
  Building2,
  KeyRound,
  LogIn,
  MapPin,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

interface LoginProps {
  tutores: Participante[];
  circuitos: CircuitoBarrial[];
  jornadas: Jornada[];
  loading: boolean;
  errorMessage?: string | null;
  onLoginConClave: (identificador: string, clave: string) => Promise<void>;
  onSelectDemoTutor: (tutorId: string, jornadaId?: string) => void;
  onRegisterTutor: (payload: {
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
  }) => Promise<void>;
}

export default function PantallaLoginTutor({
  tutores,
  circuitos,
  jornadas,
  loading,
  errorMessage,
  onLoginConClave,
  onSelectDemoTutor,
  onRegisterTutor,
}: LoginProps) {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [identificador, setIdentificador] = useState("");
  const [clave, setClave] = useState("");

  const [form, setForm] = useState({
    nombreTutor: "",
    dniTutor: "",
    claveTutor: "",
    telefonoTutor: "",
    especialidad: "Profesional de Salud / Tutor",
    nombreLugar: "",
    direccionLugar: "",
    zonaKey: "candioti",
    actividadInicial: "Caminata Grupal, Torneo de Truco y Bingo",
    horaCaminata: "18:00",
    horaEncuentro: "18:20",
  });

  // Solo las 2 cuentas semilla oficiales tienen acceso rapido Demo; cuentas creadas requieren DNI + clave
  const demoTutores = tutores.filter(
    (t) =>
      t.id === SEED_IDS.coordinadoraMarta || t.id === SEED_IDS.tutorRoberto
  );

  const getCircuitosDeTutor = (tutorId: string): CircuitoBarrial[] => {
    const propios = circuitos.filter((c) =>
      (c.poliza_nro || "").includes(`tutor:${tutorId}`)
    );
    return propios.length > 0 ? propios : [circuitos[0]].filter(Boolean);
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim() || !clave.trim()) return;
    await onLoginConClave(identificador, clave);
  };

  const handleSubmitRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreTutor || !form.nombreLugar || !form.claveTutor) return;
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
            <span className="text-xs sm:text-sm font-bold text-[#363f48]">
              Portal para Profesionales, Tutores y Organizadores
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#168003] bg-[#d0e6cd]/40 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Guardado en Supabase
          </span>
        </div>
      </div>

      {/* Contenedor central de ingreso / registro */}
      <main className="flex-1 max-w-[920px] w-full mx-auto px-4 py-6 sm:py-8 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-[#eaeced] shadow-xs overflow-hidden">
          {/* Selector de pestanas Ingresar vs Registrar */}
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

          {errorMessage && (
            <div className="mx-5 sm:mx-7 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          {modo === "login" ? (
            <div className="p-5 sm:p-7 space-y-6">
              {/* Formulario de Login privado con DNI/Usuario + Clave */}
              <form
                onSubmit={handleSubmitLogin}
                className="bg-[#f6f6f7] border border-[#eaeced] rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#a70355]" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#363f48]">
                      Acceso Privado por DNI o Usuario
                    </h2>
                    <p className="text-[11px] text-[#52606d]">
                      Ingresa tu DNI (o nombre completo) y tu clave para ver unicamente tus lugares, eventos y lista de abuelos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
                  <div className="sm:col-span-5">
                    <label className="font-semibold text-[#363f48] block mb-1">
                      DNI o Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 16.402.881 o tu DNI registrado"
                      value={identificador}
                      onChange={(e) => setIdentificador(e.target.value)}
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white text-[#363f48]"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Clave / PIN *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Ej: 1234"
                      value={clave}
                      onChange={(e) => setClave(e.target.value)}
                      className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white text-[#363f48]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold text-xs py-2.5 px-4 rounded-full transition"
                    >
                      {loading ? "Verificando..." : "Ingresar"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Seccion Demo Rapido */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#52606d]">
                    Acceso rapido Demo (Cuentas de ejemplo — Clave: 1234)
                  </h3>
                  <span className="text-[11px] text-[#52606d]">
                    {tutores.length} organizadores registrados en Supabase
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {demoTutores.map((tutor) => {
                    const sedes = getCircuitosDeTutor(tutor.id);
                    const sedesIds = sedes.map((s) => s.id);
                    const eventosTutor = jornadas.filter((j) =>
                      sedesIds.includes(j.circuito_id)
                    );

                    return (
                      <div
                        key={tutor.id}
                        className="border border-[#eaeced] hover:border-[#a70355] rounded-xl p-4 flex flex-col justify-between gap-3 transition bg-white"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[#a70355] bg-[#faf0f5] px-2.5 py-0.5 rounded-full">
                                {tutor.credencial_nro || "Tutor / Organizador"}
                              </span>
                              <h4 className="text-sm font-bold text-[#363f48] mt-1">
                                {tutor.nombre}
                              </h4>
                            </div>
                            <span className="text-[11px] text-[#52606d] font-medium">
                              DNI {tutor.dni}
                            </span>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-[#eaeced] text-xs text-[#52606d]">
                            <div className="font-semibold text-[#363f48] flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#0a4494]" />
                              <span>Lugares ({sedes.length}):</span>
                            </div>
                            {sedes.map((s) => (
                              <div
                                key={s.id}
                                className="pl-5 text-[11px] text-[#52606d] truncate"
                              >
                                • <strong>{s.nombre_club}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#eaeced] flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#52606d] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#a70355]" />
                            <span>{eventosTutor.length} evento(s)</span>
                          </span>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              onSelectDemoTutor(tutor.id, eventosTutor[0]?.id)
                            }
                            className="border border-[#0a4494] text-[#0a4494] hover:bg-[#0a4494] hover:text-white font-semibold text-xs px-4 py-1.5 rounded-full transition"
                          >
                            Entrar en Demo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitRegistro}
              className="p-5 sm:p-7 space-y-4 text-xs"
            >
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#363f48]">
                  Crear Cuenta (Sin confirmacion por email) y Registrar Lugar
                </h2>
                <p className="text-xs text-[#52606d]">
                  Elegi tu DNI/Usuario y una clave personal. Tu perfil y sede quedan guardados al instante en Supabase para ver unicamente tus lugares, eventos y lista de abuelos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
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
                    DNI o Usuario *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 30.456.789"
                    value={form.dniTutor}
                    onChange={(e) =>
                      setForm({ ...form, dniTutor: e.target.value })
                    }
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Clave / PIN *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="Min. 4 caracteres"
                    value={form.claveTutor}
                    onChange={(e) =>
                      setForm({ ...form, claveTutor: e.target.value })
                    }
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
                      Primer Evento / Actividad *
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
                      Hora encuentro en sede
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
                  Volver a ingresar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold px-6 py-2 rounded-full transition"
                >
                  {loading ? "Guardando..." : "Crear cuenta e ingresar al panel"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
