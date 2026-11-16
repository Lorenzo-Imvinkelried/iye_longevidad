"use client";

import React from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  MapPin,
  RefreshCw,
  Route,
  Trash2,
  X,
} from "lucide-react";

export interface EditableRouteNode {
  id: string;
  kind: "parada" | "via";
  lat: number;
  lng: number;
  nombreEsquina?: string;
  horarioPaso?: string;
}

interface EditorRutaProps {
  nodes: EditableRouteNode[];
  clickTool: "via" | "parada";
  routingBusy: boolean;
  saving: boolean;
  distanceMeters?: number;
  onChangeClickTool: (tool: "via" | "parada") => void;
  onUpdateParadaText: (
    id: string,
    field: "nombreEsquina" | "horarioPaso",
    val: string
  ) => void;
  onMoveNodeOrder: (index: number, dir: -1 | 1) => void;
  onRemoveNode: (id: string) => void;
  onRecalculateStreets: () => void;
  onResetFromClub: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function EditorRutaPanel({
  nodes,
  clickTool,
  routingBusy,
  saving,
  distanceMeters,
  onChangeClickTool,
  onUpdateParadaText,
  onMoveNodeOrder,
  onRemoveNode,
  onRecalculateStreets,
  onResetFromClub,
  onCancel,
  onSave,
}: EditorRutaProps) {
  const paradasCount = nodes.filter((n) => n.kind === "parada").length;

  return (
    <div className="bg-white rounded-xl p-2.5 border-2 border-[#a70355] flex flex-col gap-2 min-h-0 h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#eaeced] pb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Route className="w-4 h-4 text-[#a70355]" />
          <span className="text-xs font-bold text-[#363f48]">
            Editor de Ruta Segura (por calles)
          </span>
        </div>
        {distanceMeters ? (
          <span className="text-[10px] font-bold bg-[#d0e6cd]/50 text-[#168003] px-2 py-0.5 rounded-full">
            {(distanceMeters / 1000).toFixed(2)} km
          </span>
        ) : null}
      </div>

      <p className="text-[11px] text-[#52606d] leading-snug shrink-0">
        Toca el mapa para agregar puntos o <strong>arrastra los marcadores</strong>. La linea verde sigue automaticamente las calles reales hasta la sede.
      </p>

      {/* Selector de que agrega al hacer clic en el mapa */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-[#f6f6f7] rounded-full text-[11px] shrink-0">
        <button
          type="button"
          onClick={() => onChangeClickTool("via")}
          className={`py-1 px-2 rounded-full font-semibold transition ${
            clickTool === "via"
              ? "bg-[#0a4494] text-white"
              : "text-[#52606d] hover:text-[#363f48]"
          }`}
        >
          + Punto de calle
        </button>
        <button
          type="button"
          onClick={() => onChangeClickTool("parada")}
          className={`py-1 px-2 rounded-full font-semibold transition ${
            clickTool === "parada"
              ? "bg-[#a70355] text-white"
              : "text-[#52606d] hover:text-[#363f48]"
          }`}
        >
          + Parada segura
        </button>
      </div>

      {/* Lista ordenada de puntos del recorrido */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
        {nodes.length === 0 ? (
          <div className="p-3 text-center text-[11px] text-[#52606d] bg-[#f6f6f7] rounded-lg">
            Hace clic en el mapa para trazar el inicio de la caminata y sus paradas.
          </div>
        ) : (
          nodes.map((node, idx) => {
            const isParada = node.kind === "parada";
            return (
              <div
                key={node.id}
                className={`p-2 rounded-lg border text-xs space-y-1 ${
                  isParada
                    ? "bg-[#fdf9fb] border-[#edcddd]"
                    : "bg-[#f6f6f7] border-[#eaeced]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 ${
                        isParada ? "bg-[#a70355]" : "bg-[#0a4494]"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[11px] text-[#363f48] truncate">
                      {isParada ? "Parada segura" : "Punto de paso por calle"}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveNodeOrder(idx, -1)}
                      title="Subir en el orden"
                      className="p-1 rounded hover:bg-white disabled:opacity-30 text-[#52606d]"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === nodes.length - 1}
                      onClick={() => onMoveNodeOrder(idx, 1)}
                      title="Bajar en el orden"
                      className="p-1 rounded hover:bg-white disabled:opacity-30 text-[#52606d]"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isParada && paradasCount <= 1}
                      onClick={() => onRemoveNode(node.id)}
                      title={
                        isParada && paradasCount <= 1
                          ? "Debe quedar al menos 1 parada segura"
                          : "Quitar punto"
                      }
                      className="p-1 rounded hover:bg-red-50 text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {isParada ? (
                  <div className="grid grid-cols-12 gap-1.5 pt-0.5">
                    <input
                      type="text"
                      value={node.nombreEsquina || ""}
                      placeholder="Nombre de la esquina"
                      onChange={(e) =>
                        onUpdateParadaText(
                          node.id,
                          "nombreEsquina",
                          e.target.value
                        )
                      }
                      className="col-span-8 border border-[#c4c9cd] rounded px-2 py-1 text-[11px] bg-white"
                    />
                    <input
                      type="text"
                      value={node.horarioPaso || ""}
                      placeholder="16:00 hs"
                      onChange={(e) =>
                        onUpdateParadaText(
                          node.id,
                          "horarioPaso",
                          e.target.value
                        )
                      }
                      className="col-span-4 border border-[#c4c9cd] rounded px-2 py-1 text-[11px] bg-white"
                    />
                  </div>
                ) : (
                  <div className="text-[10px] text-[#52606d] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0a4494]" />
                    <span>
                      {node.lat.toFixed(5)}, {node.lng.toFixed(5)} (arrastrable)
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-[#eaeced] space-y-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={routingBusy}
            onClick={onRecalculateStreets}
            className="flex-1 border border-[#0a4494] text-[#0a4494] hover:bg-[#0a4494] hover:text-white text-[11px] font-semibold py-1.5 px-2.5 rounded-full transition flex items-center justify-center gap-1"
          >
            <RefreshCw
              className={`w-3 h-3 ${routingBusy ? "animate-spin" : ""}`}
            />
            <span>{routingBusy ? "Trazando calles..." : "Ajustar a calles"}</span>
          </button>

          <button
            type="button"
            onClick={onResetFromClub}
            className="border border-[#c4c9cd] text-[#52606d] hover:text-[#363f48] text-[11px] font-semibold py-1.5 px-2.5 rounded-full"
          >
            Limpiar pasos
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[#c4c9cd] text-[#52606d] hover:bg-[#f6f6f7] font-semibold text-xs py-1.5 rounded-full flex items-center justify-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            disabled={saving || routingBusy}
            onClick={onSave}
            className="bg-[#a70355] hover:bg-[#8c0347] disabled:bg-slate-300 text-white font-semibold text-xs py-1.5 rounded-full flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? "Guardando..." : "Guardar ruta"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
