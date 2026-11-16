"use client";

import React, { useState } from "react";
import { CircuitoBarrial, Participante } from "@/types/domain";
import FooterInstitucional from "@/components/layout/FooterInstitucional";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

interface LoginProps {
  tutores: Participante[];
  circuitos: CircuitoBarrial[];
  loading: boolean;
  errorMessage?: string | null;
  onLoginConClave: (identificador: string, clave: string) => Promise<void>;
}

export default function PantallaLoginTutor({
  tutores,
  circuitos,
  loading,
  errorMessage,
  onLoginConClave,
}: LoginProps) {
  const [identificador, setIdentificador] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [busquedaCoord, setBusquedaCoord] = useState("");

  const getCircuitosDeTutor = (tutorId: string): CircuitoBarrial[] => {
    return circuitos.filter((c) => {
      const pol = c.poliza_nro || "";
      return pol.includes(`tutor:${tutorId}`);
    });
  };

  const tutoresFiltrados = tutores.filter((t) => {
    if (!busquedaCoord.trim()) return true;
    const q = busquedaCoord.toLowerCase();
    const sedes = getCircuitosDeTutor(t.id)
      .map((s) => `${s.nombre_club} ${s.direccion_club}`.toLowerCase())
      .join(" ");
    return (
      t.nombre.toLowerCase().includes(q) ||
      (t.credencial_nro || "").toLowerCase().includes(q) ||
      (t.notas_vulnerabilidad || "").toLowerCase().includes(q) ||
      sedes.includes(q)
    );
  });

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim() || !clave.trim()) return;
    await onLoginConClave(identificador, clave);
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#f6f6f7] flex flex-col lg:overflow-hidden">
      {/* Franja superior Sancor Seguros */}
      <div className="bg-[#a70355] text-white text-[11px] font-medium shrink-0">
        <div className="max-w-[1200px] mx-auto px-4 py-1 flex items-center justify-between">
          <span>Programa de Longevidad Activa y Comunidad Barrial</span>
          <span>Sancor Seguros • Sancor Salud</span>
        </div>
      </div>

      {/* Navbar blanca limpia */}
      <div className="bg-white border-b border-[#eaeced] shrink-0">
        <div className="max-w-[1200px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/sancor-logo.svg"
              alt="Sancor Seguros"
              width={110}
              height={28}
              className="h-7 w-auto"
            />
            <span className="h-5 w-px bg-[#eaeced]" />
            <span className="text-xs sm:text-sm font-bold text-[#363f48]">
              Panel de Coordinacion Barrial
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0a4494] bg-[#cedaea]/35 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Red Acreditada Sancor
          </span>
        </div>
      </div>

      {/* Contenedor central (sin scroll general en desktop; solo scrollea la lista de coordinadores) */}
      <main className="flex-1 min-h-0 max-w-[1000px] w-full mx-auto px-4 py-3 sm:py-4 flex flex-col gap-3">
        {/* Card unica de Ingreso con mi cuenta */}
        <section className="bg-white rounded-2xl border border-[#eaeced] shadow-xs overflow-hidden shrink-0">
          <div className="px-5 py-2.5 border-b border-[#eaeced] bg-[#fdf9fb] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-[#a70355]" />
              <h1 className="text-sm sm:text-base font-bold text-[#363f48]">
                Ingresar con mi cuenta
              </h1>
            </div>
            <span className="hidden md:inline text-[11px] text-[#52606d]">
              Acceso exclusivo para coordinadores acreditados
            </span>
          </div>

          <form onSubmit={handleSubmitLogin} className="px-5 py-3.5 space-y-2.5">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
              <div className="sm:col-span-5">
                <label className="font-semibold text-[#363f48] block mb-1">
                  DNI o Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ingresa tu DNI acreditado"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-2 bg-white text-[#363f48]"
                />
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="login-clave-pin"
                  className="font-semibold text-[#363f48] block mb-1"
                >
                  Clave / PIN *
                </label>
                <div className="relative">
                  <input
                    id="login-clave-pin"
                    type={mostrarClave ? "text" : "password"}
                    required
                    placeholder="Tu clave personal"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    className="w-full border border-[#c4c9cd] rounded-lg pl-3 pr-9 py-2 bg-white text-[#363f48]"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarClave((v) => !v)}
                    aria-label={mostrarClave ? "Ocultar clave" : "Ver clave"}
                    title={mostrarClave ? "Ocultar clave" : "Ver clave"}
                    className="absolute inset-y-0 right-0 px-2.5 flex items-center text-[#52606d] hover:text-[#0a4494] transition"
                  >
                    {mostrarClave ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold text-xs py-2 px-4 rounded-full transition flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{loading ? "Verificando..." : "Ingresar"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#eaeced] text-[11px] text-[#52606d]">
              El registro de nuevos coordinadores se habilita previa validacion presencial de DNI y sede a traves de la administracion de Sancor / Club.
            </div>
          </form>
        </section>

        {/* Directorio informativo de coordinadores actuales (solo lectura, scrollea internamente) */}
        <section className="flex-1 min-h-0 bg-white rounded-2xl border border-[#eaeced] shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-2.5 border-b border-[#eaeced] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#363f48] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#a70355] shrink-0" />
                <span>Coordinadores Actuales ({tutores.length})</span>
              </h2>
              <p className="text-[11px] text-[#52606d] truncate">
                Consulta quienes coordinan cada club, sala o punto de encuentro barrial.
              </p>
            </div>

            <input
              type="text"
              aria-label="Buscar coordinadores por nombre, barrio o sede"
              placeholder="Buscar por nombre, barrio o sede..."
              value={busquedaCoord}
              onChange={(e) => setBusquedaCoord(e.target.value)}
              className="border border-[#c4c9cd] rounded-full px-3.5 py-1.5 text-xs text-[#363f48] w-full sm:w-64 shrink-0 focus:outline-none focus:border-[#0a4494]"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4">
            {tutoresFiltrados.length === 0 ? (
              <p className="text-xs text-[#52606d] text-center py-4">
                No se encontraron coordinadores con ese filtro.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tutoresFiltrados.map((tutor) => {
                  const sedes = getCircuitosDeTutor(tutor.id);
                  const perfilCoordinador = (tutor.credencial_nro || "")
                    .replace(/\s*\/\s*Tutor(\s+Sancor)?/gi, "")
                    .trim();

                  return (
                    <div
                      key={tutor.id}
                      className="border border-[#eaeced] rounded-xl p-3 bg-[#f6f6f7]/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[#a70355] bg-[#faf0f5] px-2 py-0.5 rounded-full">
                            Coordinador
                          </span>
                          <h3 className="text-sm font-bold text-[#363f48] mt-1 truncate">
                            {tutor.nombre}
                          </h3>
                          {(perfilCoordinador || tutor.notas_vulnerabilidad) && (
                            <p className="text-[11px] text-[#52606d] mt-0.5 leading-snug">
                              {perfilCoordinador && (
                                <span className="font-semibold text-[#0a4494]">
                                  {perfilCoordinador}
                                </span>
                              )}
                              {perfilCoordinador && tutor.notas_vulnerabilidad && " • "}
                              {tutor.notas_vulnerabilidad}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-[#168003] bg-[#d0e6cd]/40 border border-[#a2cc9a] px-2 py-0.5 rounded-full shrink-0">
                          Acreditado
                        </span>
                      </div>

                      <div className="space-y-1 pt-1.5 border-t border-[#eaeced] text-xs text-[#52606d]">
                        {sedes.length === 0 ? (
                          <div className="text-[11px] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#0a4494] shrink-0" />
                            <span className="truncate">{tutor.direccion}</span>
                          </div>
                        ) : (
                          sedes.map((s) => (
                            <div key={s.id} className="space-y-0.5">
                              <div className="font-semibold text-[#363f48] text-xs flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#0a4494] shrink-0" />
                                <span className="truncate">{s.nombre_club}</span>
                              </div>
                              <div className="pl-5 text-[11px] text-[#52606d] truncate">
                                {s.direccion_club} • {s.nombre_barrio}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <FooterInstitucional maxWidthClass="max-w-[1200px]" />
    </div>
  );
}
