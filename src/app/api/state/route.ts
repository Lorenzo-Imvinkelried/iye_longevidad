import { NextRequest, NextResponse } from "next/server";
import {
  acreditarNuevoVecinoPadrino,
  aprobarAltaDerivacionFamiliar,
  crearSolicitudNietoFamiliar,
  dispararConvocatoriaJornada,
  frenarSalidaAdultoPorSeguridad,
  readState,
  reasignarTutorManualCoordinador,
  resetState,
  suspenderJornadaPorEmergencia,
  validarPresenciaEnClub,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = readState();
  return NextResponse.json(snapshot);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "lanzar_convocatoria": {
        const snapshot = await dispararConvocatoriaJornada();
        return NextResponse.json({ ok: true, snapshot });
      }
      case "suspender_emergencia": {
        const snapshot = await suspenderJornadaPorEmergencia(body.motivo);
        return NextResponse.json({ ok: true, snapshot });
      }
      case "reasignar_tutor": {
        const snapshot = await reasignarTutorManualCoordinador(
          body.adultoId,
          body.nuevoPadrinoId
        );
        return NextResponse.json({ ok: true, snapshot });
      }
      case "frenar_salida": {
        const snapshot = await frenarSalidaAdultoPorSeguridad(body.adultoId);
        return NextResponse.json({ ok: true, snapshot });
      }
      case "validar_club": {
        const ids: string[] = Array.isArray(body.participanteIds)
          ? body.participanteIds
          : [body.participanteId];
        const snapshot = await validarPresenciaEnClub(ids);
        return NextResponse.json({ ok: true, snapshot });
      }
      case "aprobar_solicitud_familiar": {
        const snapshot = await aprobarAltaDerivacionFamiliar(
          body.participanteId,
          body.padrinoId
        );
        return NextResponse.json({ ok: true, snapshot });
      }
      case "crear_solicitud_familiar": {
        const snapshot = await crearSolicitudNietoFamiliar(body.payload);
        return NextResponse.json({ ok: true, snapshot });
      }
      case "acreditar_padrino": {
        const snapshot = await acreditarNuevoVecinoPadrino(body.payload);
        return NextResponse.json({ ok: true, snapshot });
      }
      case "reset_demo": {
        const snapshot = resetState();
        return NextResponse.json({ ok: true, snapshot });
      }
      default:
        return NextResponse.json(
          { ok: false, error: `Acción desconocida: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    console.error("Error en /api/state:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error procesando acción",
      },
      { status: 500 }
    );
  }
}
