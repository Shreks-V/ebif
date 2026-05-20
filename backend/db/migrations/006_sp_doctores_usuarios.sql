-- ============================================================================
-- Migration 006 — Stored Procedures: módulos DOCTORES y USUARIOS
-- Fecha: 2026-04-14
--
--   1. SP_ASIGNAR_SERVICIOS_DOCTOR — reemplaza el set de servicios de un
--      doctor en una sola transacción: borra los que ya no están en la
--      lista, inserta los nuevos.
--   2. SP_CREAR_USUARIO_SISTEMA — alta de usuario con validación de rol
--      y correo único. La bitácora de alta la inserta
--      TRG_BITACORA_USUARIO_AIUD automáticamente.
--   3. SP_REGISTRAR_LOGIN_USUARIO — actualiza FECHA_ULTIMO_LOGIN en
--      logins exitosos y escribe una entrada de bitácora para cada
--      intento (OK o FAIL).
--
-- Convención de errores:
--   -20100..-20199 auth/usuarios
--   -20600..-20699 doctores
-- ============================================================================

/**
 * SP_ASIGNAR_SERVICIOS_DOCTOR — Reemplaza el conjunto de servicios de un doctor.
 * Elimina los servicios que ya no están en la nueva lista e inserta los nuevos,
 * todo en una sola transacción. Lista vacía elimina todos los servicios del doctor.
 * Errores: -20601 doctor inactivo o inexistente.
 */
CREATE OR REPLACE PROCEDURE SP_ASIGNAR_SERVICIOS_DOCTOR (
  p_id_doctor IN NUMBER,
  p_servicios IN SYS.ODCINUMBERLIST
)
AS
  v_existe NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_existe
  FROM DOCTOR
  WHERE ID_DOCTOR = p_id_doctor
    AND ACTIVO    = 'S';

  IF v_existe = 0 THEN
    RAISE_APPLICATION_ERROR(-20601, 'El doctor no existe o esta inactivo.');
  END IF;

  IF p_servicios IS NULL OR p_servicios.COUNT = 0 THEN
    -- Lista vacia = quitar todos los servicios del doctor
    DELETE FROM DOCTOR_SERVICIO WHERE ID_DOCTOR = p_id_doctor;
    RETURN; -- NOSONAR
  END IF;

  -- Borrar los que ya no estan en la nueva lista
  DELETE FROM DOCTOR_SERVICIO
  WHERE ID_DOCTOR = p_id_doctor
    AND ID_SERVICIO NOT IN (
      SELECT COLUMN_VALUE FROM TABLE(p_servicios)
    );

  -- Insertar los nuevos (ignorar los que ya existen)
  INSERT INTO DOCTOR_SERVICIO (ID_DOCTOR, ID_SERVICIO)
  SELECT p_id_doctor, COLUMN_VALUE
  FROM TABLE(p_servicios)
  WHERE COLUMN_VALUE NOT IN (
    SELECT ID_SERVICIO
    FROM DOCTOR_SERVICIO
    WHERE ID_DOCTOR = p_id_doctor
  );
END SP_ASIGNAR_SERVICIOS_DOCTOR;
/

/**
 * SP_CREAR_USUARIO_SISTEMA — Alta de usuario del sistema con validación de rol y correo único.
 * Valida que el rol sea uno de los cuatro permitidos y que el correo no esté en blanco.
 * La bitácora de alta la inserta TRG_BITACORA_USUARIO_AIUD automáticamente al hacer INSERT.
 * Errores: -20101 rol inválido, -20102 correo vacío, -20103 hash vacío, -20104 correo duplicado.
 */
CREATE OR REPLACE PROCEDURE SP_CREAR_USUARIO_SISTEMA (
  p_nombre            IN  VARCHAR2,
  p_apellido_paterno  IN  VARCHAR2,
  p_apellido_materno  IN  VARCHAR2,
  p_correo            IN  VARCHAR2,
  p_contrasena_hash   IN  VARCHAR2,
  p_rol               IN  VARCHAR2,
  p_id_usuario_out    OUT NUMBER
)
AS
  v_new_id NUMBER;
BEGIN
  IF p_rol NOT IN ('ADMINISTRADOR','RECEPCIONISTA','DOCTOR','ENCARGADO_ALMACEN') THEN
    RAISE_APPLICATION_ERROR(-20101,
      'Rol invalido. Usa ADMINISTRADOR, RECEPCIONISTA, DOCTOR o ENCARGADO_ALMACEN.');
  END IF;

  IF p_correo IS NULL OR LENGTH(TRIM(p_correo)) = 0 THEN
    RAISE_APPLICATION_ERROR(-20102, 'Correo requerido.');
  END IF;

  IF p_contrasena_hash IS NULL OR LENGTH(p_contrasena_hash) = 0 THEN
    RAISE_APPLICATION_ERROR(-20103, 'Hash de contrasena requerido.');
  END IF;

  BEGIN
    INSERT INTO USUARIO_SISTEMA (
      NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,
      CORREO, CONTRASENA_HASH, ROL, ESTATUS
    ) VALUES (
      p_nombre, p_apellido_paterno, p_apellido_materno,
      p_correo, p_contrasena_hash, p_rol, 'ACTIVO'
    )
    RETURNING ID_USUARIO INTO v_new_id;
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
      RAISE_APPLICATION_ERROR(-20104,
        'Ya existe un usuario con ese correo.');
  END;
  p_id_usuario_out := v_new_id;
END SP_CREAR_USUARIO_SISTEMA;
/

/**
 * SP_REGISTRAR_LOGIN_USUARIO — Registra un intento de login en la bitácora de cambios.
 * En logins exitosos (p_exito = 'S') actualiza FECHA_ULTIMO_LOGIN en USUARIO_SISTEMA.
 * En ambos casos (éxito o fallo) inserta una entrada en BITACORA_CAMBIOS con la IP.
 * Es un no-op silencioso si p_id_usuario es NULL.
 */
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_LOGIN_USUARIO (
  p_id_usuario IN NUMBER,
  p_exito      IN VARCHAR2,
  p_ip         IN VARCHAR2 DEFAULT NULL
)
AS
BEGIN
  IF p_id_usuario IS NULL THEN
    RETURN; -- no-op si no hay usuario -- NOSONAR
  END IF;

  IF NVL(p_exito, 'N') = 'S' THEN
    UPDATE USUARIO_SISTEMA
       SET FECHA_ULTIMO_LOGIN = SYSTIMESTAMP
     WHERE ID_USUARIO = p_id_usuario;

    INSERT INTO BITACORA_CAMBIOS (
      TABLA_AFECTADA, ID_REGISTRO_AFECTADO, CAMPO_MODIFICADO,
      VALOR_ANTERIOR, VALOR_NUEVO, TIPO_OPERACION,
      ID_USUARIO, FECHA_CAMBIO, OBSERVACIONES
    ) VALUES (
      'USUARIO_SISTEMA', p_id_usuario, 'FECHA_ULTIMO_LOGIN',
      NULL, TO_CHAR(SYSTIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'),
      'LOGIN_OK', p_id_usuario, SYSTIMESTAMP, p_ip
    );
  ELSE
    INSERT INTO BITACORA_CAMBIOS (
      TABLA_AFECTADA, ID_REGISTRO_AFECTADO, CAMPO_MODIFICADO,
      VALOR_ANTERIOR, VALOR_NUEVO, TIPO_OPERACION,
      ID_USUARIO, FECHA_CAMBIO, OBSERVACIONES
    ) VALUES (
      'USUARIO_SISTEMA', p_id_usuario, NULL,
      NULL, NULL,
      'LOGIN_FAIL', p_id_usuario, SYSTIMESTAMP, p_ip
    );
  END IF;
END SP_REGISTRAR_LOGIN_USUARIO;
/
