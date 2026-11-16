import React from "react";
import { readStateAsync } from "@/lib/store";
import { sanitizeSnapshotForClient } from "@/lib/domain-helpers";
import DashboardCoordinador from "@/components/DashboardCoordinador";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSnapshot = sanitizeSnapshotForClient(await readStateAsync());
  return <DashboardCoordinador initialSnapshot={initialSnapshot} />;
}
