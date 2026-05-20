-- Add 'DONADO' to COMODATO.ESTATUS allowed values.
-- Idempotent: drops the constraint by its system name via a loop.

DECLARE
BEGIN
  FOR c IN (
    SELECT constraint_name
      FROM user_constraints
     WHERE table_name = 'COMODATO'
       AND constraint_type = 'C'
       AND search_condition_vc LIKE '%PRESTADO%' -- NOSONAR
  ) LOOP
    BEGIN
      EXECUTE IMMEDIATE 'ALTER TABLE COMODATO DROP CONSTRAINT ' || c.constraint_name; -- NOSONAR: constraint_name proviene de user_constraints (vista del sistema), no de input externo
    EXCEPTION
      WHEN OTHERS THEN
        NULL; -- NOSONAR: idempotent — ignore if constraint was already dropped
    END;
  END LOOP;
END;
/

ALTER TABLE COMODATO
  ADD CONSTRAINT CHK_COMODATO_ESTATUS
  CHECK (ESTATUS IN ('PRESTADO','DEVUELTO','CANCELADO','DONADO'));
