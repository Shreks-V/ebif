from datetime import datetime
import logging
from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Optional, List
from app.core.security import get_current_user
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.schemas.schemas import ReporteFilter, ReporteResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────── HELPERS ────────────────────────────


def _serialize(row: dict) -> dict:
    """Strip CHAR padding and convert datetimes to ISO strings."""
    result = {}
    for key, value in row.items():
        if isinstance(value, str):
            result[key] = value.strip()
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def _build_where_clauses(filtro: ReporteFilter) -> tuple[str, dict]:
    """Build WHERE clause fragments and bind params from ReporteFilter."""
    clauses = ["p.ACTIVO = 'S'"]
    params: dict = {}

    if filtro.genero:
        clauses.append("p.GENERO = :genero")
        params["genero"] = filtro.genero.upper()
    if filtro.estado:
        clauses.append("p.ESTADO = :estado")
        params["estado"] = filtro.estado
    if filtro.tipo_espina is not None:
        clauses.append(
            "EXISTS (SELECT 1 FROM PACIENTE_TIPO_ESPINA pte "
            "WHERE pte.ID_PACIENTE = p.ID_PACIENTE "
            "AND pte.ID_TIPO_ESPINA = :tipo_espina)"
        )
        params["tipo_espina"] = filtro.tipo_espina
    if filtro.fecha_inicio:
        clauses.append("p.FECHA_NACIMIENTO >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')")
        params["fecha_inicio"] = filtro.fecha_inicio
    if filtro.fecha_fin:
        clauses.append("p.FECHA_NACIMIENTO <= TO_DATE(:fecha_fin, 'YYYY-MM-DD')")
        params["fecha_fin"] = filtro.fecha_fin

    where = " AND ".join(clauses)
    return where, params


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/por-genero")
def reporte_por_genero(
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_espina: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Distribucion de pacientes por genero (PACIENTE.GENERO)."""
    filtro = ReporteFilter(
        genero=genero, estado=estado, tipo_espina=tipo_espina,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
    )
    where, params = _build_where_clauses(filtro)

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT p.GENERO AS label, COUNT(*) AS cnt "
                f"FROM PACIENTE p WHERE {where} "
                f"GROUP BY p.GENERO ORDER BY p.GENERO",
                params,
            )
            rows = rows_to_dicts(cursor)

            labels = [r["label"].strip() if r["label"] else "SIN DATO" for r in rows]
            values = [r["cnt"] for r in rows]

            return {
                "labels": labels,
                "values": values,
                "total": sum(values),
            }
    except Exception as e:
        logger.exception("Error en reporte por genero")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/por-etapa-vida")
def reporte_por_etapa_vida(
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_espina: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Distribucion por grupo de edad calculado desde PACIENTE.FECHA_NACIMIENTO."""
    filtro = ReporteFilter(
        genero=genero, estado=estado, tipo_espina=tipo_espina,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
    )
    where, params = _build_where_clauses(filtro)

    etapas_orden = [
        "Primera Infancia (0-5)",
        "Infancia (6-11)",
        "Adolescencia (12-17)",
        "Juventud (18-29)",
        "Adultez (30-59)",
        "Adulto Mayor (60+)",
    ]

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT "
                f"  CASE "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 5 "
                f"      THEN 'Primera Infancia (0-5)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 11 "
                f"      THEN 'Infancia (6-11)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 17 "
                f"      THEN 'Adolescencia (12-17)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 29 "
                f"      THEN 'Juventud (18-29)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 59 "
                f"      THEN 'Adultez (30-59)' "
                f"    ELSE 'Adulto Mayor (60+)' "
                f"  END AS etapa, "
                f"  COUNT(*) AS cnt "
                f"FROM PACIENTE p WHERE {where} "
                f"GROUP BY "
                f"  CASE "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 5 "
                f"      THEN 'Primera Infancia (0-5)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 11 "
                f"      THEN 'Infancia (6-11)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 17 "
                f"      THEN 'Adolescencia (12-17)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 29 "
                f"      THEN 'Juventud (18-29)' "
                f"    WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 59 "
                f"      THEN 'Adultez (30-59)' "
                f"    ELSE 'Adulto Mayor (60+)' "
                f"  END",
                params,
            )
            rows = rows_to_dicts(cursor)

            conteo = {r["etapa"].strip(): r["cnt"] for r in rows}
            values = [conteo.get(e, 0) for e in etapas_orden]

            return {
                "labels": etapas_orden,
                "values": values,
                "total": sum(values),
            }
    except Exception as e:
        logger.exception("Error en reporte por etapa de vida")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/por-tipo-espina")
def reporte_por_tipo_espina(
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_espina: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Distribucion por tipo de espina bifida (TIPO_ESPINA_BIFIDA table)."""
    filtro = ReporteFilter(
        genero=genero, estado=estado, tipo_espina=tipo_espina,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
    )
    where, params = _build_where_clauses(filtro)

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT t.NOMBRE AS label, COUNT(*) AS cnt "
                f"FROM PACIENTE p "
                f"JOIN PACIENTE_TIPO_ESPINA pte ON p.ID_PACIENTE = pte.ID_PACIENTE "
                f"JOIN TIPO_ESPINA_BIFIDA t ON pte.ID_TIPO_ESPINA = t.ID_TIPO_ESPINA "
                f"WHERE {where} "
                f"GROUP BY t.NOMBRE ORDER BY cnt DESC",
                params,
            )
            rows = rows_to_dicts(cursor)

            labels = [r["label"].strip() for r in rows]
            values = [r["cnt"] for r in rows]

            return {
                "labels": labels,
                "values": values,
                "total": sum(values),
            }
    except Exception as e:
        logger.exception("Error en reporte por tipo espina")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/por-estado")
def reporte_por_estado(
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_espina: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Distribucion de pacientes por estado/region (PACIENTE.ESTADO)."""
    filtro = ReporteFilter(
        genero=genero, estado=estado, tipo_espina=tipo_espina,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
    )
    where, params = _build_where_clauses(filtro)

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT p.ESTADO AS label, COUNT(*) AS cnt "
                f"FROM PACIENTE p WHERE {where} "
                f"GROUP BY p.ESTADO ORDER BY cnt DESC",
                params,
            )
            rows = rows_to_dicts(cursor)

            labels = [r["label"].strip() if r["label"] else "SIN DATO" for r in rows]
            values = [r["cnt"] for r in rows]

            return {
                "labels": labels,
                "values": values,
                "total": sum(values),
            }
    except Exception as e:
        logger.exception("Error en reporte por estado")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/resumen")
def reporte_resumen(
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_espina: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Resumen general de estadisticas del sistema."""
    filtro = ReporteFilter(
        genero=genero, estado=estado, tipo_espina=tipo_espina,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
    )
    where, params = _build_where_clauses(filtro)

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Total and active/inactive
            cursor.execute(
                f"SELECT COUNT(*) AS total, "
                f"  SUM(CASE WHEN p.ACTIVO = 'S' THEN 1 ELSE 0 END) AS activos, "
                f"  SUM(CASE WHEN p.ACTIVO = 'N' THEN 1 ELSE 0 END) AS inactivos "
                f"FROM PACIENTE p WHERE {where}",
                params,
            )
            totals = row_to_dict(cursor) or {"total": 0, "activos": 0, "inactivos": 0}

            # Gender breakdown
            cursor.execute(
                f"SELECT p.GENERO, COUNT(*) AS cnt "
                f"FROM PACIENTE p WHERE {where} "
                f"GROUP BY p.GENERO",
                params,
            )
            genero_rows = rows_to_dicts(cursor)
            por_genero = {
                (r["genero"].strip() if r["genero"] else "SIN DATO"): r["cnt"]
                for r in genero_rows
            }

            # Age stats
            cursor.execute(
                f"SELECT "
                f"  ROUND(AVG(FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12)), 1) AS edad_promedio, "
                f"  MIN(FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12)) AS edad_minima, "
                f"  MAX(FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12)) AS edad_maxima "
                f"FROM PACIENTE p WHERE {where} AND p.FECHA_NACIMIENTO IS NOT NULL",
                params,
            )
            age_row = row_to_dict(cursor) or {"edad_promedio": 0, "edad_minima": 0, "edad_maxima": 0}

            # Type breakdown
            cursor.execute(
                f"SELECT t.NOMBRE, COUNT(*) AS cnt "
                f"FROM PACIENTE p "
                f"JOIN PACIENTE_TIPO_ESPINA pte ON p.ID_PACIENTE = pte.ID_PACIENTE "
                f"JOIN TIPO_ESPINA_BIFIDA t ON pte.ID_TIPO_ESPINA = t.ID_TIPO_ESPINA "
                f"WHERE {where} "
                f"GROUP BY t.NOMBRE",
                params,
            )
            tipo_rows = rows_to_dicts(cursor)
            por_tipo_espina = {
                r["nombre"].strip(): r["cnt"] for r in tipo_rows
            }

            # States count
            cursor.execute(
                f"SELECT COUNT(DISTINCT p.ESTADO) AS cnt "
                f"FROM PACIENTE p WHERE {where}",
                params,
            )
            estados_row = row_to_dict(cursor) or {"cnt": 0}

            return {
                "total_pacientes": totals["total"] or 0,
                "activos": totals["activos"] or 0,
                "inactivos": totals["inactivos"] or 0,
                "por_genero": por_genero,
                "edad_promedio": float(age_row["edad_promedio"] or 0),
                "edad_minima": int(age_row["edad_minima"] or 0),
                "edad_maxima": int(age_row["edad_maxima"] or 0),
                "por_tipo_espina": por_tipo_espina,
                "estados_representados": estados_row["cnt"] or 0,
                "fecha_generacion": datetime.now().isoformat(),
            }
    except Exception as e:
        logger.exception("Error en reporte resumen")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# ──────────────── RF-ER-08: Servicios por tipo ────────────────


@router.get("/servicios-por-tipo")
def reporte_servicios_por_tipo(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Total de servicios brindados por tipo de servicio (RF-ER-08)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            clauses = ["d.CANCELADO = 'N'"]
            params: dict = {}

            if fecha_inicio:
                clauses.append("c.FECHA_HORA >= TO_TIMESTAMP(:fi, 'YYYY-MM-DD')")
                params["fi"] = fecha_inicio
            if fecha_fin:
                clauses.append("c.FECHA_HORA < TO_TIMESTAMP(:ff, 'YYYY-MM-DD') + 1")
                params["ff"] = fecha_fin

            where = " AND ".join(clauses)
            cursor.execute(
                f"""SELECT s.NOMBRE AS label, SUM(d.CANTIDAD) AS cnt,
                           SUM(d.MONTO_PAGADO) AS monto
                    FROM DETALLE_CITA_SERVICIO d
                    JOIN SERVICIO s ON s.ID_SERVICIO = d.ID_SERVICIO
                    JOIN CITA c ON c.ID_CITA = d.ID_CITA
                    WHERE {where}
                    GROUP BY s.NOMBRE ORDER BY cnt DESC""",
                params,
            )
            rows = rows_to_dicts(cursor)
            labels = [r["label"].strip() for r in rows]
            values = [int(r["cnt"]) for r in rows]
            montos = [float(r["monto"] or 0) for r in rows]
            return {"labels": labels, "values": values, "montos": montos, "total": sum(values)}
    except Exception:
        logger.exception("Error en reporte servicios por tipo")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# ──────────────── RF-ER-09: Estudios por tipo ────────────────


@router.get("/estudios-por-tipo")
def reporte_estudios_por_tipo(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Número de estudios (servicios de tipo estudio) realizados (RF-ER-09)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            clauses = ["d.CANCELADO = 'N'"]
            params: dict = {}

            if fecha_inicio:
                clauses.append("c.FECHA_HORA >= TO_TIMESTAMP(:fi, 'YYYY-MM-DD')")
                params["fi"] = fecha_inicio
            if fecha_fin:
                clauses.append("c.FECHA_HORA < TO_TIMESTAMP(:ff, 'YYYY-MM-DD') + 1")
                params["ff"] = fecha_fin

            where = " AND ".join(clauses)
            cursor.execute(
                f"""SELECT s.NOMBRE AS label, COUNT(*) AS cnt
                    FROM DETALLE_CITA_SERVICIO d
                    JOIN SERVICIO s ON s.ID_SERVICIO = d.ID_SERVICIO
                    JOIN CITA c ON c.ID_CITA = d.ID_CITA
                    WHERE {where}
                    GROUP BY s.NOMBRE ORDER BY cnt DESC""",
                params,
            )
            rows = rows_to_dicts(cursor)
            labels = [r["label"].strip() for r in rows]
            values = [int(r["cnt"]) for r in rows]
            return {"labels": labels, "values": values, "total": sum(values)}
    except Exception:
        logger.exception("Error en reporte estudios por tipo")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# ──────────────── RF-ER-10: Pagos exentos vs cuotas ────────────────


@router.get("/pagos-exentos")
def reporte_pagos_exentos(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Total de pagos exentos y cuotas de recuperación (RF-ER-10)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            clauses = ["v.CANCELADA = 'N'"]
            params: dict = {}

            if fecha_inicio:
                clauses.append("v.FECHA_VENTA >= TO_TIMESTAMP(:fi, 'YYYY-MM-DD')")
                params["fi"] = fecha_inicio
            if fecha_fin:
                clauses.append("v.FECHA_VENTA < TO_TIMESTAMP(:ff, 'YYYY-MM-DD') + 1")
                params["ff"] = fecha_fin

            where = " AND ".join(clauses)
            cursor.execute(
                f"""SELECT
                        COUNT(CASE WHEN v.EXENTO_PAGO = 'S' THEN 1 END) AS total_exentos,
                        COUNT(CASE WHEN v.EXENTO_PAGO = 'N' THEN 1 END) AS total_cuotas,
                        NVL(SUM(CASE WHEN v.EXENTO_PAGO = 'S' THEN v.MONTO_TOTAL ELSE 0 END), 0) AS monto_exentos,
                        NVL(SUM(CASE WHEN v.EXENTO_PAGO = 'N' THEN v.MONTO_TOTAL ELSE 0 END), 0) AS monto_cuotas,
                        NVL(SUM(v.MONTO_TOTAL), 0) AS monto_total
                    FROM VENTA v
                    WHERE {where}""",
                params,
            )
            row = row_to_dict(cursor)
            return {
                "total_exentos": int(row["total_exentos"] or 0),
                "total_cuotas": int(row["total_cuotas"] or 0),
                "monto_exentos": float(row["monto_exentos"] or 0),
                "monto_cuotas": float(row["monto_cuotas"] or 0),
                "monto_total": float(row["monto_total"] or 0),
            }
    except Exception:
        logger.exception("Error en reporte pagos exentos")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# ──────────────── RF-ER-07: Consolidado mensual ────────────────


@router.get("/consolidado-mensual")
def reporte_consolidado_mensual(
    mes: Optional[int] = Query(None, description="Mes (1-12)"),
    anio: Optional[int] = Query(None, description="Año"),
    current_user: dict = Depends(get_current_user),
):
    """Reporte mensual consolidado con resumen de servicios y demografía (RF-ER-07)."""
    from datetime import date as date_type
    hoy = date_type.today()
    m = mes or hoy.month
    a = anio or hoy.year

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            params = {"mes": m, "anio": a}

            # Pacientes atendidos en el mes (tuvieron cita completada)
            cursor.execute(
                """SELECT COUNT(DISTINCT c.ID_PACIENTE) AS pacientes_atendidos
                   FROM CITA c
                   WHERE c.ESTATUS = 'COMPLETADA'
                     AND EXTRACT(MONTH FROM c.FECHA_HORA) = :mes
                     AND EXTRACT(YEAR FROM c.FECHA_HORA) = :anio""",
                params,
            )
            r1 = row_to_dict(cursor)

            # Servicios brindados
            cursor.execute(
                """SELECT COUNT(*) AS total_servicios,
                          NVL(SUM(d.MONTO_PAGADO), 0) AS monto_servicios
                   FROM DETALLE_CITA_SERVICIO d
                   JOIN CITA c ON c.ID_CITA = d.ID_CITA
                   WHERE d.CANCELADO = 'N'
                     AND EXTRACT(MONTH FROM c.FECHA_HORA) = :mes
                     AND EXTRACT(YEAR FROM c.FECHA_HORA) = :anio""",
                params,
            )
            r2 = row_to_dict(cursor)

            # Ventas del mes
            cursor.execute(
                """SELECT COUNT(*) AS total_ventas,
                          NVL(SUM(v.MONTO_TOTAL), 0) AS monto_ventas
                   FROM VENTA v
                   WHERE v.CANCELADA = 'N'
                     AND EXTRACT(MONTH FROM v.FECHA_VENTA) = :mes
                     AND EXTRACT(YEAR FROM v.FECHA_VENTA) = :anio""",
                params,
            )
            r3 = row_to_dict(cursor)

            # Citas por estatus
            cursor.execute(
                """SELECT ESTATUS, COUNT(*) AS cnt
                   FROM CITA
                   WHERE EXTRACT(MONTH FROM FECHA_HORA) = :mes
                     AND EXTRACT(YEAR FROM FECHA_HORA) = :anio
                   GROUP BY ESTATUS""",
                params,
            )
            citas_status = {r["estatus"].strip(): int(r["cnt"]) for r in rows_to_dicts(cursor)}

            # Género de pacientes atendidos
            cursor.execute(
                """SELECT p.GENERO, COUNT(DISTINCT c.ID_PACIENTE) AS cnt
                   FROM CITA c
                   JOIN PACIENTE p ON p.ID_PACIENTE = c.ID_PACIENTE
                   WHERE c.ESTATUS = 'COMPLETADA'
                     AND EXTRACT(MONTH FROM c.FECHA_HORA) = :mes
                     AND EXTRACT(YEAR FROM c.FECHA_HORA) = :anio
                   GROUP BY p.GENERO""",
                params,
            )
            por_genero = {
                (r["genero"].strip() if r["genero"] else "SIN DATO"): int(r["cnt"])
                for r in rows_to_dicts(cursor)
            }

            return {
                "mes": m,
                "anio": a,
                "pacientes_atendidos": int(r1["pacientes_atendidos"] or 0),
                "total_servicios": int(r2["total_servicios"] or 0),
                "monto_servicios": float(r2["monto_servicios"] or 0),
                "total_ventas": int(r3["total_ventas"] or 0),
                "monto_ventas": float(r3["monto_ventas"] or 0),
                "citas_por_estatus": citas_status,
                "por_genero": por_genero,
                "fecha_generacion": datetime.now().isoformat(),
            }
    except Exception:
        logger.exception("Error en reporte consolidado mensual")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/historial", response_model=List[ReporteResponse])
def historial_reportes(
    tipo_reporte: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Historial de reportes generados (tabla REPORTE)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            clauses = ["1=1"]
            params: dict = {}

            if tipo_reporte:
                clauses.append("TIPO_REPORTE = :tipo_reporte")
                params["tipo_reporte"] = tipo_reporte.upper()
            if fecha_inicio:
                clauses.append("FECHA_GENERACION >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')")
                params["fecha_inicio"] = fecha_inicio
            if fecha_fin:
                clauses.append("FECHA_GENERACION <= TO_DATE(:fecha_fin, 'YYYY-MM-DD') + 1")
                params["fecha_fin"] = fecha_fin

            where = " AND ".join(clauses)
            cursor.execute(
                f"SELECT ID_REPORTE, ID_USUARIO, TIPO_REPORTE, FECHA_GENERACION, "
                f"FECHA_INICIO, FECHA_FIN, FORMATO "
                f"FROM REPORTE WHERE {where} "
                f"ORDER BY FECHA_GENERACION DESC",
                params,
            )
            rows = rows_to_dicts(cursor)
            return [_serialize(r) for r in rows]
    except Exception as e:
        logger.exception("Error al consultar historial de reportes")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
