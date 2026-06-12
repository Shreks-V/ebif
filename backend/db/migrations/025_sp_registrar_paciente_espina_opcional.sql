/**
 * 025_sp_registrar_paciente_espina_opcional.sql
 *
 * Hace que el tipo de espina bífida sea opcional en SP_REGISTRAR_PACIENTE_COMPLETO.
 * Antes: requería al menos un elemento en p_tipos_espina (error -20203).
 * Ahora: si el array está vacío o NULL, no inserta filas en PACIENTE_TIPO_ESPINA
 *        y el registro se crea igualmente.
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

  IF p_tipos_espina IS NOT NULL AND p_tipos_espina.COUNT > 0 THEN
    FORALL v_i IN 1..p_tipos_espina.COUNT -- NOSONAR
      INSERT INTO PACIENTE_TIPO_ESPINA (
        ID_PACIENTE, ID_TIPO_ESPINA
      ) VALUES (
        p_id_paciente_out, p_tipos_espina(v_i)
      );
  END IF;
END SP_REGISTRAR_PACIENTE_COMPLETO;
/
