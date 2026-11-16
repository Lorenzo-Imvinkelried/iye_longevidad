# "Nos encontramos al paso" — Red Comunitaria de Movimiento Activo y Pertenencia Barrial
**Desafio de Innovacion Corporativa: Longevidad Activa (Silver Economy) — Sancor Seguros / Sancor Salud**  
**Universidad Tecnologica Nacional (UTN) — Facultad Regional Santa Fe — Equipo 5**  
*Integrantes: Macarena Diderle Vivas, Zoe Eandi, Victoria Sovrano, Lorenzo Imvinkelried*

---

## 1. Arquitectura de Archivos (Separacion de Responsabilidades)

* **Dominio y Modelos (`src/types/`):**
  * `src/types/domain.ts`: Interfaces de circuito, participantes, jornadas, asistencias y mensajes.
* **Logica de Negocio y Persistencia (`src/lib/`):**
  * `src/lib/seed-data.ts`: Datos iniciales de Barrio Candioti, Santa Fe Capital.
  * `src/lib/state-persistence.ts`: Persistencia local y sincronizacion con Supabase.
  * `src/lib/bot-flows.ts`: Maquina de estados de los flujos de WhatsApp (Convocatoria, Nivel 1, Nivel 2, Nivel 3, Cancelaciones).
  * `src/lib/coordinator-actions.ts`: Acciones administrativas del coordinador (suspension por lluvia, reasignacion de tutor, validacion de club, altas familiares).
  * `src/lib/whatsapp-cloud.ts`: Cliente de envio compatible con Meta Graph API v21.0.
  * `src/lib/supabase.ts`: Configuracion del cliente Supabase Realtime.
* **Componentes de Interfaz (`src/components/`):**
  * `src/components/DashboardCoordinador.tsx`: Orquestador principal.
  * `src/components/layout/HeaderInstitucional.tsx`: Barra superior y navegacion por pestanas.
  * `src/components/tabs/TabMonitorCircuito.tsx`: Pestana 1 (Resumen de los 3 anillos, alertas y mapa).
  * `src/components/tabs/TabRecepcionClub.tsx`: Pestana 2 (Validacion de ingreso y reintegros Sancor).
  * `src/components/tabs/TabCadenaConfianza.tsx`: Pestana 3 (Solicitudes de familiares y padron de padrinos).
  * `src/components/tabs/TabMetricasImpacto.tsx`: Pestana 4 (Indicadores ejecutivos de Sancor).
  * `src/components/mapa/MapaCircuitoLeaflet.tsx` y `src/components/mapa/map-icons.ts`: Mapa e iconos de Leaflet.
  * `src/components/whatsapp/SimuladorWhatsApp.tsx` y `src/components/whatsapp/BurbujaMensaje.tsx`: Simulador lateral de WhatsApp.
  * `src/components/modals/`: Modales independientes para lector QR, alta de familiares y acreditacion de padrinos.

---

## 2. Ejecucion Local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000` en el navegador.
