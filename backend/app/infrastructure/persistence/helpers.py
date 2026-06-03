"""Helpers compartidos para repositorios Oracle.

Centraliza utilidades de serialización, paginación y normalización de fechas
usadas en múltiples capas de infraestructura.
"""
from __future__ import annotations

from datetime import date, datetime

import oracledb

import logging


def normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    """Clamp pagination params to safe bounds (1-500 / 0+)."""
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))
    return safe_limit, safe_offset


def date_to_str(val: object) -> str | None:
    """Convert a datetime/date object to ISO string, or return None."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return str(val)


def normalize_date_input(val: object) -> str | None:
    """Normalize date-like values to YYYY-MM-DD for Oracle TO_DATE bindings."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date().isoformat()
    if isinstance(val, date):
        return val.isoformat()
    text = str(val).strip()
    if not text:
        return None
    if 'T' in text:
        text = text.split('T', 1)[0]
    if ' ' in text and len(text) > 10:
        text = text.split(' ', 1)[0]
    return text[:10]


def strip_char(val: object) -> str | None:
    """Strip trailing spaces from Oracle CHAR columns."""
    if val is None:
        return None
    return str(val).strip()


def serialize_row(row: dict) -> dict:
    """Strip CHAR padding and convert date/datetime values to ISO strings."""
    result: dict = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, str):
            result[key] = value.strip()
        else:
            result[key] = value
    return result


def safe_rows_query(
    cur: oracledb.Cursor,
    sql: str,
    params: dict,
    context: str,
    logger: logging.Logger,
) -> list[dict]:
    """Execute a read query and return an empty list on failure."""
    from app.infrastructure.persistence.oracle import rows_to_dicts  # avoid circular at module level
    try:
        cur.execute(sql, params)
        return rows_to_dicts(cur)
    except oracledb.DatabaseError as exc:
        logger.warning('No se pudo cargar %s: %s', context, exc)
        return []
