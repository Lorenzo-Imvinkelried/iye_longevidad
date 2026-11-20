"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Coords,
  ModalidadElegida,
  Participante,
  SystemSnapshot,
} from "@/types/domain";
import {
  formatDistanceMeters,
  getDistanceMeters,
  getParticipanteAvatarUrl,
  getParticipantRewardInfo,
  getSeniorCentrosDistances,
  isSeniorNearForWalking,
} from "@/lib/domain-helpers";
import { compressImageFileToDataUrl } from "@/components/modals/ModalDerivacionFamiliar";
import { useGlobalLoading } from "@/components/modals/ModalCargando";
import {
  ArrowLeft,
  Award,
  Camera,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";

interface ModalPerfilProps {
  participanteId: string | null;
  snapshot: SystemSnapshot;
  loadingAction: string | null;
  onClose: () => void;
  onOpenPhone: (participanteId: string) => void;
  onExecuteAction: (
    action: string,
    payload?: Record<string, unknown>
  ) => Promise<{ ok?: boolean; error?: string } | void> | void;
}

export default function ModalPerfilParticipante({
  participanteId,
  snapshot,
  loadingAction,
  onClose,
  onOpenPhone,
  onExecuteAction,
}: ModalPerfilProps) {
  const { withLoading } = useGlobalLoading();
  const savingRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { circuito, jornada, circuitos, jornadas, participantes, asistencias } =
    snapshot;

  const participante: Participante | undefined = participanteId
    ? participantes.find((p) => p.id === participanteId)
    : undefined;

  const asisActual = participante
    ? asistencias.find(
        (a) =>
          a.jornada_id === jornada.id && a.participante_id === participante.id
      )
    : undefined;

  const padrinosAcreditados = participantes.filter(
    (p) => p.rol === "padrino" && p.acreditado_por_club
  );
  const adultosActivosAll = participantes.filter(
    (p) => p.rol === "adulto_mayor" && p.estado_alta === "activo"
  );

  const [form, setForm] = useState<{
    nombre: string;
    edad: number;
    dni: string;
    telefono: string;
    direccion: string;
    originalDireccion: string;
    credencialNro: string;
    contactoFamiliarNombre: string;
    contactoFamiliarTel: string;
    notasVulnerabilidad: string;
    avatarUrl: string;
    padrinoPreferidoId: string;
    adultosAsignadosIds: string[];
    modalidadElegida: ModalidadElegida;
    paradaEsquinaId: string;
  }>({
    nombre: "",
    edad: 70,
    dni: "",
    telefono: "",
    direccion: "",
    originalDireccion: "",
    credencialNro: "",
    contactoFamiliarNombre: "",
    contactoFamiliarTel: "",
    notasVulnerabilidad: "",
    avatarUrl: "",
    padrinoPreferidoId: "",
    adultosAsignadosIds: [],
    modalidadElegida: "sin_respuesta",
    paradaEsquinaId: "",
  });

  useEffect(() => {
    if (participante) {
      setIsEditing(false);
      setErrorMsg(null);
      setForm({
        nombre: participante.nombre,
        edad: participante.edad,
        dni: participante.dni,
        telefono: participante.telefono,
        direccion: participante.direccion,
        originalDireccion: participante.direccion,
        credencialNro: participante.credencial_nro || "",
        contactoFamiliarNombre: participante.contacto_familiar_nombre || "",
        contactoFamiliarTel: participante.contacto_familiar_tel || "",
        notasVulnerabilidad: participante.notas_vulnerabilidad || "",
        avatarUrl: getParticipanteAvatarUrl(participante),
        padrinoPreferidoId:
          asisActual?.padrino_asignado_id ||
          participante.padrino_preferido_id ||
          "",
        adultosAsignadosIds: adultosActivosAll
          .filter((a) => a.padrino_preferido_id === participante.id)
          .map((a) => a.id),
        modalidadElegida: asisActual?.modalidad_elegida || "sin_respuesta",
        paradaEsquinaId:
          asisActual?.parada_esquina_id || circuito.paradas_seguras[0]?.id || "",
      });
    }
  }, [participanteId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!participanteId || !participante) return null;

  const esPadrino = participante.rol === "padrino";
  const avatarUrl = getParticipanteAvatarUrl(participante);
  const reward = getParticipantRewardInfo(participante);
  const canWalkHere = isSeniorNearForWalking(
    participante.coords_domicilio,
    circuito.coords_club
  );
  const distClubActual = formatDistanceMeters(
    getDistanceMeters(participante.coords_domicilio, circuito.coords_club)
  );
  const centrosDist = getSeniorCentrosDistances(
    participante,
    circuitos || [circuito],
    jornadas || [jornada],
    asistencias,
    circuito
  );
  const padrinoAsignado = participantes.find(
    (p) =>
      p.id ===
      (asisActual?.padrino_asignado_id || participante.padrino_preferido_id)
  );
  const acompanamientosPadrino = esPadrino
    ? asistencias.filter(
        (a) =>
          a.jornada_id === jornada.id &&
          a.modalidad_elegida === "nivel_1_puerta" &&
          a.padrino_asignado_id === participante.id
      )
    : [];
  const abuelosACargoPadrino = esPadrino
    ? adultosActivosAll.filter((a) => a.padrino_preferido_id === participante.id)
    : [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setErrorMsg(null);
    try {
      let updatedCoords: Coords | undefined = undefined;
      const addrTrim = form.direccion.trim();
      if (addrTrim && addrTrim !== form.originalDireccion.trim()) {
        await withLoading(
          "Actualizando ubicacion en el mapa...",
          "Buscando coordenadas del domicilio editado...",
          async () => {
            try {
              const query = addrTrim.toLowerCase().includes("santa fe")
                ? addrTrim
                : `${addrTrim}, Santa Fe, Argentina`;
              const resGeo = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
                  query
                )}&limit=1`
              );
              if (resGeo.ok) {
                const rows = (await resGeo.json()) as Array<{
                  lat: string;
                  lon: string;
                }>;
                if (rows.length > 0) {
                  const lat = Number(rows[0].lat);
                  const lng = Number(rows[0].lon);
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    updatedCoords = { lat, lng };
                  }
                }
              }
            } catch {
              // Mantener coordenadas previas
            }
          }
        );
      }

      const res = await onExecuteAction("actualizar_participante_adulto", {
        jornadaId: jornada.id,
        payload: {
          participanteId: participante.id,
          nombre: form.nombre,
          edad: Number(form.edad) || participante.edad,
          dni: form.dni,
          telefono: form.telefono,
          direccion: form.direccion,
          coordsDomicilio: updatedCoords,
          credencialNro: esPadrino ? form.credencialNro : undefined,
          padrinoPreferidoId: !esPadrino ? form.padrinoPreferidoId || null : undefined,
          adultosAsignadosIds: esPadrino ? form.adultosAsignadosIds : undefined,
          contactoFamiliarNombre: form.contactoFamiliarNombre,
          contactoFamiliarTel: form.contactoFamiliarTel,
          notasVulnerabilidad: form.notasVulnerabilidad,
          avatarUrl: form.avatarUrl || undefined,
          modalidadElegida: !esPadrino ? form.modalidadElegida : undefined,
          paradaEsquinaId:
            !esPadrino && form.modalidadElegida === "nivel_2_esquina"
              ? form.paradaEsquinaId || null
              : null,
        },
      });

      if (res && res.ok === false) {
        setErrorMsg(res.error || "No se pudo guardar la ficha.");
        return;
      }
      setIsEditing(false);
    } finally {
      savingRef.current = false;
    }
  };

  let modalidadLabel = "Sin respuesta aun";
  if (asisActual?.modalidad_elegida === "nivel_1_puerta") {
    modalidadLabel = "Puerta a puerta";
  } else if (asisActual?.modalidad_elegida === "nivel_2_esquina") {
    modalidadLabel = "Parada segura";
  } else if (asisActual?.modalidad_elegida === "nivel_3_directo") {
    modalidadLabel = "Directo al club";
  } else if (asisActual?.modalidad_elegida === "no_asiste") {
    modalidadLabel = "No asiste hoy";
  }

  return (
    <div
      className="fixed inset-0 z-[750] bg-slate-900/60 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-[#eaeced] flex flex-col gap-4 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-[#eaeced] pb-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setErrorMsg(null);
                }}
                className="text-[#a70355] hover:bg-[#faf0f5] p-1.5 rounded-full transition shrink-0"
                title="Volver a la ficha"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="relative shrink-0">
              <img
                src={isEditing ? form.avatarUrl || avatarUrl : avatarUrl}
                alt={participante.nombre}
                width={64}
                height={64}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#a70355]/20 shadow-xs bg-[#f6f6f7]"
              />
              {esPadrino && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#a70355] text-white flex items-center justify-center ring-2 ring-white">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#a70355] bg-[#faf0f5] border border-[#f4e1eb] px-2.5 py-0.5 rounded-full">
                  {esPadrino
                    ? `Vecino Padrino ${participante.credencial_nro || ""}`
                    : "Adulto Mayor"}
                </span>
                {asisActual?.presente_validado_en_club && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Presente hoy
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-[#363f48] truncate mt-0.5">
                {isEditing ? `Editando a ${participante.nombre}` : participante.nombre}
              </h3>
              <p className="text-xs text-[#52606d]">
                {participante.edad} anos • DNI {participante.dni}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#52606d] hover:text-[#363f48] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido: Vista de Ficha vs Formulario de Edicion */}
        {isEditing ? (
          <form
            onSubmit={handleSave}
            className="overflow-y-auto space-y-3 text-xs pr-1"
          >
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Cambiar Foto */}
            <div className="p-2.5 rounded-xl bg-[#f6f6f7] border border-[#eaeced] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={form.avatarUrl || avatarUrl}
                  alt={form.nombre}
                  className="w-11 h-11 rounded-xl object-cover border border-white shadow-xs bg-white"
                />
                <div>
                  <div className="font-bold text-[#363f48]">Foto de Perfil</div>
                </div>
              </div>
              <label className="cursor-pointer border border-[#a70355] text-[#a70355] hover:bg-[#a70355] hover:text-white font-semibold text-[11px] px-3 py-1.5 rounded-full transition inline-flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>Cambiar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await compressImageFileToDataUrl(file);
                      setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
                    } catch {
                      // Ignore
                    }
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <label className="font-semibold text-[#363f48] block mb-1">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-semibold text-[#363f48] block mb-1">
                  Edad *
                </label>
                <input
                  type="number"
                  min={18}
                  max={110}
                  required
                  value={form.edad}
                  onChange={(e) =>
                    setForm({ ...form, edad: Number(e.target.value) })
                  }
                  className="w-full border border-[#c4c9cd] rounded-lg px-2 py-1.5"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="font-semibold text-[#363f48] block mb-1">
                  DNI
                </label>
                <input
                  type="text"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-[#363f48] block mb-1">
                  Telefono / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-[#363f48] block mb-1">
                  Domicilio barrial *
                </label>
                <input
                  type="text"
                  required
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                />
              </div>
            </div>

            {esPadrino ? (
              <div className="space-y-2.5">
                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Credencial de Padrino
                  </label>
                  <input
                    type="text"
                    value={form.credencialNro}
                    onChange={(e) =>
                      setForm({ ...form, credencialNro: e.target.value })
                    }
                    className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#fdf9fb] border border-[#f4e1eb] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-[#363f48] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#a70355]" />
                      <span>Abuelos asignados a este padrino</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#a70355]">
                      {form.adultosAsignadosIds.length} a cargo
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {adultosActivosAll.map((ad) => {
                      const checked = form.adultosAsignadosIds.includes(ad.id);
                      const otroPadrino =
                        ad.padrino_preferido_id &&
                        ad.padrino_preferido_id !== participante.id
                          ? participantes.find(
                              (p) => p.id === ad.padrino_preferido_id
                            )
                          : null;
                      return (
                        <label
                          key={ad.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer transition ${
                            checked
                              ? "bg-white border-[#a70355]"
                              : "bg-white/70 border-[#eaeced] hover:border-[#e1a9c5]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  adultosAsignadosIds:
                                    prev.adultosAsignadosIds.includes(ad.id)
                                      ? prev.adultosAsignadosIds.filter(
                                          (id) => id !== ad.id
                                        )
                                      : [...prev.adultosAsignadosIds, ad.id],
                                }))
                              }
                              className="accent-[#a70355] w-3.5 h-3.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-[#363f48] truncate">
                                {ad.nombre}
                              </div>
                              <div className="text-[10px] text-[#52606d] truncate">
                                {ad.direccion}
                              </div>
                            </div>
                          </div>
                          {otroPadrino && !checked && (
                            <span className="text-[10px] text-[#52606d] bg-[#f6f6f7] px-2 py-0.5 rounded-full shrink-0">
                              Con {otroPadrino.nombre.split(" ")[0]}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#f6f6f7] border border-[#eaeced]">
                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Modalidad en {circuito.nombre_club} (A {distClubActual})
                  </label>
                  <select
                    value={form.modalidadElegida}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        modalidadElegida: e.target.value as ModalidadElegida,
                      })
                    }
                    className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-1.5 bg-white"
                  >
                    <option value="sin_respuesta">Sin respuesta aun</option>
                    <option value="nivel_1_puerta">Puerta a puerta</option>
                    {canWalkHere && (
                      <option value="nivel_2_esquina">Parada segura</option>
                    )}
                    <option value="nivel_3_directo">Directo al club</option>
                    <option value="no_asiste">No asiste hoy</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#363f48] block mb-1">
                    Padrino habitual / asignado
                  </label>
                  <select
                    value={form.padrinoPreferidoId}
                    onChange={(e) =>
                      setForm({ ...form, padrinoPreferidoId: e.target.value })
                    }
                    className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-1.5 bg-white"
                  >
                    <option value="">Sin asignar</option>
                    {padrinosAcreditados.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.credencial_nro || "Acreditado"})
                      </option>
                    ))}
                  </select>
                </div>

                {canWalkHere && form.modalidadElegida === "nivel_2_esquina" && (
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#363f48] block mb-1">
                      Parada segura elegida
                    </label>
                    <select
                      value={form.paradaEsquinaId}
                      onChange={(e) =>
                        setForm({ ...form, paradaEsquinaId: e.target.value })
                      }
                      className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-1.5 bg-white"
                    >
                      {circuito.paradas_seguras.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.nombre_esquina} ({ps.horario_paso})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-[#363f48] block mb-1">
                  {esPadrino
                    ? "Referencia / Contacto de emergencia"
                    : "Contacto familiar / referente"}
                </label>
                <input
                  type="text"
                  value={form.contactoFamiliarNombre}
                  onChange={(e) =>
                    setForm({ ...form, contactoFamiliarNombre: e.target.value })
                  }
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-[#363f48] block mb-1">
                  Tel. de contacto
                </label>
                <input
                  type="text"
                  value={form.contactoFamiliarTel}
                  onChange={(e) =>
                    setForm({ ...form, contactoFamiliarTel: e.target.value })
                  }
                  className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#363f48] block mb-1">
                Observaciones / Notas
              </label>
              <textarea
                rows={2}
                value={form.notasVulnerabilidad}
                onChange={(e) =>
                  setForm({ ...form, notasVulnerabilidad: e.target.value })
                }
                className="w-full border border-[#c4c9cd] rounded-lg px-3 py-1.5"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eaeced]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-1.5 rounded-full border border-[#c4c9cd] text-[#52606d] font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingAction === "actualizar_participante_adulto"}
                className="bg-[#a70355] hover:bg-[#8c0347] disabled:bg-slate-400 text-white font-semibold px-5 py-1.5 rounded-full transition"
              >
                {loadingAction === "actualizar_participante_adulto"
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <div className="overflow-y-auto space-y-3 text-xs pr-1">
            {/* Datos de contacto y domicilio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#f6f6f7] border border-[#eaeced] space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-[#52606d] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#a70355]" />
                  <span>Domicilio</span>
                </div>
                <div className="font-semibold text-[#363f48]">
                  {participante.direccion}
                </div>
                <div className="text-[11px] text-[#52606d]">
                  A <strong>{distClubActual}</strong> de {circuito.nombre_club}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f6f6f7] border border-[#eaeced] space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-[#52606d] flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#a70355]" />
                  <span>WhatsApp y Familiar</span>
                </div>
                <div className="font-semibold text-[#363f48] select-all">
                  {participante.telefono}
                </div>
                <div className="text-[11px] text-[#52606d] truncate">
                  Ref: {participante.contacto_familiar_nombre || "No informado"}
                  {participante.contacto_familiar_tel
                    ? ` (${participante.contacto_familiar_tel})`
                    : ""}
                </div>
              </div>
            </div>

            {/* Billetera de Puntos y Recompensas Sancor */}
            <div className="p-3 rounded-xl bg-[#fdf9fb] border border-[#e1a9c5] flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#a70355] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>{reward.nivelActual}</span>
                </div>
                <div className="font-bold text-sm text-[#363f48] mt-0.5">
                  {reward.puntos.toLocaleString("es-AR")} Puntos • $
                  {reward.creditoPesos.toLocaleString("es-AR")} ARS en creditos
                </div>
                <div className="text-[11px] text-[#52606d]">
                  Descuento activo: <strong>{reward.descuentoActualPct}% OFF</strong> • Cupon:{" "}
                  <span className="font-mono font-bold text-[#a70355]">
                    {reward.codigoCupon}
                  </span>
                </div>
              </div>
            </div>

            {/* Modalidad / Acompanamiento */}
            {esPadrino ? (
              <div className="p-3 rounded-xl bg-white border border-[#eaeced] space-y-2">
                <div className="text-[10px] font-bold uppercase text-[#52606d]">
                  Estado de Vecino Padrino Acreditado
                </div>
                <div className="text-xs text-[#363f48]">
                  Credencial Sancor:{" "}
                  <strong className="text-[#a70355]">
                    {participante.credencial_nro || "Acreditado"}
                  </strong>{" "}
                  • Acompanamientos hoy en {circuito.nombre_club}:{" "}
                  <strong>{acompanamientosPadrino.length}</strong>
                </div>
                <div className="pt-1 border-t border-[#eaeced] space-y-1">
                  <div className="text-[10px] font-bold uppercase text-[#52606d]">
                    Abuelos asignados a su cargo ({abuelosACargoPadrino.length})
                  </div>
                  {abuelosACargoPadrino.length === 0 ? (
                    <div className="text-[11px] text-[#52606d]">
                      Sin abuelos asignados todavia. Toca &ldquo;Editar ficha&rdquo; para asignarle abuelos.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {abuelosACargoPadrino.map((ad) => (
                        <span
                          key={ad.id}
                          className="text-[11px] font-semibold bg-[#faf0f5] text-[#a70355] border border-[#f4e1eb] px-2.5 py-0.5 rounded-full"
                        >
                          {ad.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white border border-[#eaeced] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-[#52606d] flex items-center gap-1">
                    <User className="w-3 h-3 text-[#a70355]" />
                    <span>Logistica en este evento y Distancias</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#a70355] bg-[#faf0f5] px-2 py-0.5 rounded-full">
                    {modalidadLabel}
                  </span>
                </div>
                {padrinoAsignado && (
                  <div className="text-xs text-[#363f48]">
                    Padrino habitual / asignado:{" "}
                    <strong>
                      {padrinoAsignado.nombre} ({padrinoAsignado.credencial_nro})
                    </strong>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {centrosDist.map((cd) => (
                    <span
                      key={cd.circuitoId}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        cd.canWalk
                          ? "bg-[#f6f6f7] text-[#363f48] border-[#eaeced]"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {cd.nombreClub}: <strong>{cd.formatted}</strong>
                      {!cd.canWalk ? " (>1 km)" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {participante.notas_vulnerabilidad && (
              <div className="p-3 rounded-xl bg-[#f6f6f7] border border-[#eaeced] text-xs text-[#363f48]">
                <span className="text-[10px] font-bold uppercase text-[#52606d] block mb-0.5">
                  Observaciones
                </span>
                {participante.notas_vulnerabilidad}
              </div>
            )}

            {/* Pie con acciones: Editar + Abrir WhatsApp + Cerrar */}
            <div className="pt-3 border-t border-[#eaeced] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-[#a70355] hover:bg-[#8c0347] text-white font-semibold px-4 py-1.5 rounded-full transition inline-flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar ficha</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPhone(participante.id);
                  }}
                  className="border border-[#c4c9cd] hover:border-[#a70355] text-[#363f48] hover:text-[#a70355] font-semibold px-3.5 py-1.5 rounded-full transition inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp en Vivo</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-full border border-[#c4c9cd] text-[#52606d] font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
