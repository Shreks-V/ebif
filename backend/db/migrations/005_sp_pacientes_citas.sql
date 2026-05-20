-- ============================================================================
-- Migration 005 — Stored Procedures: módulos PACIENTES y CITAS
-- Fecha: 2026-04-14
--
--   1. SP_REGISTRAR_PACIENTE_COMPLETO — inserta PACIENTE + N filas en
--      PACIENTE_TIPO_ESPINA en una transacción atómica. El FOLIO lo genera
--      el caller (el prefijo depende del flujo de alta BEN/PRE) y se pasa
--      como parámetro.
--   2. SP_CREAR_CITA_CON_SERVICIOS — inserta CITA + N filas en
--      DETALLE_CITA_SERVICIO (con ID_DOCTOR por fila). Valida traslape con
--      otras citas del mismo paciente en ±1h y que el doctor tenga asignado
--      ese servicio en DOCTOR_SERVICIO.
--   3. SP_CANCELAR_CITA — marca la cita y todos sus detalles como cancelados.
--
-- Convención de errores:
--   -20200..-20299 pacientes
--   -20300..-20399 citas
-- ============================================================================

/**
 * SP_REGISTRAR_PACIENTE_COMPLETO — Alta atómica de paciente con tipos de espina bífida.
 * Inserta PACIENTE y N filas en PACIENTE_TIPO_ESPINA en una sola transacción.
 * El FOLIO debe ser generado por el caller (prefijo BEN o PRE según el flujo).
 * Requiere al menos un tipo de espina bífida.
 * Errores: -20201 folio vacío, -20202 CURP vacío, -20203 sin tipos espina, -20204 duplicado.
 */
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_PACIENTE_COMPLETO (
  p_folio                 IN  VARCHAR2,
  p_nombre                IN  VARCHAR2,
  p_apellido_paterno      IN  VARCHAR2,
  p_apellido_materno      IN  VARCHAR2,
  p_curp                  IN  VARCHAR2,
  p_genero                IN  VARCHAR2,
  p_fecha_nacimiento      IN  DATE,
  p_nombre_padre_madre    IN  VARCHAR2,
  p_direccion             IN  VARCHAR2,
  p_colonia               IN  VARCHAR2,
  p_ciudad                IN  VARCHAR2,
  p_estado                IN  VARCHAR2,
  p_codigo_postal         IN  VARCHAR2,
  p_telefono_casa         IN  VARCHAR2,
  p_telefono_celular      IN  VARCHAR2,
  p_correo                IN  VARCHAR2,
  p_en_emergencia_avisar  IN  VARCHAR2,
  p_telefono_emergencia   IN  VARCHAR2,
  p_municipio_nacimiento  IN  VARCHAR2,
  p_estado_nacimiento     IN  VARCHAR2,
  p_hospital_nacimiento   IN  VARCHAR2,
  p_tipo_sangre           IN  VARCHAR2,
  p_usa_valvula           IN  VARCHAR2,
  p_notas_adicionales     IN  VARCHAR2,
  p_fecha_alta            IN  DATE,
  p_tipo_cuota            IN  VARCHAR2,
  p_estatus_registro      IN  VARCHAR2,
  p_id_usuario_registro   IN  NUMBER,
  p_tipos_espina          IN  SYS.ODCINUMBERLIST,
  p_id_paciente_out       OUT NUMBER
)
AS
  v_i      NUMBER;
  v_new_id NUMBER;
BEGIN
  IF p_folio IS NULL OR LENGTH(TRIM(p_folio)) = 0 THEN
    RAISE_APPLICATION_ERROR(-20201, 'Folio requerido.');
  END IF;

  IF p_curp IS NULL OR LENGTH(TRIM(p_curp)) = 0 THEN
    RAISE_APPLICATION_ERROR(-20202, 'CURP requerido.');
  END IF;

  IF p_tipos_espina IS NULL OR p_tipos_espina.COUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20203,
      'Debe especificar al menos un tipo de espina bifida.');
  END IF;

  BEGIN
    INSERT INTO PACIENTE (
      FOLIO, ACTIVO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,
      GENERO, FECHA_NACIMIENTO, CURP, NOMBRE_PADRE_MADRE,
      DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,
      TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
      EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,
      MUNICIPIO_NACIMIENTO, ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO,
      TIPO_SANGRE, USA_VALVULA, NOTAS_ADICIONALES,
      FECHA_ALTA, MEMBRESIA_ESTATUS, ID_USUARIO_REGISTRO,
      TIPO_CUOTA, ESTATUS_REGISTRO, PASO_ACTUAL
    ) VALUES (
      p_folio, 'S', p_nombre, p_apellido_paterno, p_apellido_materno,
      p_genero, p_fecha_nacimiento, p_curp, p_nombre_padre_madre,
      p_direccion, p_colonia, p_ciudad, p_estado, p_codigo_postal,
      p_telefono_casa, p_telefono_celular, p_correo,
      p_en_emergencia_avisar, p_telefono_emergencia,
      p_municipio_nacimiento, p_estado_nacimiento, p_hospital_nacimiento,
      p_tipo_sangre, NVL(p_usa_valvula, 'N'), p_notas_adicionales,
      p_fecha_alta, 'ACTIVO', p_id_usuario_registro,
      p_tipo_cuota, NVL(p_estatus_registro, 'APROBADO'), 1
    )
    RETURNING ID_PACIENTE INTO v_new_id;
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
      RAISE_APPLICATION_ERROR(-20204,
        'Ya existe un paciente con ese folio o CURP.');
  END;
  p_id_paciente_out := v_new_id;

  FORALL v_i IN 1..p_tipos_espina.COUNT -- NOSONAR: falla atómica deseada — no usar SAVE EXCEPTIONS
    INSERT INTO PACIENTE_TIPO_ESPINA (
      ID_PACIENTE, ID_TIPO_ESPINA
    ) VALUES (
      p_id_paciente_out, p_tipos_espina(v_i)
    );
END SP_REGISTRAR_PACIENTE_COMPLETO;
/

/**
 * SP_CREAR_CITA_CON_SERVICIOS — Crea una cita con sus líneas de servicio en una transacción.
 * Valida traslape con otras citas del mismo paciente en ±1 hora y que cada doctor
 * tenga asignado el servicio correspondiente en DOCTOR_SERVICIO.
 * Inserta CITA y N filas en DETALLE_CITA_SERVICIO.
 * Errores: -20301..-20305.
 */
CREATE OR REPLACE PROCEDURE SP_CREAR_CITA_CON_SERVICIOS (
  p_id_paciente         IN  NUMBER,
  p_id_usuario_registro IN  NUMBER,
  p_fecha_hora          IN  TIMESTAMP,
  p_notas               IN  VARCHAR2,
  p_servicios           IN  SYS.ODCINUMBERLIST,
  p_doctores            IN  SYS.ODCINUMBERLIST,
  p_cantidades          IN  SYS.ODCINUMBERLIST,
  p_id_cita_out         OUT NUMBER
)
AS
  v_traslape  NUMBER;
  v_asignado  NUMBER;
  v_i         NUMBER;
  v_new_id    NUMBER;
  c_cancelada CONSTANT VARCHAR2(10) := 'CANCELADA';
BEGIN
  IF p_servicios IS NULL OR p_servicios.COUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20301, 'La cita requiere al menos un servicio.');
  END IF;

  IF p_servicios.COUNT <> p_doctores.COUNT
     OR p_servicios.COUNT <> p_cantidades.COUNT THEN
    RAISE_APPLICATION_ERROR(-20302,
      'Arrays de servicios, doctores y cantidades desalineados.');
  END IF;

  -- Traslape: cualquier cita del mismo paciente dentro de +/- 1 hora, no cancelada.
  SELECT COUNT(*) INTO v_traslape
  FROM CITA
  WHERE ID_PACIENTE = p_id_paciente
    AND ESTATUS <> c_cancelada
    AND FECHA_HORA BETWEEN p_fecha_hora - INTERVAL '1' HOUR
                       AND p_fecha_hora + INTERVAL '1' HOUR;
  IF v_traslape > 0 THEN
    RAISE_APPLICATION_ERROR(-20303,
      'El paciente ya tiene una cita en ese horario (+/- 1 hora).');
  END IF;

  -- Validar que cada doctor tenga asignado el servicio correspondiente
  v_i := 1;
  WHILE v_i <= p_servicios.COUNT LOOP
    IF p_doctores(v_i) IS NOT NULL THEN
      SELECT COUNT(*) INTO v_asignado
      FROM DOCTOR_SERVICIO
      WHERE ID_DOCTOR = p_doctores(v_i)
        AND ID_SERVICIO = p_servicios(v_i);
      IF v_asignado = 0 THEN
        RAISE_APPLICATION_ERROR(-20304,
          'Doctor ' || p_doctores(v_i) || ' no habilitado para servicio '
          || p_servicios(v_i) || '.');
      END IF;
    END IF;

    IF p_cantidades(v_i) IS NULL OR p_cantidades(v_i) <= 0 THEN
      RAISE_APPLICATION_ERROR(-20305,
        'Cantidad invalida para servicio ' || p_servicios(v_i) || '.');
    END IF;
    v_i := v_i + 1;
  END LOOP;

  INSERT INTO CITA (
    ID_PACIENTE, ID_USUARIO_REGISTRO, FECHA_HORA, ESTATUS, NOTAS
  ) VALUES (
    p_id_paciente, p_id_usuario_registro, p_fecha_hora, 'PROGRAMADA', p_notas
  )
  RETURNING ID_CITA INTO v_new_id;
  p_id_cita_out := v_new_id;

  FORALL v_i IN 1..p_servicios.COUNT -- NOSONAR: falla atómica deseada — no usar SAVE EXCEPTIONS
    INSERT INTO DETALLE_CITA_SERVICIO (
      ID_CITA, ID_SERVICIO, ID_DOCTOR, CANTIDAD, MONTO_PAGADO, CANCELADO
    ) VALUES (
      p_id_cita_out, p_servicios(v_i), p_doctores(v_i), p_cantidades(v_i), 0, 'N'
    );
END SP_CREAR_CITA_CON_SERVICIOS;
/

/**
 * SP_CANCELAR_CITA — Cancela una cita y todos sus detalles de servicio.
 * Bloquea la fila CITA con SELECT FOR UPDATE y valida que no esté ya cancelada
 * ni completada antes de marcar la cita y sus DETALLE_CITA_SERVICIO como cancelados.
 * Errores: -20306 cita inexistente, -20307 estado no cancelable.
 */
CREATE OR REPLACE PROCEDURE SP_CANCELAR_CITA (
  p_id_cita    IN NUMBER,
  p_motivo     IN VARCHAR2,
  p_id_usuario IN NUMBER -- NOSONAR
)
AS
  v_estatus   VARCHAR2(20);
  c_cancelada CONSTANT VARCHAR2(10) := 'CANCELADA';
BEGIN
  BEGIN
    SELECT ESTATUS INTO v_estatus
    FROM CITA
    WHERE ID_CITA = p_id_cita
    FOR UPDATE;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20306, 'La cita no existe.');
  END;

  IF v_estatus IN (c_cancelada, 'COMPLETADA') THEN
    RAISE_APPLICATION_ERROR(-20307,
      'La cita no es cancelable en su estado actual: ' || v_estatus || '.');
  END IF;

  UPDATE CITA
     SET ESTATUS = c_cancelada,
         NOTAS   = SUBSTR(
           NVL(NOTAS, '') || ' | CANCELACION: ' || NVL(p_motivo, ''),
           1, 500
         )
   WHERE ID_CITA = p_id_cita;

  UPDATE DETALLE_CITA_SERVICIO
     SET CANCELADO          = 'S',
         MOTIVO_CANCELACION = p_motivo
   WHERE ID_CITA = p_id_cita
     AND CANCELADO = 'N';
END SP_CANCELAR_CITA;
/
