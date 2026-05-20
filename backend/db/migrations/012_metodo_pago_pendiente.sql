-- Add 'PENDIENTE' payment method for deferred/loan payments.
-- Idempotent: MERGE only inserts if not already present.

BEGIN
  MERGE INTO METODO_PAGO t
  USING DUAL
    ON (UPPER(t.NOMBRE) = 'PENDIENTE')
  WHEN NOT MATCHED THEN
    INSERT (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    VALUES (5, 'PENDIENTE', 'Pago pendiente / prestamo', 'S');
  COMMIT;
END;
/
