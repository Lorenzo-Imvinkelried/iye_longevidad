import React from "react";
import { readState } from "@/lib/store";
import DashboardCoordinador from "@/components/DashboardCoordinador";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const initialSnapshot = readState();
  return <DashboardCoordinador initialSnapshot={initialSnapshot} />;
}
