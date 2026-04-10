import logging

from app.infrastructure.persistence.oracle import get_db

logger = logging.getLogger(__name__)


def run_startup_migrations() -> None:
    """Run lightweight DDL migrations on startup (idempotent)."""
    migrations = [
        "ALTER TABLE DISPONIBILIDAD_DOCTOR ADD (DIA_SEMANA NUMBER(1))",
        "ALTER TABLE EXISTENCIA_PRODUCTO ADD (FECHA_CADUCIDAD DATE)",
    ]
    with get_db() as conn:
        cur = conn.cursor()
        for ddl in migrations:
            try:
                cur.execute(ddl)
                conn.commit()
                logger.info("Migration OK: %s", ddl[:60])
            except Exception:
                continue
