"use client";

import React from "react";

export default function TabMetricasImpacto() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-[#eaeced] border-l-4 border-l-[#a70355]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-wider text-[#a70355]">
              Modelo de Sostenibilidad • Sancor Seguros / Sancor Salud
            </div>
            <h2 className="text-lg font-bold text-[#363f48]">
              Prevencion Barrial y Longevidad Activa vs. Siniestralidad por Caidas
            </h2>
            <p className="text-xs text-[#52606d] leading-relaxed">
              Promover salidas acompanadas, puntos de encuentro accesibles y participacion comunitaria en red permite prevenir el aislamiento y reducir el riesgo de caidas graves e internaciones evitables.
            </p>
          </div>

          <div className="bg-[#fdf9fb] border border-[#edcddd] rounded-xl px-5 py-3 text-center shrink-0">
            <div className="text-[11px] uppercase font-semibold text-[#a70355]">
              Impacto Preventivo Sancor
            </div>
            <div className="text-2xl font-bold text-[#0a4494] mt-0.5">14,2x</div>
            <div className="text-[11px] text-[#52606d]">
              Retorno en prevencion
            </div>
          </div>
        </div>
      </div>

      {/* 4 Indicadores Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#eaeced]">
          <div className="text-xs font-semibold text-[#52606d]">
            Adultos Nivel 1 Activados
          </div>
          <div className="text-2xl font-bold text-[#363f48] mt-1">42</div>
          <div className="text-xs text-[#168003] font-medium mt-1">
            86% pasa a Nivel 2 en 6 semanas
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#eaeced]">
          <div className="text-xs font-semibold text-[#52606d]">
            Adherencia Mensual
          </div>
          <div className="text-2xl font-bold text-[#363f48] mt-1">88,4%</div>
          <div className="text-xs text-[#52606d] mt-1">
            Canal WhatsApp 1 a 1 sin descargas
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#eaeced]">
          <div className="text-xs font-semibold text-[#52606d]">
            Asistencias Validadas / Mes
          </div>
          <div className="text-2xl font-bold text-[#a70355] mt-1">568</div>
          <div className="text-xs text-[#52606d] mt-1">
            Encuentros semanales en red
          </div>
        </div>

        <div className="bg-[#fdf9fb] p-4 rounded-xl border border-[#edcddd]">
          <div className="text-xs font-semibold text-[#a70355]">
            Ahorro Estimado Sancor / Mes
          </div>
          <div className="text-2xl font-bold text-[#0a4494] mt-1">$21.600.000</div>
          <div className="text-xs text-[#168003] font-semibold mt-1">
            2,2 internaciones por caidas evitadas
          </div>
        </div>
      </div>

      {/* Resumen de propuesta de valor para los 3 actores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#eaeced] space-y-1.5">
          <h3 className="text-xs font-bold uppercase text-[#0a4494]">
            1. Adulto Mayor y Padrino
          </h3>
          <p className="text-xs text-[#52606d] leading-relaxed">
            Salen del aislamiento con acompanamiento seguro puerta a puerta (Ficha de Seguridad), sin descargar aplicaciones y fortaleciendo el vinculo barrial.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#eaeced] space-y-1.5">
          <h3 className="text-xs font-bold uppercase text-[#a70355]">
            2. Club / Centro de Jubilados
          </h3>
          <p className="text-xs text-[#52606d] leading-relaxed">
            Recibe cobertura de Responsabilidad Civil (RC) de Sancor Seguros, certificacion de espacio cardioprotegido y mayor flujo de socios activos.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#eaeced] space-y-1.5">
          <h3 className="text-xs font-bold uppercase text-[#0a4494]">
            3. Sancor Seguros / Sancor Salud
          </h3>
          <p className="text-xs text-[#52606d] leading-relaxed">
            Reduce la siniestralidad grave (fracturas de cadera e internaciones evitables) y fideliza a toda la red familiar dentro de la Silver Economy.
          </p>
        </div>
      </div>
    </div>
  );
}
