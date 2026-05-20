-- ============================================================================
-- Migration 018 — Seed data de catálogos
-- Fecha: 2026-04-30
-- Objetivo: insertar datos de catálogo requeridos para operar el sistema
--   en una BD nueva/limpia: métodos de pago, tipos de espina bífida,
--   tipos de documento y servicios básicos.
-- Todos los bloques son idempotentes (MERGE INTO ... USING DUAL).
-- ============================================================================

-- 1. METODO_PAGO (IDs fijos que referencia el código y los tests)
BEGIN
  MERGE INTO METODO_PAGO t USING DUAL ON (t.ID_METODO_PAGO = 1)
  WHEN NOT MATCHED THEN INSERT (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    VALUES (1, 'EFECTIVO', 'Pago en efectivo', 'S');

  MERGE INTO METODO_PAGO t USING DUAL ON (t.ID_METODO_PAGO = 2)
  WHEN NOT MATCHED THEN INSERT (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    VALUES (2, 'TARJETA', 'Tarjeta de crédito / débito', 'S');

  MERGE INTO METODO_PAGO t USING DUAL ON (t.ID_METODO_PAGO = 3)
  WHEN NOT MATCHED THEN INSERT (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    VALUES (3, 'TRANSFERENCIA', 'Transferencia bancaria / SPEI', 'S');

  MERGE INTO METODO_PAGO t USING DUAL ON (t.ID_METODO_PAGO = 4)
  WHEN NOT MATCHED THEN INSERT (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    VALUES (4, 'EXENTO', 'Pago exento / donación', 'S');

  -- ID 5 PENDIENTE ya insertado en migration 012; se omite.
  COMMIT;
END;
/

-- 2. TIPO_ESPINA_BIFIDA
BEGIN
  MERGE INTO TIPO_ESPINA_BIFIDA t USING DUAL ON (UPPER(t.NOMBRE) = 'MIELOMENINGOCELE')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Mielomeningocele',
            'Tipo más severo; la médula espinal y sus cubiertas protruyen fuera de la columna.',
            'S');

  MERGE INTO TIPO_ESPINA_BIFIDA t USING DUAL ON (UPPER(t.NOMBRE) = 'MENINGOCELE')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Meningocele',
            'Las meninges protruyen pero la médula espinal no está dañada.',
            'S');

  MERGE INTO TIPO_ESPINA_BIFIDA t USING DUAL ON (UPPER(t.NOMBRE) = 'ESPINA BÍFIDA OCULTA')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Espina Bífida Oculta',
            'Defecto leve; uno o más vértebras no se cierran completamente sin protrusión.',
            'S');

  MERGE INTO TIPO_ESPINA_BIFIDA t USING DUAL ON (UPPER(t.NOMBRE) = 'LIPOMENINGOCELE')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Lipomeningocele',
            'Tejido graso se forma debajo de la piel y se conecta con la médula espinal.',
            'S');

  MERGE INTO TIPO_ESPINA_BIFIDA t USING DUAL ON (UPPER(t.NOMBRE) = 'MIELOCELE')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Mielocele',
            'La médula espinal expuesta queda al descubierto sin cobertura meníngea.',
            'S');

  COMMIT;
END;
/

-- 3. TIPO_DOCUMENTO (para pre-registro y expediente de beneficiarios)
BEGIN
  MERGE INTO TIPO_DOCUMENTO t USING DUAL ON (UPPER(t.NOMBRE) = 'ACTA DE NACIMIENTO')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Acta de Nacimiento', 'Acta de nacimiento del beneficiario.', 'S');

  MERGE INTO TIPO_DOCUMENTO t USING DUAL ON (UPPER(t.NOMBRE) = 'COMPROBANTE DE DOMICILIO')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Comprobante de Domicilio', 'Recibo de luz, agua, teléfono o similar reciente.', 'S');

  MERGE INTO TIPO_DOCUMENTO t USING DUAL ON (UPPER(t.NOMBRE) = 'CURP')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('CURP', 'Clave Única de Registro de Población.', 'S');

  MERGE INTO TIPO_DOCUMENTO t USING DUAL ON (UPPER(t.NOMBRE) = 'IDENTIFICACIÓN OFICIAL')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Identificación Oficial', 'INE, pasaporte o credencial vigente.', 'S');

  MERGE INTO TIPO_DOCUMENTO t USING DUAL ON (UPPER(t.NOMBRE) = 'HISTORIAL MÉDICO')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Historial Médico', 'Resumen o expediente clínico previo.', 'S');

  MERGE INTO TIPO_DOCUMENTO t USING DUAL ON (UPPER(t.NOMBRE) = 'FOTOGRAFÍA')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Fotografía', 'Fotografía reciente del beneficiario (para credencial).', 'S');

  MERGE INTO TIPO_DOCUMENTO t USING DUAL ON (UPPER(t.NOMBRE) = 'CONSTANCIA MÉDICA')
  WHEN NOT MATCHED THEN INSERT (NOMBRE, DESCRIPCION, ACTIVO)
    VALUES ('Constancia Médica', 'Diagnóstico o constancia emitida por médico.', 'S');

  COMMIT;
END;
/

-- 4. SERVICIO (servicios ofrecidos por la asociación)
BEGIN
  MERGE INTO SERVICIO t USING DUAL ON (UPPER(t.NOMBRE) = 'CONSULTA MÉDICA')
  WHEN NOT MATCHED THEN
    INSERT (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    VALUES ('Consulta Médica', 'Consulta con médico general o especialista.', 0, 'S', 0, SYSDATE);

  MERGE INTO SERVICIO t USING DUAL ON (UPPER(t.NOMBRE) = 'TERAPIA FÍSICA')
  WHEN NOT MATCHED THEN
    INSERT (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    VALUES ('Terapia Física', 'Sesión de rehabilitación física y motriz.', 0, 'S', 0, SYSDATE);

  MERGE INTO SERVICIO t USING DUAL ON (UPPER(t.NOMBRE) = 'TERAPIA OCUPACIONAL')
  WHEN NOT MATCHED THEN
    INSERT (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    VALUES ('Terapia Ocupacional', 'Sesión de terapia para desarrollo de habilidades funcionales.', 0, 'S', 0, SYSDATE);

  MERGE INTO SERVICIO t USING DUAL ON (UPPER(t.NOMBRE) = 'ORIENTACIÓN PSICOLÓGICA')
  WHEN NOT MATCHED THEN
    INSERT (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    VALUES ('Orientación Psicológica', 'Sesión de apoyo psicológico para paciente o familia.', 0, 'S', 0, SYSDATE);

  MERGE INTO SERVICIO t USING DUAL ON (UPPER(t.NOMBRE) = 'EVALUACIÓN NEUROLÓGICA')
  WHEN NOT MATCHED THEN
    INSERT (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    VALUES ('Evaluación Neurológica', 'Evaluación del sistema nervioso por especialista.', 0, 'S', 0, SYSDATE);

  MERGE INTO SERVICIO t USING DUAL ON (UPPER(t.NOMBRE) = 'TRABAJO SOCIAL')
  WHEN NOT MATCHED THEN
    INSERT (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    VALUES ('Trabajo Social', 'Gestión de apoyos y orientación a familias.', 0, 'S', 0, SYSDATE);

  COMMIT;
END;
/
