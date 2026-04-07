-- ══════════════════════════════════════════════════════════════
-- SCRUM-42: Actualizacion de Base de Datos - Cuota A y B
-- Sistema de Gestion - Asociacion Espina Bifida de Leon
-- ══════════════════════════════════════════════════════════════

-- 1. El campo TIPO_CUOTA en la tabla PACIENTE almacena el tipo de cuota (A o B)
--    que determina los precios que se aplican a cada beneficiario.
--
-- 2. Las tablas SERVICIO y PRODUCTO tienen columnas diferenciadas:
--    - PRECIO_CUOTA_A: precio aplicable para beneficiarios con cuota tipo A
--    - PRECIO_CUOTA_B: precio aplicable para beneficiarios con cuota tipo B

-- ──────────────── PACIENTE (campo TIPO_CUOTA) ────────────────

-- La tabla PACIENTE ya incluye TIPO_CUOTA como parte de su definicion:
-- ALTER TABLE PACIENTE ADD TIPO_CUOTA VARCHAR2(2) DEFAULT 'A';
-- Valores permitidos: 'A', 'B'

-- Constraint para validar valores:
-- ALTER TABLE PACIENTE ADD CONSTRAINT CHK_TIPO_CUOTA CHECK (TIPO_CUOTA IN ('A', 'B'));


-- ──────────────── SERVICIO (precios diferenciados) ────────────────

-- La tabla SERVICIO ya contiene las columnas de precio por cuota:
-- CUOTA_RECUPERACION  NUMBER(10,2)  -- precio base/general
-- PRECIO_CUOTA_A      NUMBER(10,2)  -- precio para cuota A
-- PRECIO_CUOTA_B      NUMBER(10,2)  -- precio para cuota B

-- Ejemplo de datos actuales (seed_data.py):
-- Consulta medica general: Cuota A = $150, Cuota B = $200
-- Rehabilitacion fisica:   Cuota A = $200, Cuota B = $300
-- Terapia psicologica:     Cuota A = $180, Cuota B = $250
-- Valoracion neurologica:  Cuota A = $250, Cuota B = $350
-- Estudios de laboratorio: Cuota A = $300, Cuota B = $400


-- ──────────────── PRODUCTO (precios diferenciados) ────────────────

-- La tabla PRODUCTO tambien soporta precios por cuota:
-- PRECIO_CUOTA_A  NUMBER(10,2)
-- PRECIO_CUOTA_B  NUMBER(10,2)


-- ──────────────── CONSULTA DE VERIFICACION ────────────────

-- Verificar que TIPO_CUOTA esta presente en PACIENTE:
SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = 'PACIENTE' AND COLUMN_NAME = 'TIPO_CUOTA';

-- Verificar precios por cuota en SERVICIO:
SELECT COLUMN_NAME, DATA_TYPE
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = 'SERVICIO' AND COLUMN_NAME IN ('PRECIO_CUOTA_A', 'PRECIO_CUOTA_B');

-- Verificar precios por cuota en PRODUCTO:
SELECT COLUMN_NAME, DATA_TYPE
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = 'PRODUCTO' AND COLUMN_NAME IN ('PRECIO_CUOTA_A', 'PRECIO_CUOTA_B');

-- Listar beneficiarios por tipo de cuota:
SELECT TIPO_CUOTA, COUNT(*) AS total
FROM PACIENTE
WHERE ACTIVO = 'S'
GROUP BY TIPO_CUOTA;
