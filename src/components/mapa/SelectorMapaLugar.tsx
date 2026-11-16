"use client";

import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CircuitoBarrial, Coords } from "@/types/domain";
import { parseGoogleMapsLocationInput } from "@/lib/domain-helpers";
import { useGlobalLoading } from "@/components/modals/ModalCargando";
import { ExternalLink, MapPin, Search } from "lucide-react";

const SelectorMapaLeaflet = dynamic(
  () => import("@/components/mapa/SelectorMapaLeaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[215px] rounded-xl border border-[#c4c9cd] bg-[#f6f6f7] flex items-center justify-center text-xs text-[#52606d]">
        Cargando mapa interactivo...
      </div>
    ),
  }
);

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
}

interface SelectorMapaProps {
  mode: "existente" | "nuevo";
  circuitos: CircuitoBarrial[];
  selectedCircuitoId?: string;
  pickedCoords: Coords | null;
  onSelectCircuitoExistente?: (circuitoId: string) => void;
  onLocationPicked: (data: {
    coords: Coords;
    address?: string;
    barrio?: string;
    suggestedName?: string;
  }) => void;
}

export default function SelectorMapaLugar({
  mode,
  circuitos,
  selectedCircuitoId,
  pickedCoords,
  onSelectCircuitoExistente,
  onLocationPicked,
}: SelectorMapaProps) {
  const { withLoading } = useGlobalLoading();
  const busyRef = useRef<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimHit[]>([]);
  const [googleInput, setGoogleInput] = useState("");
  const [mapsFeedback, setMapsFeedback] = useState<string | null>(null);

  const reverseGeocodeCoords = async (
    coords: Coords,
    suggestedName?: string
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setMapsFeedback("Obteniendo direccion del punto seleccionado...");
    try {
      await withLoading(
        "Obteniendo ubicacion en el mapa...",
        "Consultando calle y barrio del punto elegido...",
        async () => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&addressdetails=1`
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data?.address || {};
              const streetLine = [addr.road, addr.house_number]
                .filter(Boolean)
                .join(" ");
              const city = addr.city || addr.town || "Santa Fe";
              const barrio =
                addr.suburb || addr.neighbourhood || addr.quarter || undefined;
              const formattedAddr = streetLine
                ? `${streetLine}${barrio ? `, ${barrio}` : ""}, ${city}`
                : data?.display_name?.split(",").slice(0, 3).join(",") ||
                  `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

              onLocationPicked({
                coords,
                address: formattedAddr,
                barrio: barrio ? `${barrio} (${city})` : undefined,
                suggestedName: suggestedName || addr.amenity || addr.building || undefined,
              });
              setMapsFeedback(`Ubicacion fijada: ${formattedAddr}`);
              return;
            }
          } catch {
            // Fallback below if Nominatim is unreachable
          }
          onLocationPicked({ coords, suggestedName });
          setMapsFeedback(
            `Ubicacion fijada en mapa (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`
          );
        }
      );
    } finally {
      busyRef.current = false;
    }
  };

  const handleSearchAddress = async () => {
    const q = searchQuery.trim();
    if (!q || busyRef.current) return;
    busyRef.current = true;
    setSearching(true);
    setMapsFeedback(null);
    try {
      await withLoading(
        "Buscando direccion en Santa Fe...",
        `Consultando "${q}" en el mapa...`,
        async () => {
          try {
            const fullQuery = q.toLowerCase().includes("santa fe")
              ? q
              : `${q}, Santa Fe, Argentina`;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
                fullQuery
              )}&limit=4&addressdetails=1`
            );
            if (res.ok) {
              const rows = (await res.json()) as NominatimHit[];
              setSearchResults(rows);
              if (rows.length > 0) {
                const first = rows[0];
                const coords = {
                  lat: Number(Number(first.lat).toFixed(6)),
                  lng: Number(Number(first.lon).toFixed(6)),
                };
                onLocationPicked({
                  coords,
                  address: first.display_name.split(",").slice(0, 3).join(",").trim(),
                  suggestedName: first.name || undefined,
                });
                setMapsFeedback(`Encontrado: ${first.display_name.split(",").slice(0, 2).join(",")}`);
              } else {
                setMapsFeedback("No hubo resultados exactos; hace clic directo en el mapa.");
              }
            }
          } catch {
            setMapsFeedback("No se pudo buscar en este momento; elegi haciendo clic en el mapa.");
          }
        }
      );
    } finally {
      busyRef.current = false;
      setSearching(false);
    }
  };

  const handleGoogleMapsPaste = async (val: string) => {
    setGoogleInput(val);
    if (!val.trim()) {
      setMapsFeedback(null);
      return;
    }
    const parsed = parseGoogleMapsLocationInput(val);
    if (parsed) {
      await reverseGeocodeCoords(
        { lat: parsed.lat, lng: parsed.lng },
        parsed.placeName
      );
    } else if (val.includes("maps.app.goo.gl")) {
      setMapsFeedback(
        "Link acortado detectado: abri el link en tu navegador para copiar la URL completa con @lat,lng (o elegi en el mapa)."
      );
    } else {
      setMapsFeedback(
        "Pega una URL de Google Maps (ej: google.com/maps/...@-31.63,-60.69) o coordenadas -31.63, -60.69."
      );
    }
  };

  const googleMapsUrl = pickedCoords
    ? `https://www.google.com/maps/search/?api=1&query=${pickedCoords.lat},${pickedCoords.lng}`
    : "https://www.google.com/maps/@-31.6365,-60.6902,14z";

  return (
    <div className="space-y-2.5">
      {mode === "nuevo" && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-1.5">
            <input
              type="text"
              placeholder="Buscar calle, plaza o club en Santa Fe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchAddress();
                }
              }}
              className="flex-1 border border-[#c4c9cd] rounded-lg px-3 py-1.5 text-xs bg-white"
            />
            <button
              type="button"
              disabled={searching}
              onClick={handleSearchAddress}
              className="bg-[#0a4494] hover:bg-[#08397c] text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{searching ? "..." : "Buscar"}</span>
            </button>
          </div>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abre Google Maps en tu navegador con tu sesion iniciada para ver tus lugares guardados"
            className="border border-[#0a4494] text-[#0a4494] hover:bg-[#0a4494] hover:text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Google Maps</span>
          </a>
        </div>
      )}

      {mode === "nuevo" && searchResults.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {searchResults.slice(0, 3).map((hit, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const coords = {
                  lat: Number(Number(hit.lat).toFixed(6)),
                  lng: Number(Number(hit.lon).toFixed(6)),
                };
                onLocationPicked({
                  coords,
                  address: hit.display_name.split(",").slice(0, 3).join(",").trim(),
                  suggestedName: hit.name || undefined,
                });
              }}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-[#c4c9cd] hover:border-[#0a4494] text-[#363f48] truncate max-w-[230px]"
            >
              <MapPin className="w-2.5 h-2.5 inline mr-1 text-[#a70355]" />
              {hit.display_name.split(",").slice(0, 2).join(",")}
            </button>
          ))}
        </div>
      )}

      <SelectorMapaLeaflet
        mode={mode}
        circuitos={circuitos}
        selectedCircuitoId={selectedCircuitoId}
        pickedCoords={pickedCoords}
        onSelectCircuitoExistente={onSelectCircuitoExistente}
        onPickCoords={(coords) => reverseGeocodeCoords(coords)}
      />

      {mode === "nuevo" && (
        <div className="bg-white border border-[#eaeced] rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-[#363f48]">
              Importar desde tu Google Maps (pega la URL del navegador o lat, lng):
            </label>
            {pickedCoords && (
              <span className="text-[10px] font-mono text-[#168003] font-semibold">
                {pickedCoords.lat.toFixed(5)}, {pickedCoords.lng.toFixed(5)}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Ej: https://www.google.com/maps/place/.../@-31.6388,-60.6915,17z o -31.6388, -60.6915"
            value={googleInput}
            onChange={(e) => handleGoogleMapsPaste(e.target.value)}
            className="w-full border border-[#c4c9cd] rounded-lg px-2.5 py-1.5 text-[11px] bg-[#f6f6f7]"
          />
          {mapsFeedback && (
            <p className="text-[10px] text-[#0a4494] font-medium">{mapsFeedback}</p>
          )}
        </div>
      )}
    </div>
  );
}
