import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panel de Coordinacion Barrial | Sancor Seguros / Sancor Salud",
  description:
    "Red Comunitaria de Movimiento Activo y Pertenencia Barrial — Sancor Seguros / Sancor Salud.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={montserrat.className}>
      <body className="antialiased bg-[#f6f6f7] text-[#363f48] selection:bg-[#a70355] selection:text-white">
        {children}
      </body>
    </html>
  );
}
