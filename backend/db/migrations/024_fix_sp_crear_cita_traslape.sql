/**
 * 024_fix_sp_crear_cita_traslape.sql
 *
 * Problema: SP_CREAR_CITA_CON_SERVICIOS bloqueaba nuevas citas si el paciente
 * tenía una cita COMPLETADA dentro de ±1 hora.  Sólo deben bloquear las citas
 * activas (PROGRAMADA o EN_CURSO).
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
BEGIN
  IF p_servicios IS NULL OR p_servicios.COUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20301, 'La cita requiere al menos un servicio.');
  END IF;

  IF p_servicios.COUNT <> p_doctores.COUNT
     OR p_servicios.COUNT <> p_cantidades.COUNT THEN
    RAISE_APPLICATION_ERROR(-20302,
      'Arrays de servicios, doctores y cantidades desalineados.');
  END IF;

  -- Traslape: sólo citas PROGRAMADA o EN_CURSO dentro de ±1 hora.
  SELECT COUNT(*) INTO v_traslape
  FROM CITA
  WHERE ID_PACIENTE = p_id_paciente
    AND ESTATUS IN ('PROGRAMADA', 'EN_CURSO')
    AND FECHA_HORA BETWEEN p_fecha_hora - INTERVAL '1' HOUR
                       AND p_fecha_hora + INTERVAL '1' HOUR;
  IF v_traslape > 0 THEN
    RAISE_APPLICATION_ERROR(-20303,
      'El paciente ya tiene una cita activa en ese horario (+/- 1 hora).');
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

  FORALL v_i IN 1..p_servicios.COUNT -- NOSONAR
    INSERT INTO DETALLE_CITA_SERVICIO (
      ID_CITA, ID_SERVICIO, ID_DOCTOR, CANTIDAD, MONTO_PAGADO, CANCELADO
    ) VALUES (
      p_id_cita_out, p_servicios(v_i), p_doctores(v_i), p_cantidades(v_i), 0, 'N'
    );
END SP_CREAR_CITA_CON_SERVICIOS;
/
