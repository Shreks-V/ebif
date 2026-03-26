from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from app.core.security import get_current_user
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.schemas.schemas import CitaCreate, CitaResponse

router = APIRouter()

# ──────────────────────────── HELPERS ────────────────────────────

CITA_BASE_QUERY = """
    SELECT c.ID_CITA, c.ID_PACIENTE, c.ID_USUARIO_REGISTRO,
           c.FECHA_HORA, c.ESTATUS, c.NOTAS, c.FECHA_REGISTRO,
           p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '') AS NOMBRE_PACIENTE,
           p.FOLIO AS FOLIO_PACIENTE
    FROM CITA c
    JOIN PACIENTE p ON c.ID_PACIENTE = p.ID_PACIENTE
"""


def _serialize_row(row: dict) -> dict:
    """Convert datetime objects to ISO strings."""
    result = {}
    for key, value in row.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def _fetch_servicios(conn, id_cita: int) -> list[dict]:
    """Fetch servicios for a given cita."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT d.ID_SERVICIO, s.NOMBRE, d.CANTIDAD, d.MONTO_PAGADO
        FROM DETALLE_CITA_SERVICIO d
        JOIN SERVICIO s ON d.ID_SERVICIO = s.ID_SERVICIO
        WHERE d.ID_CITA = :id_cita AND d.CANCELADO = 'N'
        """,
        {"id_cita": id_cita},
    )
    return rows_to_dicts(cursor)


def _enrich_cita(conn, cita: dict) -> dict:
    """Add servicios list and serialize datetimes."""
    cita = _serialize_row(cita)
    cita["servicios"] = _fetch_servicios(conn, cita["id_cita"])
    return cita


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/stats")
def citas_stats(current_user: dict = Depends(get_current_user)):
    """Obtener conteo de citas por estatus."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ESTATUS, COUNT(*) AS TOTAL
            FROM CITA
            GROUP BY ESTATUS
            """
        )
        rows = rows_to_dicts(cursor)
    stats = {r["estatus"]: r["total"] for r in rows}
    return stats


@router.get("/hoy")
def citas_hoy(current_user: dict = Depends(get_current_user)):
    """Obtener el conteo de citas de hoy."""
    hoy = date.today()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            CITA_BASE_QUERY
            + " WHERE TRUNC(c.FECHA_HORA) = :fecha ORDER BY c.FECHA_HORA",
            {"fecha": hoy},
        )
        citas = rows_to_dicts(cursor)
        citas = [_enrich_cita(conn, c) for c in citas]

    programadas = sum(1 for c in citas if c["estatus"] == "PROGRAMADA")
    en_curso = sum(1 for c in citas if c["estatus"] == "EN_CURSO")
    completadas = sum(1 for c in citas if c["estatus"] == "COMPLETADA")
    canceladas = sum(1 for c in citas if c["estatus"] == "CANCELADA")
    return {
        "fecha": hoy.isoformat(),
        "total": len(citas),
        "programadas": programadas,
        "en_curso": en_curso,
        "completadas": completadas,
        "canceladas": canceladas,
        "citas": citas,
    }


@router.get("/")
def listar_citas(
    fecha: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    id_paciente: Optional[int] = Query(None),
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar citas con filtros opcionales."""
    conditions = []
    params: dict = {}

    if fecha:
        conditions.append("TRUNC(c.FECHA_HORA) = TO_DATE(:fecha, 'YYYY-MM-DD')")
        params["fecha"] = fecha

    if estatus:
        conditions.append("c.ESTATUS = :estatus")
        params["estatus"] = estatus

    if id_paciente is not None:
        conditions.append("c.ID_PACIENTE = :id_paciente")
        params["id_paciente"] = id_paciente

    if busqueda:
        conditions.append(
            "(UPPER(p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')) LIKE UPPER(:busqueda) "
            "OR UPPER(p.FOLIO) LIKE UPPER(:busqueda) "
            "OR UPPER(c.NOTAS) LIKE UPPER(:busqueda))"
        )
        params["busqueda"] = f"%{busqueda}%"

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = CITA_BASE_QUERY + where_clause + " ORDER BY c.FECHA_HORA DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        citas = rows_to_dicts(cursor)
        citas = [_enrich_cita(conn, c) for c in citas]

    return citas


@router.get("/{id_cita}")
def obtener_cita(id_cita: int, current_user: dict = Depends(get_current_user)):
    """Obtener una cita por su ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            CITA_BASE_QUERY + " WHERE c.ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        cita = row_to_dict(cursor)
        if cita is None:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        cita = _enrich_cita(conn, cita)
    return cita


@router.post("/", status_code=201)
def crear_cita(data: CitaCreate, current_user: dict = Depends(get_current_user)):
    """Crear nueva cita con sus servicios."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Insert CITA and get generated ID
        out_id = cursor.var(int)
        cursor.execute(
            """
            INSERT INTO CITA (ID_PACIENTE, ID_USUARIO_REGISTRO, FECHA_HORA, ESTATUS, NOTAS)
            VALUES (:id_paciente, :id_usuario_registro,
                    TO_TIMESTAMP(:fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS'),
                    :estatus, :notas)
            RETURNING ID_CITA INTO :out_id
            """,
            {
                "id_paciente": data.id_paciente,
                "id_usuario_registro": data.id_usuario_registro or current_user.get("id_usuario"),
                "fecha_hora": data.fecha_hora,
                "estatus": data.estatus,
                "notas": data.notas,
                "out_id": out_id,
            },
        )
        id_cita = out_id.getvalue()[0]

        # Insert DETALLE_CITA_SERVICIO rows
        if data.servicios:
            for s in data.servicios:
                cursor.execute(
                    """
                    INSERT INTO DETALLE_CITA_SERVICIO
                        (ID_CITA, ID_SERVICIO, CANTIDAD, MONTO_PAGADO, CANCELADO)
                    VALUES (:id_cita, :id_servicio, :cantidad, :monto_pagado, 'N')
                    """,
                    {
                        "id_cita": id_cita,
                        "id_servicio": s["id_servicio"],
                        "cantidad": s.get("cantidad", 1),
                        "monto_pagado": s.get("monto_pagado", 0.00),
                    },
                )

        conn.commit()

        # Fetch the created cita to return full response
        cursor.execute(
            CITA_BASE_QUERY + " WHERE c.ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)

    return cita


@router.put("/{id_cita}")
def actualizar_cita(
    id_cita: int,
    data: CitaCreate,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar cita existente (estatus, notas, fecha, servicios)."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify cita exists
        cursor.execute(
            "SELECT ID_CITA FROM CITA WHERE ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Cita no encontrada")

        # Update CITA
        cursor.execute(
            """
            UPDATE CITA
            SET ID_PACIENTE = :id_paciente,
                FECHA_HORA = TO_TIMESTAMP(:fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS'),
                ESTATUS = :estatus,
                NOTAS = :notas
            WHERE ID_CITA = :id_cita
            """,
            {
                "id_paciente": data.id_paciente,
                "fecha_hora": data.fecha_hora,
                "estatus": data.estatus,
                "notas": data.notas,
                "id_cita": id_cita,
            },
        )

        # Replace servicios: cancel old ones, insert new ones
        if data.servicios is not None:
            cursor.execute(
                """
                UPDATE DETALLE_CITA_SERVICIO
                SET CANCELADO = 'S', MOTIVO_CANCELACION = 'Actualización de cita'
                WHERE ID_CITA = :id_cita AND CANCELADO = 'N'
                """,
                {"id_cita": id_cita},
            )
            for s in data.servicios:
                cursor.execute(
                    """
                    INSERT INTO DETALLE_CITA_SERVICIO
                        (ID_CITA, ID_SERVICIO, CANTIDAD, MONTO_PAGADO, CANCELADO)
                    VALUES (:id_cita, :id_servicio, :cantidad, :monto_pagado, 'N')
                    """,
                    {
                        "id_cita": id_cita,
                        "id_servicio": s["id_servicio"],
                        "cantidad": s.get("cantidad", 1),
                        "monto_pagado": s.get("monto_pagado", 0.00),
                    },
                )

        conn.commit()

        # Return updated cita
        cursor.execute(
            CITA_BASE_QUERY + " WHERE c.ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)

    return cita


@router.put("/{id_cita}/cancelar")
def cancelar_cita(id_cita: int, current_user: dict = Depends(get_current_user)):
    """Cancelar una cita (cambiar estatus a CANCELADA)."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT ESTATUS FROM CITA WHERE ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Cita no encontrada")

        cursor.execute(
            "UPDATE CITA SET ESTATUS = 'CANCELADA' WHERE ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        conn.commit()

        # Return updated cita
        cursor.execute(
            CITA_BASE_QUERY + " WHERE c.ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)

    return cita


@router.delete("/{id_cita}")
def eliminar_cita(id_cita: int, current_user: dict = Depends(get_current_user)):
    """Eliminar una cita y sus detalles de servicio."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT ID_CITA FROM CITA WHERE ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Cita no encontrada")

        # Delete detail rows first (FK constraint)
        cursor.execute(
            "DELETE FROM DETALLE_CITA_SERVICIO WHERE ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        cursor.execute(
            "DELETE FROM CITA WHERE ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        conn.commit()

    return {"detail": "Cita eliminada"}
