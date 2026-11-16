-- =====================================================================================
-- PROYECTO: Red Comunitaria de Movimiento Activo y Pertenencia Barrial
-- ALIANZA CORPORATIVA: Sancor Seguros / Sancor Salud (Silver Economy & Longevidad Activa)
-- UBICACIÓN PILOTO: Barrio Candioti, Santa Fe Capital, Argentina
-- MOTOR: Supabase (PostgreSQL 15+ con Supabase Realtime habilitado)
-- =====================================================================================

-- Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpieza preventiva para re-ejecución de demo
DROP TABLE IF EXISTS asistencias CASCADE;
DROP TABLE IF EXISTS jornadas CASCADE;
DROP TABLE IF EXISTS participantes CASCADE;
DROP TABLE IF EXISTS circuitos_barriales CASCADE;

-- =====================================================================================
-- 1. TABLA: circuitos_barriales
-- =====================================================================================
CREATE TABLE circuitos_barriales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_barrio TEXT NOT NULL,
    nombre_club TEXT NOT NULL,
    direccion_club TEXT NOT NULL,
    coords_club JSONB NOT NULL, -- { "lat": -31.6388, "lng": -60.6915 }
    poliza_sancor_activa BOOLEAN NOT NULL DEFAULT TRUE,
    poliza_nro TEXT DEFAULT 'SANCOR-RC-2026-8841',
    paradas_seguras JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Estructura: [{ id, nombre_esquina, lat, lng, horario_paso, estado_veredas, tiene_rampa, iluminacion_ok }]
    ruta_polilinea JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array de coordenadas [[lat, lng], ...] para trazar el corredor seguro en Leaflet
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 2. TABLA: participantes
-- =====================================================================================
CREATE TABLE participantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    edad INTEGER NOT NULL DEFAULT 72,
    dni TEXT NOT NULL,
    telefono TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL CHECK (rol IN ('adulto_mayor', 'padrino', 'coordinador')),
    direccion TEXT NOT NULL,
    coords_domicilio JSONB NOT NULL, -- { "lat": -31.6342, "lng": -60.6878 }
    nivel_autonomia_habitual INTEGER CHECK (nivel_autonomia_habitual IN (1, 2, 3)),
    padrino_preferido_id UUID REFERENCES participantes(id) ON DELETE SET NULL,
    acreditado_por_club BOOLEAN NOT NULL DEFAULT FALSE,
    credencial_nro TEXT,
    saldo_reintegro_sancor NUMERIC(12, 2) NOT NULL DEFAULT 0,
    contacto_familiar_nombre TEXT,
    contacto_familiar_tel TEXT,
    notas_vulnerabilidad TEXT,
    estado_alta TEXT NOT NULL DEFAULT 'activo' CHECK (estado_alta IN ('pendiente_aprobacion', 'activo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 3. TABLA: jornadas
-- =====================================================================================
CREATE TABLE jornadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circuito_id UUID NOT NULL REFERENCES circuitos_barriales(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_inicio_caminata TEXT NOT NULL DEFAULT '15:40',
    hora_encuentro_club TEXT NOT NULL DEFAULT '16:00',
    actividad_cierre TEXT NOT NULL DEFAULT 'Torneo de Truco, Canasta, Ajedrez y Bingo Recreativo',
    monto_reintegro_asistencia NUMERIC(12, 2) NOT NULL DEFAULT 2500,
    plus_reintegro_padrino NUMERIC(12, 2) NOT NULL DEFAULT 1500,
    estado TEXT NOT NULL DEFAULT 'programada' CHECK (
        estado IN ('programada', 'convocando', 'en_marcha', 'en_club', 'finalizada', 'suspendida_emergencia')
    ),
    motivo_suspension TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- 4. TABLA: asistencias (Estado en vivo de cada participante en la jornada)
-- =====================================================================================
CREATE TABLE asistencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jornada_id UUID NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
    participante_id UUID NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
    modalidad_elegida TEXT NOT NULL DEFAULT 'sin_respuesta' CHECK (
        modalidad_elegida IN ('sin_respuesta', 'nivel_1_puerta', 'nivel_2_esquina', 'nivel_3_directo', 'no_asiste')
    ),
    parada_esquina_id TEXT,
    padrino_asignado_id UUID REFERENCES participantes(id) ON DELETE SET NULL,
    estado_padrino TEXT NOT NULL DEFAULT 'no_aplica' CHECK (
        estado_padrino IN ('no_aplica', 'esperando_confirmacion', 'confirmado', 'rechazado_buscando_reemplazo', 'sin_padrino_frenado')
    ),
    acuse_suspension_leido BOOLEAN NOT NULL DEFAULT FALSE,
    presente_validado_en_club BOOLEAN NOT NULL DEFAULT FALSE,
    codigo_canje_farmacia TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(jornada_id, participante_id)
);

-- =====================================================================================
-- HABILITAR SUPABASE REALTIME Y PERMISOS DE ACCESO PARA EL PROTOTIPO
-- =====================================================================================
ALTER TABLE circuitos_barriales DISABLE ROW LEVEL SECURITY;
ALTER TABLE participantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas DISABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias DISABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE jornadas;
ALTER PUBLICATION supabase_realtime ADD TABLE asistencias;
ALTER PUBLICATION supabase_realtime ADD TABLE participantes;

-- =====================================================================================
-- SEED DE DATOS REALISTAS: SANTA FE CAPITAL (BARRIO CANDIOTI / PLAZA PUEYRREDÓN)
-- =====================================================================================

-- 1. Circuito Barrial en Barrio Candioti Sur (Santa Fe Capital)
INSERT INTO circuitos_barriales (
    id,
    nombre_barrio,
    nombre_club,
    direccion_club,
    coords_club,
    poliza_sancor_activa,
    poliza_nro,
    paradas_seguras,
    ruta_polilinea
) VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Barrio Candioti Sur / Bv. Gálvez (Santa Fe Capital)',
    'Centro de Jubilados y Club Candioti "La Unión"',
    'Ituzaingó 1945 (esq. Alberdi), Santa Fe Capital',
    '{"lat": -31.6388, "lng": -60.6915}'::jsonb,
    TRUE,
    'SANCOR-SALUD-RC-88412',
    '[
        {
            "id": "parada_1",
            "nombre_esquina": "Parada 1: Bv. Gálvez y Sarmiento",
            "lat": -31.6362,
            "lng": -60.6882,
            "horario_paso": "15:45 hs",
            "estado_veredas": "Veredas niveladas sin baldosas flojas (Relevamiento Sancor OK)",
            "tiene_rampa": true,
            "iluminacion_ok": true
        },
        {
            "id": "parada_2",
            "nombre_esquina": "Parada 2: Plaza Pueyrredón (Bv. Gálvez y Alberdi)",
            "lat": -31.6366,
            "lng": -60.6928,
            "horario_paso": "15:52 hs",
            "estado_veredas": "Sendero perimetral liso con bancos de descanso y sombra",
            "tiene_rampa": true,
            "iluminacion_ok": true
        }
    ]'::jsonb,
    '[
        [-31.6342, -60.6878],
        [-31.6345, -60.6875],
        [-31.6362, -60.6882],
        [-31.6364, -60.6905],
        [-31.6366, -60.6928],
        [-31.6378, -60.6922],
        [-31.6388, -60.6915]
    ]'::jsonb
);

-- 2. Coordinador Barrial Acreditado por Sancor y el Club
INSERT INTO participantes (
    id, nombre, edad, dni, telefono, rol, direccion, coords_domicilio,
    nivel_autonomia_habitual, padrino_preferido_id, acreditado_por_club,
    credencial_nro, saldo_reintegro_sancor, contacto_familiar_nombre, contacto_familiar_tel,
    notas_vulnerabilidad, estado_alta
) VALUES (
    '22222222-2222-4222-8222-222222222200',
    'Marta Elena Ríos (Coordinadora)',
    64,
    '16.402.881',
    '+5493424000000',
    'coordinador',
    'Ituzaingó 1945, Santa Fe',
    '{"lat": -31.6388, "lng": -60.6915}'::jsonb,
    3,
    NULL,
    TRUE,
    'COORD-01',
    0,
    'Club Candioti La Unión',
    '+5493424551234',
    'Coordinadora Barrial habilitada por Sancor Salud y Comisión Directiva del Club.',
    'activo'
);

-- 3. Vecinos Padrinos / Tutores Acreditados Presencialmente (#104 y #108)
INSERT INTO participantes (
    id, nombre, edad, dni, telefono, rol, direccion, coords_domicilio,
    nivel_autonomia_habitual, padrino_preferido_id, acreditado_por_club,
    credencial_nro, saldo_reintegro_sancor, contacto_familiar_nombre, contacto_familiar_tel,
    notas_vulnerabilidad, estado_alta
) VALUES
(
    '33333333-3333-4333-8333-333333333104',
    'Carlos Gómez',
    68,
    '12.458.901',
    '+5493424100104',
    'padrino',
    'Sarmiento 3420, Barrio Candioti, Santa Fe',
    '{"lat": -31.6345, "lng": -60.6875}'::jsonb,
    3,
    NULL,
    TRUE,
    '#104',
    8500,
    'Laura Gómez (Hija)',
    '+5493425104104',
    'Jubilado bancario activo. Vecino de la misma cuadra de Rosa. DNI validado en el Club.',
    'activo'
),
(
    '33333333-3333-4333-8333-333333333108',
    'Héctor Raúl Pereyra',
    66,
    '14.230.115',
    '+5493424100108',
    'padrino',
    'Alberdi 3310, Barrio Candioti, Santa Fe',
    '{"lat": -31.6352, "lng": -60.6935}'::jsonb,
    3,
    NULL,
    TRUE,
    '#108',
    6000,
    'Mariano Pereyra (Hijo)',
    '+5493425108108',
    'Ex docente técnico. Tutor de reemplazo y referente de zona Plaza Pueyrredón.',
    'activo'
);

-- 4. Cinco (5) Adultos Mayores Activos en los 3 Anillos de Acceso
INSERT INTO participantes (
    id, nombre, edad, dni, telefono, rol, direccion, coords_domicilio,
    nivel_autonomia_habitual, padrino_preferido_id, acreditado_por_club,
    credencial_nro, saldo_reintegro_sancor, contacto_familiar_nombre, contacto_familiar_tel,
    notas_vulnerabilidad, estado_alta
) VALUES
(
    '44444444-4444-4444-8444-444444444001',
    'Rosa Martínez',
    74,
    '10.312.445',
    '+5493424200001',
    'adulto_mayor',
    'Sarmiento 3452, Barrio Candioti',
    '{"lat": -31.6342, "lng": -60.6878}'::jsonb,
    1,
    '33333333-3333-4333-8333-333333333104', -- Don Carlos (#104)
    FALSE,
    NULL,
    5000,
    'Lucía Martínez (Nieta)',
    '+5493425200001',
    'Nivel 1 (Aislamiento): Temor severo a caerse por baldosas sueltas tras tropiezo el año pasado. Le encanta jugar a la Canasta.',
    'activo'
),
(
    '44444444-4444-4444-8444-444444444002',
    'Nélida Beatriz Quiroga',
    78,
    '08.994.120',
    '+5493424200002',
    'adulto_mayor',
    'Chacabuco 1680, Barrio Candioti',
    '{"lat": -31.6348, "lng": -60.6930}'::jsonb,
    1,
    '33333333-3333-4333-8333-333333333108', -- Héctor Pereyra (#108)
    FALSE,
    NULL,
    2500,
    'Martín Quiroga (Hijo)',
    '+5493425200002',
    'Nivel 1 (Aislamiento): Usa bastón de apoyo; necesita brazo seguro para cruzar Bv. Gálvez.',
    'activo'
),
(
    '44444444-4444-4444-8444-444444444003',
    'Jorge Alberto Molina',
    71,
    '11.504.772',
    '+5493424200003',
    'adulto_mayor',
    'Necochea 3290, Barrio Candioti',
    '{"lat": -31.6368, "lng": -60.6865}'::jsonb,
    2,
    NULL,
    FALSE,
    NULL,
    7500,
    'Sofía Molina (Hija)',
    '+5493425200003',
    'Nivel 2 (Parada Esquina): Camina bien de día pero prefiere sumarse en esquina de Bv. Gálvez y Sarmiento. Fanático del Truco.',
    'activo'
),
(
    '44444444-4444-4444-8444-444444444004',
    'Hilda Ester López',
    73,
    '10.887.319',
    '+5493424200004',
    'adulto_mayor',
    'Balcarce 1820, Barrio Candioti',
    '{"lat": -31.6373, "lng": -60.6940}'::jsonb,
    2,
    NULL,
    FALSE,
    NULL,
    10000,
    'Diego López (Sobrino)',
    '+5493425200004',
    'Nivel 2 (Parada Esquina): Se suma siempre en Plaza Pueyrredón junto a sus vecinas.',
    'activo'
),
(
    '44444444-4444-4444-8444-444444444005',
    'Óscar "Cacho" Ferreyra',
    80,
    '06.412.908',
    '+5493424200005',
    'adulto_mayor',
    'Ituzaingó 1890, Barrio Candioti',
    '{"lat": -31.6391, "lng": -60.6922}'::jsonb,
    3,
    NULL,
    FALSE,
    NULL,
    12500,
    'Valeria Ferreyra (Hija)',
    '+5493425200005',
    'Nivel 3 (Directo al Club): Vive a media cuadra del club. Movilidad reducida para caminatas largas; participa en Ajedrez y Bingo.',
    'activo'
),
-- 5. Una (1) Solicitud Pendiente cargada por un Nieto desde el Formulario Web Público
(
    '44444444-4444-4444-8444-444444444006',
    'Ernesto "Tito" Benítez',
    79,
    '07.845.221',
    '+5493424200006',
    'adulto_mayor',
    'Sarmiento 3380, Barrio Candioti',
    '{"lat": -31.6349, "lng": -60.6879}'::jsonb,
    1,
    NULL,
    FALSE,
    NULL,
    0,
    'Tomás Benítez (Nieto)',
    '+5493425112233',
    'Derivación Familiar: Enviudó hace 4 meses, dejó de salir a hacer mandados por miedo a tropezar y vergüenza de ir solo al club. Vive a 40 metros de Don Carlos.',
    'pendiente_aprobacion'
);

-- 6. Jornada Activa del Día
INSERT INTO jornadas (
    id,
    circuito_id,
    fecha,
    hora_inicio_caminata,
    hora_encuentro_club,
    actividad_cierre,
    monto_reintegro_asistencia,
    plus_reintegro_padrino,
    estado,
    motivo_suspension
) VALUES (
    '55555555-5555-4555-8555-555555555001',
    '11111111-1111-4111-8111-111111111111',
    CURRENT_DATE,
    '15:40',
    '16:00',
    'Torneo de Truco, Canasta y Bingo Recreativo',
    2500,
    1500,
    'programada',
    NULL
);

-- 7. Registros iniciales de asistencia para la jornada (precargados para monitoreo en vivo)
INSERT INTO asistencias (
    id, jornada_id, participante_id, modalidad_elegida, parada_esquina_id,
    padrino_asignado_id, estado_padrino, acuse_suspension_leido, presente_validado_en_club
) VALUES
(
    '66666666-6666-4666-8666-666666666001',
    '55555555-5555-4555-8555-555555555001',
    '44444444-4444-4444-8444-444444444001', -- Rosa Martínez (lista para elegir en vivo en el Simulador)
    'sin_respuesta',
    NULL,
    '33333333-3333-4333-8333-333333333104',
    'no_aplica',
    FALSE,
    FALSE
),
(
    '66666666-6666-4666-8666-666666666002',
    '55555555-5555-4555-8555-555555555001',
    '44444444-4444-4444-8444-444444444002', -- Nélida Quiroga (Nivel 1 ya confirmada con Héctor #108)
    'nivel_1_puerta',
    NULL,
    '33333333-3333-4333-8333-333333333108',
    'confirmado',
    FALSE,
    FALSE
),
(
    '66666666-6666-4666-8666-666666666003',
    '55555555-5555-4555-8555-555555555001',
    '44444444-4444-4444-8444-444444444003', -- Jorge Molina (listo para elegir esquina en el Simulador)
    'sin_respuesta',
    NULL,
    NULL,
    'no_aplica',
    FALSE,
    FALSE
),
(
    '66666666-6666-4666-8666-666666666004',
    '55555555-5555-4555-8555-555555555001',
    '44444444-4444-4444-8444-444444444004', -- Hilda López (ya anotada en Parada 2 Plaza Pueyrredón)
    'nivel_2_esquina',
    'parada_2',
    NULL,
    'no_aplica',
    FALSE,
    FALSE
),
(
    '66666666-6666-4666-8666-666666666005',
    '55555555-5555-4555-8555-555555555001',
    '44444444-4444-4444-8444-444444444005', -- Óscar "Cacho" Ferreyra (Directo al Club)
    'nivel_3_directo',
    NULL,
    NULL,
    'no_aplica',
    FALSE,
    FALSE
);
