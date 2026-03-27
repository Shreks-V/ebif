import os
import oracledb
from contextlib import contextmanager
from app.core.config import settings

_initialized = False


def _init_client():
    global _initialized
    if not _initialized:
        # Use thick mode only if ORACLE_CLIENT_DIR points to a valid directory
        # In Docker, we use thin mode (no Oracle Instant Client needed)
        client_dir = settings.ORACLE_CLIENT_DIR
        if client_dir and os.path.isdir(client_dir):
            oracledb.init_oracle_client(lib_dir=client_dir)
        _initialized = True


def get_connection():
    _init_client()
    return oracledb.connect(
        user=settings.ORACLE_USER,
        password=settings.ORACLE_PASSWORD,
        dsn=settings.ORACLE_DSN,
        config_dir=settings.ORACLE_CONFIG_DIR,
        wallet_location=settings.ORACLE_WALLET_DIR,
        wallet_password=settings.ORACLE_WALLET_PASSWORD,
    )


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def rows_to_dicts(cursor) -> list[dict]:
    columns = [col[0].lower() for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def row_to_dict(cursor) -> dict | None:
    columns = [col[0].lower() for col in cursor.description]
    row = cursor.fetchone()
    if row is None:
        return None
    return dict(zip(columns, row))
