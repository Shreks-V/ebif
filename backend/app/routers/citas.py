from datetime import datetime, date, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from app.core.security import get_current_user, require_role
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.core.bitacora import log_insert, log_cancelacion
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


def _enrich_cita(conn, cita: dict, svc_map: dict | None = None) -> dict:
    """Add servicios list and serialize datetimes."""
    cita = _serialize_row(cita)
    if svc_map is not None:
        cita["servicios"] = svc_map.get(cita["id_cita"], [])
    else:
        cita["servicios"] = _fetch_servicios(conn, cita["id_cita"])
    return cita


def _batch_fetch_servicios(conn, cita_ids: list[int]) -> dict[int, list[dict]]:
    """Fetch servicios for many citas in one query."""
    if not cita_ids:
        return {}
    cur = conn.cursor()
    result: dict[int, list[dict]] = {cid: [] for cid in cita_ids}
    for i in range(0, len(cita_ids), 900):
        chunk = cita_ids[i : i + 900]
        placeholders = ", ".join(f":c{j}" for j in range(len(chunk)))
        params = {f"c{j}": cid for j, cid in enumerate(chunk)}
        cur.execute(
            f"""
            SELECT d.ID_CITA, d.ID_SERVICIO, s.NOMBRE, d.CANTIDAD, d.MONTO_PAGADO
              FROM DETALLE_CITA_SERVICIO d
              JOIN SERVICIO s ON d.ID_SERVICIO = s.ID_SERVICIO
             WHERE d.CANCELADO = 'N' AND d.ID_CITA IN ({placeholders})
            """,
            params,
        )
        cols = [c[0].lower() for c in cur.description]
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            cid = d.pop("id_cita")
            result[cid].append(d)
    return result


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/stats")
def citas_stats(current_user: dict = Depends(get_current_user)):
    """Obtener conteo de citas por estatus + total de hoy."""
    hoy = date.today()
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

        # Citas programadas de hoy (usa fecha local, no SYSDATE de Oracle/UTC)
        cursor.execute(
            """
            SELECT COUNT(*) AS TOTAL_HOY
            FROM CITA
            WHERE TRUNC(FECHA_HORA) = TO_DATE(:fecha, 'YYYY-MM-DD') AND ESTATUS = 'PROGRAMADA'
            """,
            {"fecha": hoy.isoformat()},
        )
        hoy_row = row_to_dict(cursor)

    stats = {r["estatus"]: r["total"] for r in rows}
    stats["total_hoy"] = int(hoy_row["total_hoy"]) if hoy_row else 0
    stats["total"] = sum(r["total"] for r in rows)

    # RF-D-06: Comparación vs ayer
    with get_db() as conn:
        cursor = conn.cursor()
        ayer = (hoy - timedelta(days=1)).isoformat()
        cursor.execute(
            """SELECT COUNT(*) AS TOTAL_AYER
               FROM CITA
               WHERE TRUNC(FECHA_HORA) = TO_DATE(:fecha, 'YYYY-MM-DD') AND ESTATUS = 'PROGRAMADA'""",
            {"fecha": ayer},
        )
        ayer_row = row_to_dict(cursor)
        stats["total_ayer"] = int(ayer_row["total_ayer"]) if ayer_row else 0

    return stats


@router.get("/hoy")
def citas_hoy(current_user: dict = Depends(get_current_user)):
    """Obtener las citas de hoy (hora local del servidor Python, no UTC de Oracle)."""
    hoy = date.today()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            CITA_BASE_QUERY
            + " WHERE TRUNC(c.FECHA_HORA) = TO_DATE(:fecha, 'YYYY-MM-DD') ORDER BY c.FECHA_HORA",
            {"fecha": hoy.isoformat()},
        )
        citas = rows_to_dicts(cursor)
        svc_map = _batch_fetch_servicios(conn, [c["id_cita"] for c in citas])
        citas = [_enrich_cita(conn, c, svc_map=svc_map) for c in citas]

    programadas = sum(1 for c in citas if c["estatus"] == "PROGRAMADA")
    completadas = sum(1 for c in citas if c["estatus"] == "COMPLETADA")
    canceladas = sum(1 for c in citas if c["estatus"] == "CANCELADA")
    return {
        "fecha": hoy.isoformat(),
        "total": len(citas),
        "programadas": programadas,
        "completadas": completadas,
        "canceladas": canceladas,
        "citas": citas,
    }


@router.get("")
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
        svc_map = _batch_fetch_servicios(conn, [c["id_cita"] for c in citas])
        citas = [_enrich_cita(conn, c, svc_map=svc_map) for c in citas]

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


@router.post("", status_code=201)
def crear_cita(data: CitaCreate, current_user: dict = Depends(require_role("ADMINISTRADOR", "RECEPCIONISTA"))):
    """Crear nueva cita con sus servicios."""
    with get_db() as conn:
        cursor = conn.cursor()

        # RF-SO-06: Validar membresía activa del beneficiario
        cursor.execute(
            "SELECT MEMBRESIA_ESTATUS, ACTIVO FROM PACIENTE WHERE ID_PACIENTE = :id_paciente",
            {"id_paciente": data.id_paciente},
        )
        paciente_row = cursor.fetchone()
        if paciente_row is None:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        membresia_estatus = (paciente_row[0] or "").strip()
        activo = (paciente_row[1] or "").strip()
        if activo != "S":
            raise HTTPException(status_code=400, detail="El paciente no se encuentra activo en el sistema")
        if membresia_estatus != "ACTIVO":
            raise HTTPException(status_code=400, detail="El paciente no tiene membresía activa. Actualice su estatus antes de agendar una cita")

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

        # Bitácora
        id_usuario = data.id_usuario_registro or current_user.get("id_usuario", 1)
        log_insert(conn, "CITA", id_cita, id_usuario, f"Cita creada para paciente {data.id_paciente}")

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
    current_user: dict = Depends(require_role("ADMINISTRADOR", "RECEPCIONISTA")),
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


@router.put("/{id_cita}/completar")
def completar_cita(id_cita: int, current_user: dict = Depends(require_role("ADMINISTRADOR", "RECEPCIONISTA"))):
    """Marcar una cita como COMPLETADA."""
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
            "UPDATE CITA SET ESTATUS = 'COMPLETADA' WHERE ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        conn.commit()

        cursor.execute(
            CITA_BASE_QUERY + " WHERE c.ID_CITA = :id_cita",
            {"id_cita": id_cita},
        )
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)

    return cita


@router.put("/{id_cita}/cancelar")
def cancelar_cita(id_cita: int, current_user: dict = Depends(require_role("ADMINISTRADOR", "RECEPCIONISTA"))):
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

        log_cancelacion(conn, "CITA", id_cita, current_user.get("id_usuario", 1), "Cita cancelada")

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
def eliminar_cita(id_cita: int, current_user: dict = Depends(require_role("ADMINISTRADOR"))):
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
