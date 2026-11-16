import L from "leaflet";

export function createClubIcon(
  nombreCortoClub: string,
  validadosCount: number,
  nivel3Count: number
) {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-85%);">
        <div style="background:#0a4494;color:white;padding:6px 10px;border-radius:999px;font-weight:700;font-size:11px;white-space:nowrap;box-shadow:0 4px 12px rgba(10,68,148,0.35);border:2px solid #ffffff;display:flex;align-items:center;gap:6px;">
          <span>${nombreCortoClub}</span>
          <span style="background:#a70355;color:#ffffff;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;">
            ${validadosCount > 0 ? `${validadosCount} en lugar` : `${nivel3Count} directos`}
          </span>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #0a4494;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function createParadaIcon(index: number, horario: string, count: number) {
  const activeBg = count > 0 ? "#0f766e" : "#475569";

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-85%);">
        <div style="background:${activeBg};color:white;padding:5px 9px;border-radius:8px;font-weight:600;font-size:11px;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.22);border:2px solid #ffffff;display:flex;align-items:center;gap:6px;">
          <span>Parada ${index + 1} (${horario})</span>
          <span style="background:#ffffff;color:${activeBg};padding:1px 5px;border-radius:4px;font-size:10px;font-weight:800;">
            ${count}
          </span>
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${activeBg};"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function createAdultoDomicilioIcon(
  nombreCorto: string,
  colorHex: string,
  etiquetaEstado: string,
  isAlert: boolean
) {
  const pulseHtml = isAlert
    ? `<div style="position:absolute;width:42px;height:42px;border-radius:999px;background:rgba(220,38,38,0.35);animation:ping 1.2s infinite;top:-6px;left:50%;transform:translateX(-50%);z-index:0;"></div>`
    : "";

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-88%);">
        ${pulseHtml}
        <div style="position:relative;z-index:1;background:${colorHex};color:white;padding:4px 8px;border-radius:8px;font-weight:700;font-size:11px;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid #ffffff;display:flex;align-items:center;gap:5px;">
          <span>${nombreCorto}</span>
          <span style="background:rgba(0,0,0,0.22);padding:1px 5px;border-radius:4px;font-size:9px;font-weight:600;">
            ${etiquetaEstado}
          </span>
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${colorHex};"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function createPadrinoIcon(nombreCorto: string, credencial: string) {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-85%);">
        <div style="background:#3730a3;color:white;padding:3px 8px;border-radius:6px;font-weight:600;font-size:10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:1.5px solid #ffffff;display:flex;align-items:center;gap:4px;">
          <span>Tutor ${nombreCorto}</span>
          <span style="background:#e0e7ff;color:#1e1b4b;padding:0px 4px;border-radius:3px;font-weight:800;font-size:9px;">
            ${credencial}
          </span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
