from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from datetime import date, datetime, timedelta
from app.core.security import get_current_user, require_role
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.core.bitacora import log_insert, log_cancelacion
from app.schemas.schemas import VentaCreate, VentaResponse

router = APIRouter()


# ──────────────────────────── HELPERS ────────────────────────────


def _serialize(row: dict) -> dict:
    """Convert datetime values to ISO strings for JSON serialisation."""
    out = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _fetch_metodos_pago(conn, id_venta: int) -> list[dict]:
    """Return the payment-method breakdown for a single venta."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT vmp.ID_METODO_PAGO  AS id_metodo_pago,
               mp.NOMBRE           AS nombre,
               vmp.MONTO           AS monto
          FROM VENTA_METODO_PAGO vmp
          JOIN METODO_PAGO mp ON mp.ID_METODO_PAGO = vmp.ID_METODO_PAGO
         WHERE vmp.ID_VENTA = :id_venta
        """,
        {"id_venta": id_venta},
    )
    return rows_to_dicts(cur)


def _enrich_venta(conn, venta: dict, mp_map: dict | None = None) -> dict:
    """Add metodos_pago list and serialise dates."""
    venta = _serialize(venta)
    if mp_map is not None:
        venta["metodos_pago"] = mp_map.get(venta["id_venta"], [])
    else:
        venta["metodos_pago"] = _fetch_metodos_pago(conn, venta["id_venta"])
    return venta


def _batch_fetch_metodos_pago(conn, venta_ids: list[int]) -> dict[int, list[dict]]:
    """Fetch payment methods for many ventas in one query."""
    if not venta_ids:
        return {}
    cur = conn.cursor()
    result: dict[int, list[dict]] = {vid: [] for vid in venta_ids}
    for i in range(0, len(venta_ids), 900):
        chunk = venta_ids[i : i + 900]
        placeholders = ", ".join(f":v{j}" for j in range(len(chunk)))
        params = {f"v{j}": vid for j, vid in enumerate(chunk)}
        cur.execute(
            f"""
            SELECT vmp.ID_VENTA,
                   vmp.ID_METODO_PAGO  AS id_metodo_pago,
                   mp.NOMBRE           AS nombre,
                   vmp.MONTO           AS monto
              FROM VENTA_METODO_PAGO vmp
              JOIN METODO_PAGO mp ON mp.ID_METODO_PAGO = vmp.ID_METODO_PAGO
             WHERE vmp.ID_VENTA IN ({placeholders})
            """,
            params,
        )
        cols = [c[0].lower() for c in cur.description]
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            vid = d.pop("id_venta")
            result[vid].append(d)
    return result


def _generate_folio(conn) -> str:
    """Generate the next folio in the format VTA-YYYY-XXX."""
    year = date.today().year
    cur = conn.cursor()
    cur.execute(
        """
        SELECT COUNT(*) AS cnt
          FROM VENTA
         WHERE FOLIO_VENTA LIKE :prefix
        """,
        {"prefix": f"VTA-{year}-%"},
    )
    row = row_to_dict(cur)
    seq = (row["cnt"] if row else 0) + 1
    return f"VTA-{year}-{seq:03d}"


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/stats")
def stats_ventas(current_user: dict = Depends(get_current_user)):
    """Totales agregados de ventas (no canceladas)."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT NVL(SUM(v.MONTO_TOTAL), 0) AS monto_total_sum,
                   COUNT(*)                     AS count
              FROM VENTA v
             WHERE v.CANCELADA = 'N'
            """
        )
        totals = row_to_dict(cur)

        # Cobros de hoy (fecha local Python, no SYSDATE Oracle/UTC)
        from datetime import date as date_type
        hoy_str = date_type.today().isoformat()
        cur.execute(
            """
            SELECT COUNT(*) AS total_hoy
              FROM VENTA v
             WHERE v.CANCELADA = 'N' AND TRUNC(v.FECHA_VENTA) = TO_DATE(:fecha, 'YYYY-MM-DD')
            """,
            {"fecha": hoy_str},
        )
        hoy = row_to_dict(cur)

        # Cobros pendientes (saldo > 0)
        cur.execute(
            """
            SELECT COUNT(*) AS pendientes
              FROM VENTA v
             WHERE v.CANCELADA = 'N' AND v.SALDO_PENDIENTE > 0
            """
        )
        pend = row_to_dict(cur)

        cur.execute(
            """
            SELECT NVL(SUM(CASE WHEN UPPER(mp.NOMBRE) = 'EFECTIVO'       THEN vmp.MONTO ELSE 0 END), 0) AS monto_efectivo,
                   NVL(SUM(CASE WHEN UPPER(mp.NOMBRE) = 'TARJETA'        THEN vmp.MONTO ELSE 0 END), 0) AS monto_tarjeta,
                   NVL(SUM(CASE WHEN UPPER(mp.NOMBRE) = 'TRANSFERENCIA'  THEN vmp.MONTO ELSE 0 END), 0) AS monto_transferencia
              FROM VENTA_METODO_PAGO vmp
              JOIN METODO_PAGO mp ON mp.ID_METODO_PAGO = vmp.ID_METODO_PAGO
              JOIN VENTA v         ON v.ID_VENTA       = vmp.ID_VENTA
             WHERE v.CANCELADA = 'N'
            """
        )
        by_method = row_to_dict(cur)

        # RF-D-06: Cobros de ayer para comparación
        ayer_str = (date.today() - timedelta(days=1)).isoformat()
        cur.execute(
            """
            SELECT COUNT(*) AS total_ayer
              FROM VENTA v
             WHERE v.CANCELADA = 'N' AND TRUNC(v.FECHA_VENTA) = TO_DATE(:fecha, 'YYYY-MM-DD')
            """,
            {"fecha": ayer_str},
        )
        ayer = row_to_dict(cur)

    return {
        "monto_total_sum": float(totals["monto_total_sum"]),
        "monto_efectivo": float(by_method["monto_efectivo"]),
        "monto_tarjeta": float(by_method["monto_tarjeta"]),
        "monto_transferencia": float(by_method["monto_transferencia"]),
        "count": int(totals["count"]),
        "total_hoy": int(hoy["total_hoy"]),
        "total_ayer": int(ayer["total_ayer"]) if ayer else 0,
        "pendientes": int(pend["pendientes"]),
    }


@router.get("/metodos-pago")
def listar_metodos_pago(current_user: dict = Depends(get_current_user)):
    """Listar metodos de pago activos."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT ID_METODO_PAGO AS id_metodo_pago,
                   NOMBRE         AS nombre,
                   DESCRIPCION    AS descripcion,
                   ACTIVO         AS activo
              FROM METODO_PAGO
             WHERE ACTIVO = 'S'
             ORDER BY ID_METODO_PAGO
            """
        )
        return rows_to_dicts(cur)


@router.get("")
def listar_ventas(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    id_paciente: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar ventas con filtros opcionales."""
    with get_db() as conn:
        sql = """
            SELECT v.ID_VENTA,
                   v.FOLIO_VENTA,
                   v.ID_PACIENTE,
                   v.ID_USUARIO_REGISTRO,
                   v.FECHA_VENTA,
                   v.MONTO_TOTAL,
                   v.MONTO_PAGADO,
                   v.SALDO_PENDIENTE,
                   v.EXENTO_PAGO,
                   v.CANCELADA,
                   v.MOTIVO_CANCELACION,
                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')
                       AS NOMBRE_PACIENTE,
                   p.FOLIO AS FOLIO_PACIENTE
              FROM VENTA v
              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE
             WHERE 1 = 1
        """
        params: dict = {}

        if fecha_inicio:
            sql += " AND v.FECHA_VENTA >= TO_TIMESTAMP(:fecha_inicio, 'YYYY-MM-DD')"
            params["fecha_inicio"] = fecha_inicio

        if fecha_fin:
            sql += " AND v.FECHA_VENTA < TO_TIMESTAMP(:fecha_fin, 'YYYY-MM-DD') + 1"
            params["fecha_fin"] = fecha_fin

        if id_paciente is not None:
            sql += " AND v.ID_PACIENTE = :id_paciente"
            params["id_paciente"] = id_paciente

        if search:
            sql += (
                " AND (UPPER(v.FOLIO_VENTA) LIKE UPPER(:search)"
                " OR UPPER(p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')) LIKE UPPER(:search))"
            )
            params["search"] = f"%{search}%"

        sql += " ORDER BY v.FECHA_VENTA DESC"

        cur = conn.cursor()
        cur.execute(sql, params)
        ventas = rows_to_dicts(cur)

        # Batch fetch metodos_pago to avoid N+1 queries
        venta_ids = [v["id_venta"] for v in ventas]
        mp_map = _batch_fetch_metodos_pago(conn, venta_ids)

        results = [_enrich_venta(conn, v, mp_map=mp_map) for v in ventas]
    return results


@router.post("", status_code=201)
def crear_venta(
    data: VentaCreate, current_user: dict = Depends(require_role("ADMINISTRADOR", "RECEPCIONISTA"))
):
    """Crear nueva venta."""
    with get_db() as conn:
        folio = _generate_folio(conn)
        id_usuario = current_user.get("id_usuario", 1)

        cur = conn.cursor()
        id_venta_var = cur.var(int)

        cur.execute(
            """
            INSERT INTO VENTA (
                ID_PACIENTE, ID_USUARIO_REGISTRO, FOLIO_VENTA,
                FECHA_VENTA, MONTO_TOTAL, MONTO_PAGADO,
                SALDO_PENDIENTE, EXENTO_PAGO, CANCELADA
            ) VALUES (
                :id_paciente, :id_usuario, :folio,
                SYSTIMESTAMP, :monto_total, :monto_pagado,
                :saldo_pendiente, :exento_pago, 'N'
            ) RETURNING ID_VENTA INTO :id_venta
            """,
            {
                "id_paciente": data.id_paciente,
                "id_usuario": id_usuario,
                "folio": folio,
                "monto_total": data.monto_total,
                "monto_pagado": data.monto_pagado,
                "saldo_pendiente": data.saldo_pendiente,
                "exento_pago": data.exento_pago,
                "id_venta": id_venta_var,
            },
        )
        new_id = id_venta_var.getvalue()[0]

        if data.metodos_pago:
            for mp in data.metodos_pago:
                cur.execute(
                    """
                    INSERT INTO VENTA_METODO_PAGO (
                        ID_VENTA, ID_METODO_PAGO, MONTO, FECHA_REGISTRO
                    ) VALUES (
                        :id_venta, :id_metodo_pago, :monto, SYSTIMESTAMP
                    )
                    """,
                    {
                        "id_venta": new_id,
                        "id_metodo_pago": mp["id_metodo_pago"],
                        "monto": mp["monto"],
                    },
                )

        # Bitácora
        log_insert(conn, "VENTA", new_id, id_usuario, f"Venta {folio} creada para paciente {data.id_paciente}")

        conn.commit()

        # Return the created venta
        cur.execute(
            """
            SELECT v.ID_VENTA,
                   v.FOLIO_VENTA,
                   v.ID_PACIENTE,
                   v.ID_USUARIO_REGISTRO,
                   v.FECHA_VENTA,
                   v.MONTO_TOTAL,
                   v.MONTO_PAGADO,
                   v.SALDO_PENDIENTE,
                   v.EXENTO_PAGO,
                   v.CANCELADA,
                   v.MOTIVO_CANCELACION,
                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')
                       AS NOMBRE_PACIENTE,
                   p.FOLIO AS FOLIO_PACIENTE
              FROM VENTA v
              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE
             WHERE v.ID_VENTA = :id_venta
            """,
            {"id_venta": new_id},
        )
        venta = row_to_dict(cur)
        if venta is None:
            raise HTTPException(status_code=500, detail="Error al recuperar la venta creada")

        return _enrich_venta(conn, venta)


@router.get("/{id_venta}")
def obtener_venta(
    id_venta: int, current_user: dict = Depends(get_current_user)
):
    """Obtener detalle de una venta."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT v.ID_VENTA,
                   v.FOLIO_VENTA,
                   v.ID_PACIENTE,
                   v.ID_USUARIO_REGISTRO,
                   v.FECHA_VENTA,
                   v.MONTO_TOTAL,
                   v.MONTO_PAGADO,
                   v.SALDO_PENDIENTE,
                   v.EXENTO_PAGO,
                   v.CANCELADA,
                   v.MOTIVO_CANCELACION,
                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')
                       AS NOMBRE_PACIENTE,
                   p.FOLIO AS FOLIO_PACIENTE
              FROM VENTA v
              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE
             WHERE v.ID_VENTA = :id_venta
            """,
            {"id_venta": id_venta},
        )
        venta = row_to_dict(cur)

        if venta is None:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        return _enrich_venta(conn, venta)


@router.put("/{id_venta}/cancelar")
def cancelar_venta(
    id_venta: int,
    motivo: Optional[str] = Query(None),
    current_user: dict = Depends(require_role("ADMINISTRADOR", "RECEPCIONISTA")),
):
    """Cancelar una venta."""
    with get_db() as conn:
        cur = conn.cursor()

        # Check existence and current status
        cur.execute(
            "SELECT CANCELADA FROM VENTA WHERE ID_VENTA = :id_venta",
            {"id_venta": id_venta},
        )
        row = row_to_dict(cur)
        if row is None:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        if row["cancelada"] == "S":
            raise HTTPException(status_code=400, detail="La venta ya esta cancelada")

        motivo_final = motivo or "Sin motivo especificado"
        cur.execute(
            """
            UPDATE VENTA
               SET CANCELADA = 'S',
                   MOTIVO_CANCELACION = :motivo
             WHERE ID_VENTA = :id_venta
            """,
            {"motivo": motivo_final, "id_venta": id_venta},
        )

        log_cancelacion(conn, "VENTA", id_venta, current_user.get("id_usuario", 1), motivo_final)

        conn.commit()

        # Return updated venta
        cur.execute(
            """
            SELECT v.ID_VENTA,
                   v.FOLIO_VENTA,
                   v.ID_PACIENTE,
                   v.ID_USUARIO_REGISTRO,
                   v.FECHA_VENTA,
                   v.MONTO_TOTAL,
                   v.MONTO_PAGADO,
                   v.SALDO_PENDIENTE,
                   v.EXENTO_PAGO,
                   v.CANCELADA,
                   v.MOTIVO_CANCELACION,
                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')
                       AS NOMBRE_PACIENTE,
                   p.FOLIO AS FOLIO_PACIENTE
              FROM VENTA v
              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE
             WHERE v.ID_VENTA = :id_venta
            """,
            {"id_venta": id_venta},
        )
        venta = row_to_dict(cur)
        return _enrich_venta(conn, venta)
