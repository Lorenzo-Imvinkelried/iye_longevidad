import { NextRequest, NextResponse } from "next/server";
import {
  acreditarNuevoVecinoPadrino,
  actualizarRutaCircuito,
  aprobarAltaDerivacionFamiliar,
  crearNuevoEventoOLugar,
  crearSolicitudNietoFamiliar,
  dispararConvocatoriaJornada,
  frenarSalidaAdultoPorSeguridad,
  loginTutorConClave,
  readStateAsync,
  reasignarTutorManualCoordinador,
  registrarNuevoTutorYLugar,
  resetStateAsync,
  seleccionarEventoActivo,
  suspenderJornadaPorEmergencia,
  validarPresenciaEnClub,
  vincularAbueloExistenteAEvento,
} from "@/lib/store";
import {
  projectSnapshotForTutor,
  sanitizeSnapshotForClient,
} from "@/lib/domain-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tutorId = searchParams.get("tutorId");
  const jornadaId = searchParams.get("jornadaId");

  const raw = await readStateAsync();
  const projected = tutorId
    ? projectSnapshotForTutor(raw, tutorId, jornadaId)
    : raw;

  return NextResponse.json(sanitizeSnapshotForClient(projected));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, activeTutorId, activeJornadaId } = body;

    const finalize = (rawSnapshot: Awaited<ReturnType<typeof readStateAsync>>) => {
      const projected = activeTutorId
        ? projectSnapshotForTutor(
            rawSnapshot,
            activeTutorId,
            activeJornadaId || rawSnapshot.jornada.id
          )
        : rawSnapshot;
      return sanitizeSnapshotForClient(projected);
    };

    switch (action) {
      case "login_tutor": {
        const result = await loginTutorConClave({
          identificador: body.identificador || "",
          clave: body.clave || "",
        });
        if (!result.ok || !result.snapshot) {
          return NextResponse.json(
            { ok: false, error: result.error || "Credenciales invalidas." },
            { status: 401 }
          );
        }
        return NextResponse.json({
          ok: true,
          tutorId: result.tutorId,
          snapshot: sanitizeSnapshotForClient(result.snapshot),
        });
      }
      case "seleccionar_evento": {
        const snapshot = await seleccionarEventoActivo({
          jornadaId: body.jornadaId,
          tutorId: body.tutorId,
        });
        return NextResponse.json({
          ok: true,
          snapshot: sanitizeSnapshotForClient(
            projectSnapshotForTutor(
              snapshot,
              body.tutorId || activeTutorId,
              body.jornadaId || snapshot.jornada.id
            )
          ),
        });
      }
      case "registrar_tutor_lugar": {
        if (!activeTutorId) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Solo un coordinador acreditado con sesion iniciada puede habilitar nuevos coordinadores.",
            },
            { status: 403 }
          );
        }
        const currentRaw = await readStateAsync();
        const esCoordinadorValido = currentRaw.participantes.some(
          (p) => p.id === activeTutorId && p.rol === "coordinador"
        );
        if (!esCoordinadorValido) {
          return NextResponse.json(
            {
              ok: false,
              error: "Cuenta sin permisos de acreditacion.",
            },
            { status: 403 }
          );
        }
        const snapshot = await registrarNuevoTutorYLugar({
          ...body.payload,
          keepCurrentSession: true,
        });
        return NextResponse.json({
          ok: true,
          snapshot: finalize(snapshot),
        });
      }
      case "crear_evento_lugar": {
        const snapshot = await crearNuevoEventoOLugar(body.payload);
        return NextResponse.json({
          ok: true,
          snapshot: sanitizeSnapshotForClient(snapshot),
        });
      }
      case "actualizar_ruta_circuito": {
        const snapshot = await actualizarRutaCircuito({
          circuitoId: body.circuitoId,
          paradasSeguras: body.paradasSeguras,
          rutaPolilinea: body.rutaPolilinea,
        });
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "vincular_abuelo_evento": {
        const snapshot = await vincularAbueloExistenteAEvento({
          adultoId: body.adultoId,
          jornadaId: body.jornadaId || activeJornadaId,
        });
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "lanzar_convocatoria": {
        const snapshot = await dispararConvocatoriaJornada(
          body.jornadaId || activeJornadaId
        );
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "suspender_emergencia": {
        const snapshot = await suspenderJornadaPorEmergencia(
          body.motivo,
          body.jornadaId || activeJornadaId
        );
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "reasignar_tutor": {
        const snapshot = await reasignarTutorManualCoordinador(
          body.adultoId,
          body.nuevoPadrinoId,
          body.jornadaId || activeJornadaId
        );
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "frenar_salida": {
        const snapshot = await frenarSalidaAdultoPorSeguridad(
          body.adultoId,
          body.jornadaId || activeJornadaId
        );
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "validar_club": {
        const ids: string[] = Array.isArray(body.participanteIds)
          ? body.participanteIds
          : [body.participanteId];
        const snapshot = await validarPresenciaEnClub(
          ids,
          body.jornadaId || activeJornadaId
        );
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "aprobar_solicitud_familiar": {
        const snapshot = await aprobarAltaDerivacionFamiliar(
          body.participanteId,
          body.padrinoId,
          body.jornadaId || activeJornadaId
        );
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "crear_solicitud_familiar": {
        const snapshot = await crearSolicitudNietoFamiliar({
          ...body.payload,
          jornadaId: body.jornadaId || activeJornadaId,
        });
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "acreditar_padrino": {
        const snapshot = await acreditarNuevoVecinoPadrino(body.payload);
        return NextResponse.json({ ok: true, snapshot: finalize(snapshot) });
      }
      case "reset_demo": {
        const snapshot = await resetStateAsync();
        return NextResponse.json({
          ok: true,
          snapshot: sanitizeSnapshotForClient(snapshot),
        });
      }
      default:
        return NextResponse.json(
          { ok: false, error: `Accion desconocida: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    console.error("Error en /api/state:", err);
    const message =
      err instanceof Error ? err.message : "Error procesando accion";
    const status =
      message.includes("Superposicion") ||
      message.includes("No se puede") ||
      message.includes("Ya existe")
        ? 409
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
