import React from "react";
import { readStateAsync } from "@/lib/store";
import DashboardCoordinador from "@/components/DashboardCoordinador";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSnapshot = await readStateAsync();
  return <DashboardCoordinador initialSnapshot={initialSnapshot} />;
}
