import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:
    "Nos encontramos al paso — Red Comunitaria de Movimiento Activo y Pertenencia Barrial | Sancor Seguros / Sancor Salud",
  description:
    "Prototipo Funcional de Alta Fidelidad (MVP de Servicio) para Longevidad Activa (Silver Economy) — UTN Facultad Regional Santa Fe (Equipo 5).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-sky-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
