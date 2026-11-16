"use client";

import React, { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CircuitoBarrial, Coords } from "@/types/domain";

interface SelectorLeafletProps {
  mode: "existente" | "nuevo";
  circuitos: CircuitoBarrial[];
  selectedCircuitoId?: string;
  pickedCoords: Coords | null;
  onSelectCircuitoExistente?: (circuitoId: string) => void;
  onPickCoords: (coords: Coords) => void;
}

function createPinIcon(label: string, active: boolean, isPickedPin: boolean) {
  const bg = isPickedPin ? "#a70355" : active ? "#0a4494" : "#475569";
  return L.divIcon({
    className: "custom-selector-pin",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-88%);">
        <div style="background:${bg};color:white;padding:4px 9px;border-radius:999px;font-weight:700;font-size:10px;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.28);border:2px solid #ffffff;">
          ${label}
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${bg};"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function MapViewportAndClickHandler({
  center,
  mode,
  onPickCoords,
}: {
  center: [number, number];
  mode: "existente" | "nuevo";
  onPickCoords: (coords: Coords) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    map.setView(center, 14, { animate: true });
  }, [map, center[0], center[1]]);

  useMapEvents({
    click(e) {
      if (mode === "nuevo") {
        onPickCoords({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        });
      }
    },
  });

  return null;
}

export default function SelectorMapaLeaflet({
  mode,
  circuitos,
  selectedCircuitoId,
  pickedCoords,
  onSelectCircuitoExistente,
  onPickCoords,
}: SelectorLeafletProps) {
  const selectedCirc = circuitos.find((c) => c.id === selectedCircuitoId);
  const defaultCenter: Coords = pickedCoords ||
    selectedCirc?.coords_club || { lat: -31.6365, lng: -60.6902 };

  return (
    <div className="w-full h-[215px] rounded-xl overflow-hidden border border-[#c4c9cd] relative bg-[#f6f6f7]">
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <MapViewportAndClickHandler
          center={[defaultCenter.lat, defaultCenter.lng]}
          mode={mode}
          onPickCoords={onPickCoords}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {circuitos.map((c) => {
          const isSelected = c.id === selectedCircuitoId && mode === "existente";
          const shortName =
            c.nombre_club.length > 22
              ? `${c.nombre_club.slice(0, 20)}...`
              : c.nombre_club;

          return (
            <Marker
              key={c.id}
              position={[c.coords_club.lat, c.coords_club.lng]}
              icon={createPinIcon(shortName, isSelected, false)}
              eventHandlers={{
                click: () => {
                  if (mode === "existente" && onSelectCircuitoExistente) {
                    onSelectCircuitoExistente(c.id);
                  }
                },
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 p-0.5">
                  <div className="font-bold text-[#363f48]">{c.nombre_club}</div>
                  <div className="text-[#52606d]">{c.direccion_club}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {mode === "nuevo" && pickedCoords && (
          <Marker
            position={[pickedCoords.lat, pickedCoords.lng]}
            icon={createPinIcon("Punto elegido", true, true)}
          />
        )}
      </MapContainer>

      <div className="absolute bottom-1.5 left-2 right-2 z-[400] pointer-events-none flex justify-center">
        <span className="bg-white/95 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[#363f48] shadow border border-[#eaeced]">
          {mode === "existente"
            ? "Toca un marcador azul/celeste en el mapa para seleccionar esa sede"
            : "Hace clic en cualquier punto del mapa para fijar la ubicacion exacta"}
        </span>
      </div>
    </div>
  );
}
