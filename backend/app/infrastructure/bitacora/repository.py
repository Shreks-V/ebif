from __future__ import annotations

import logging
from typing import Optional

from app.infrastructure.persistence.oracle import get_db, rows_to_dicts

logger = logging.getLogger(__name__)


def _build_where(
    tabla: Optional[str],
    tipo_operacion: Optional[str],
    fecha_inicio: Optional[str],
    fecha_fin: Optional[str],
    busqueda: Optional[str],
) -> tuple[str, dict]:
    clauses: list[str] = []
    params: dict = {}

    if tabla:
        clauses.append("b.TABLA_AFECTADA = :tabla")
        params["tabla"] = tabla.upper()

    if tipo_operacion:
        clauses.append("b.TIPO_OPERACION = :tipo_op")
        params["tipo_op"] = tipo_operacion.upper()

    if fecha_inicio:
        clauses.append("TRUNC(b.FECHA_CAMBIO) >= TO_DATE(:fi, 'YYYY-MM-DD')")
        params["fi"] = fecha_inicio

    if fecha_fin:
        clauses.append("TRUNC(b.FECHA_CAMBIO) <= TO_DATE(:ff, 'YYYY-MM-DD')")
        params["ff"] = fecha_fin

    if busqueda:
        clauses.append(
            "(UPPER(b.TABLA_AFECTADA) LIKE :busq OR UPPER(b.CAMPO_MODIFICADO) LIKE :busq"
            " OR UPPER(b.VALOR_ANTERIOR) LIKE :busq OR UPPER(b.VALOR_NUEVO) LIKE :busq"
            " OR UPPER(u.NOMBRE) LIKE :busq OR UPPER(u.APELLIDO_PATERNO) LIKE :busq)"
        )
        params["busq"] = f"%{busqueda.upper()}%"

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params


def _listar_bitacora(
    tabla: Optional[str] = None,
    tipo_operacion: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    busqueda: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))

    where, params = _build_where(tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda)
    params["limit"] = safe_limit
    params["offset"] = safe_offset

    sql = f"""
        SELECT
            b.ID_BITACORA,
            b.TABLA_AFECTADA,
            b.ID_REGISTRO_AFECTADO,
            b.CAMPO_MODIFICADO,
            b.VALOR_ANTERIOR,
            b.VALOR_NUEVO,
            b.TIPO_OPERACION,
            b.ID_USUARIO,
            TO_CHAR(b.FECHA_CAMBIO, 'YYYY-MM-DD"T"HH24:MI:SS') AS FECHA_CAMBIO,
            b.OBSERVACIONES,
            u.NOMBRE        AS USUARIO_NOMBRE,
            u.APELLIDO_PATERNO AS USUARIO_APELLIDO,
            u.CORREO        AS USUARIO_CORREO
        FROM BITACORA_CAMBIOS b
        LEFT JOIN USUARIO_SISTEMA u ON u.ID_USUARIO = b.ID_USUARIO
        {where}
        ORDER BY b.FECHA_CAMBIO DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return rows_to_dicts(cursor)


def _contar_bitacora(
    tabla: Optional[str] = None,
    tipo_operacion: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    busqueda: Optional[str] = None,
) -> int:
    where, params = _build_where(tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda)

    sql = f"""
        SELECT COUNT(*) AS TOTAL
        FROM BITACORA_CAMBIOS b
        LEFT JOIN USUARIO_SISTEMA u ON u.ID_USUARIO = b.ID_USUARIO
        {where}
    """

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return int(row[0]) if row else 0


class OracleBitacoraRepository:
    def _listar_bitacora(
        self,
        tabla: Optional[str] = None,
        tipo_operacion: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        busqueda: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        return _listar_bitacora(tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda, limit, offset)

    def _contar_bitacora(
        self,
        tabla: Optional[str] = None,
        tipo_operacion: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        busqueda: Optional[str] = None,
    ) -> int:
        return _contar_bitacora(tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda)
