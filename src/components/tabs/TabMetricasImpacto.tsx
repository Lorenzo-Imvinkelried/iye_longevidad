"use client";

import React from "react";

export default function TabMetricasImpacto() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-wider text-[#004b87]">
              Modelo de Sostenibilidad • Sancor Seguros / Sancor Salud
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Inversion Preventiva en Farmacias vs. Costo de Siniestralidad por Caidas
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              El costo de otorgar reintegros diarios de $2.500 en farmacias de cercania es minimo frente a los mas de $9.800.000 ARS que representa una sola internacion, cirugia de protesis y rehabilitacion por fractura de cadera evitable.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-center shrink-0">
            <div className="text-[11px] uppercase font-semibold text-slate-500">
              ROI Preventivo Sancor
            </div>
            <div className="text-2xl font-bold text-[#004b87] mt-0.5">14,2x</div>
            <div className="text-[11px] text-slate-500">
              Retorno por peso invertido
            </div>
          </div>
        </div>
      </div>

      {/* 4 Indicadores Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">
            Adultos Nivel 1 Activados
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">42</div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            86% pasa a Nivel 2 en 6 semanas
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">
            Adherencia Mensual
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">88,4%</div>
          <div className="text-xs text-slate-600 mt-1">
            Canal WhatsApp 1 a 1 sin descargas
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">
            Reintegros Entregados / Mes
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">$1.420.000</div>
          <div className="text-xs text-slate-600 mt-1">
            Canjeados en farmacias barriales
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
          <div className="text-xs font-semibold text-emerald-900">
            Ahorro Estimado Sancor / Mes
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">$21.600.000</div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            2,2 internaciones por caidas evitadas
          </div>
        </div>
      </div>

      {/* Resumen de propuesta de valor para los 3 actores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
          <h3 className="text-xs font-bold uppercase text-slate-800">
            1. Adulto Mayor y Padrino
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Salen del aislamiento con acompanamiento seguro puerta a puerta (Ficha de Seguridad), sin descargar aplicaciones y recibiendo descuento directo en farmacias.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
          <h3 className="text-xs font-bold uppercase text-slate-800">
            2. Club / Centro de Jubilados
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Recibe cobertura de Responsabilidad Civil (RC) de Sancor Seguros, certificacion de espacio cardioprotegido y mayor flujo de socios activos.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
          <h3 className="text-xs font-bold uppercase text-slate-800">
            3. Sancor Seguros / Sancor Salud
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Reduce la siniestralidad grave (fracturas de cadera e internaciones evitables) y fideliza a toda la red familiar dentro de la Silver Economy.
          </p>
        </div>
      </div>
    </div>
  );
}
