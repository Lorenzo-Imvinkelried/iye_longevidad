import React from "react";
import { cookies } from "next/headers";
import { readStateAsync } from "@/lib/store";
import {
  projectSnapshotForTutor,
  sanitizeSnapshotForClient,
} from "@/lib/domain-helpers";
import DashboardCoordinador from "@/components/DashboardCoordinador";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_KEY = "sancor_tutor_session_v2";

export default async function HomePage() {
  const raw = await readStateAsync();
  const cookieStore = cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_KEY)?.value;

  let initialTutorId: string | null = null;
  let initialJornadaId: string | null = null;

  if (rawCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawCookie)) as {
        tutorId?: string;
        jornadaId?: string;
      };
      if (
        parsed?.tutorId &&
        raw.participantes.some(
          (p) => p.id === parsed.tutorId && p.rol === "coordinador"
        )
      ) {
        initialTutorId = parsed.tutorId;
        initialJornadaId = parsed.jornadaId || null;
      }
    } catch {
      // Ignore malformed session cookie
    }
  }

  const projected = initialTutorId
    ? projectSnapshotForTutor(raw, initialTutorId, initialJornadaId)
    : raw;

  return (
    <DashboardCoordinador
      initialSnapshot={sanitizeSnapshotForClient(projected)}
      initialTutorId={initialTutorId}
      initialJornadaId={initialJornadaId}
    />
  );
}
