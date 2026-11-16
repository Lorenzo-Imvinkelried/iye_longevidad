"use client";

import React from "react";

interface FooterInstitucionalProps {
  maxWidthClass?: string;
}

export default function FooterInstitucional({
  maxWidthClass = "max-w-[1600px]",
}: FooterInstitucionalProps) {
  return (
    <footer className="bg-[#f6f6f7] border-t border-[#eaeced] shrink-0">
      <div
        className={`${maxWidthClass} mx-auto px-3 sm:px-5 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <img
            title="Grupo Sancor Seguros"
            alt="Grupo Sancor Seguros"
            src="/logos/marca-GSS.svg"
            width={246}
            height={48}
            className="h-7 sm:h-8 w-auto shrink-0 self-start sm:self-auto"
          />
          <p className="text-[11px] leading-snug text-[#52606d]">
            <a
              title="Términos y condiciones"
              href="https://www.sancorseguros.com.ar/terminos-condiciones"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a70355] hover:underline font-medium"
            >
              Términos y condiciones
            </a>{" "}
            |{" "}
            <a
              title="Políticas de privacidad"
              href="https://www.sancorseguros.com.ar/politicas-privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a70355] hover:underline font-medium"
            >
              Políticas de privacidad
            </a>{" "}
            | Grupo Sancor Seguros.{" "}
            <span className="block sm:inline">
              Todos los derechos reservados. Copyright 2026. Argentina.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/logos/logo-QR.png"
            title="logo QR"
            alt="Logo QR"
            width={26}
            height={36}
            className="h-8 w-auto"
          />
          <img
            src="/logos/logo-PDP.jpg"
            title="logo PDP"
            alt="Logo PDP"
            width={26}
            height={36}
            className="h-8 w-auto mix-blend-multiply"
          />
          <img
            src="/logos/logo_SSN.svg"
            title="logo SSN"
            alt="Logo SSN"
            width={160}
            height={23}
            className="h-6 sm:h-7 w-auto"
          />
        </div>
      </div>
    </footer>
  );
}
