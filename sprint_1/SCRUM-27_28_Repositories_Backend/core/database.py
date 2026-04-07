import os
import oracledb
from contextlib import contextmanager
from app.core.config import settings

_initialized = False
_pool = None


def _init_client():
    global _initialized
    if not _initialized:
        # Use thick mode only if ORACLE_CLIENT_DIR points to a valid directory
        # In Docker, we use thin mode (no Oracle Instant Client needed)
        client_dir = settings.ORACLE_CLIENT_DIR
        if client_dir and os.path.isdir(client_dir):
            oracledb.init_oracle_client(lib_dir=client_dir)
        _initialized = True


def init_pool():
    """Create the connection pool (call once at app startup)."""
    global _pool
    if _pool is not None:
        return
    _init_client()
    _pool = oracledb.create_pool(
        user=settings.ORACLE_USER,
        password=settings.ORACLE_PASSWORD,
        dsn=settings.ORACLE_DSN,
        config_dir=settings.ORACLE_CONFIG_DIR,
        wallet_location=settings.ORACLE_WALLET_DIR,
        wallet_password=settings.ORACLE_WALLET_PASSWORD,
        min=2,
        max=10,
        increment=1,
    )


def close_pool():
    """Close the connection pool (call at app shutdown)."""
    global _pool
    if _pool is not None:
        _pool.close(force=True)
        _pool = None


def get_connection():
    if _pool is not None:
        return _pool.acquire()
    # Fallback: no pool yet (e.g., scripts outside FastAPI)
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
