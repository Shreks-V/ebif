from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from datetime import date, datetime
from app.core.security import get_current_user, require_role
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.core.bitacora import log_insert, log_delete, log_cancelacion
from app.schemas.schemas import (
    ProductoCreate,
    ProductoResponse,
    ServicioCreate,
    ServicioResponse,
    ComodatoCreate,
    ComodatoResponse,
    ExistenciaProducto,
    MovimientoInventario,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════


def _serialize(row: dict) -> dict:
    """Strip CHAR padding and convert dates to ISO strings."""
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, str):
            result[key] = value.strip()
        else:
            result[key] = value
    return result


_PRODUCTOS_BASE_SQL = """
    SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE, p.DESCRIPCION,
           p.TIPO_PRODUCTO, p.ACTIVO, p.ID_USUARIO_REGISTRO, p.FECHA_REGISTRO,
           p.PRECIO_CUOTA_A, p.PRECIO_CUOTA_B,
           m.PRESENTACION, m.DOSIS, m.REQUIERE_CADUCIDAD,
           e.NUMERO_SERIE, e2.MARCA, e2.MODELO, e2.ESTATUS_EQUIPO, e2.OBSERVACIONES,
           ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO, ex.UNIDAD_MEDIDA
    FROM PRODUCTO p
    LEFT JOIN MEDICAMENTO m       ON m.ID_PRODUCTO  = p.ID_PRODUCTO
    LEFT JOIN EQUIPO_MEDICO e2    ON e2.ID_PRODUCTO = p.ID_PRODUCTO
    LEFT JOIN EXISTENCIA_PRODUCTO ex ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'
"""

# NOTE: The alias 'e' was reserved for EQUIPO_MEDICO in the original mock
# which exposed NUMERO_SERIE at equipo level.  The DB schema puts NUMERO_SERIE
# inside EQUIPO_MEDICO, so we just read it from e2.

# Fix: remove the dangling LEFT JOIN alias 'e' – NUMERO_SERIE lives in EQUIPO_MEDICO.
_PRODUCTOS_BASE_SQL = """
    SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE, p.DESCRIPCION,
           p.TIPO_PRODUCTO, p.ACTIVO, p.ID_USUARIO_REGISTRO, p.FECHA_REGISTRO,
           p.PRECIO_CUOTA_A, p.PRECIO_CUOTA_B,
           m.PRESENTACION, m.DOSIS, m.REQUIERE_CADUCIDAD,
           eq.NUMERO_SERIE, eq.MARCA, eq.MODELO, eq.ESTATUS_EQUIPO, eq.OBSERVACIONES,
           ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO, ex.UNIDAD_MEDIDA, ex.FECHA_CADUCIDAD
    FROM PRODUCTO p
    LEFT JOIN MEDICAMENTO m        ON m.ID_PRODUCTO  = p.ID_PRODUCTO
    LEFT JOIN EQUIPO_MEDICO eq     ON eq.ID_PRODUCTO = p.ID_PRODUCTO
    LEFT JOIN EXISTENCIA_PRODUCTO ex ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'
"""


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS - PRODUCTOS
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/productos", response_model=List[ProductoResponse])
def listar_productos(
    tipo_producto: Optional[str] = Query(None, description="MEDICAMENTO o EQUIPO"),
    busqueda: Optional[str] = Query(None),
    activo: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar productos del almacen con filtros opcionales."""
    sql = _PRODUCTOS_BASE_SQL + " WHERE 1=1"
    params: dict = {}

    if tipo_producto:
        sql += " AND p.TIPO_PRODUCTO = :tipo_producto"
        params["tipo_producto"] = tipo_producto

    if activo:
        sql += " AND p.ACTIVO = :activo"
        params["activo"] = activo

    if busqueda:
        sql += (
            " AND (LOWER(p.NOMBRE) LIKE :busqueda"
            " OR LOWER(p.DESCRIPCION) LIKE :busqueda"
            " OR LOWER(p.CLAVE_INTERNA) LIKE :busqueda)"
        )
        params["busqueda"] = f"%{busqueda.lower()}%"

    sql += " ORDER BY p.ID_PRODUCTO"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)

    return [_serialize(r) for r in rows]


@router.get("/productos/{id_producto}", response_model=ProductoResponse)
def obtener_producto(
    id_producto: int,
    current_user: dict = Depends(get_current_user),
):
    """Obtener un producto por ID."""
    sql = _PRODUCTOS_BASE_SQL + " WHERE p.ID_PRODUCTO = :id_producto"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {"id_producto": id_producto})
        row = row_to_dict(cursor)

    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return _serialize(row)


@router.post("/productos", status_code=201, response_model=ProductoResponse)
def crear_producto(
    data: ProductoCreate,
    current_user: dict = Depends(require_role("ADMINISTRADOR", "ENCARGADO_ALMACEN")),
):
    """Crear un nuevo producto con su subtipo y existencia."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get("id_usuario", 1)

        # Generate CLAVE_INTERNA  (MED-XXX or EQP-XXX)
        if data.tipo_producto == "MEDICAMENTO":
            prefix = "MED"
        else:
            prefix = "EQP"

        cursor.execute(
            "SELECT COUNT(*) FROM PRODUCTO WHERE TIPO_PRODUCTO = :tipo",
            {"tipo": data.tipo_producto},
        )
        count = cursor.fetchone()[0]
        clave_interna = f"{prefix}-{count + 1:03d}"

        # Insert PRODUCTO
        id_var = cursor.var(int)
        cursor.execute(
            """INSERT INTO PRODUCTO
               (CLAVE_INTERNA, NOMBRE, DESCRIPCION, TIPO_PRODUCTO, ACTIVO,
                ID_USUARIO_REGISTRO, FECHA_REGISTRO, PRECIO_CUOTA_A, PRECIO_CUOTA_B)
               VALUES (:clave, :nombre, :descripcion, :tipo, :activo,
                       :id_usuario, SYSDATE, :precio_a, :precio_b)
               RETURNING ID_PRODUCTO INTO :id_out""",
            {
                "clave": clave_interna,
                "nombre": data.nombre,
                "descripcion": data.descripcion,
                "tipo": data.tipo_producto,
                "activo": data.activo,
                "id_usuario": id_usuario,
                "precio_a": data.precio_cuota_a,
                "precio_b": data.precio_cuota_b,
                "id_out": id_var,
            },
        )
        id_producto = id_var.getvalue()[0]

        # Insert subtype row
        if data.tipo_producto == "MEDICAMENTO":
            cursor.execute(
                """INSERT INTO MEDICAMENTO
                   (ID_PRODUCTO, PRESENTACION, DOSIS, REQUIERE_CADUCIDAD)
                   VALUES (:id, :presentacion, :dosis, :requiere)""",
                {
                    "id": id_producto,
                    "presentacion": data.presentacion,
                    "dosis": data.dosis,
                    "requiere": data.requiere_caducidad or "N",
                },
            )
        else:
            cursor.execute(
                """INSERT INTO EQUIPO_MEDICO
                   (ID_PRODUCTO, NUMERO_SERIE, MARCA, MODELO,
                    ESTATUS_EQUIPO, OBSERVACIONES)
                   VALUES (:id, :serie, :marca, :modelo, :estatus, :obs)""",
                {
                    "id": id_producto,
                    "serie": data.numero_serie,
                    "marca": data.marca,
                    "modelo": data.modelo,
                    "estatus": data.estatus_equipo or "DISPONIBLE",
                    "obs": data.observaciones,
                },
            )

        # Insert EXISTENCIA_PRODUCTO
        cursor.execute(
            """INSERT INTO EXISTENCIA_PRODUCTO
               (ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO, UNIDAD_MEDIDA, ACTIVO, FECHA_CADUCIDAD)
               VALUES (:id, :cant, :nmin, :unidad, 'S',
                       CASE WHEN :fecha_cad IS NOT NULL THEN TO_DATE(:fecha_cad2, 'YYYY-MM-DD') ELSE NULL END)""",
            {
                "id": id_producto,
                "cant": data.cantidad_disponible,
                "nmin": data.nivel_minimo,
                "unidad": data.unidad_medida,
                "fecha_cad": data.fecha_caducidad,
                "fecha_cad2": data.fecha_caducidad,
            },
        )

        log_insert(conn, "PRODUCTO", id_producto, id_usuario, f"Producto {clave_interna} creado")
        conn.commit()

    # Return the freshly-created product
    return obtener_producto.__wrapped__(id_producto, current_user) if hasattr(obtener_producto, "__wrapped__") else _fetch_producto(id_producto)


def _fetch_producto(id_producto: int) -> dict:
    """Fetch a single product (internal helper, no auth)."""
    sql = _PRODUCTOS_BASE_SQL + " WHERE p.ID_PRODUCTO = :id_producto"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {"id_producto": id_producto})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return _serialize(row)


@router.put("/productos/{id_producto}", response_model=ProductoResponse)
def actualizar_producto(
    id_producto: int,
    data: ProductoCreate,
    current_user: dict = Depends(require_role("ADMINISTRADOR", "ENCARGADO_ALMACEN")),
):
    """Actualizar un producto existente."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Verify product exists
        cursor.execute(
            "SELECT ID_PRODUCTO, TIPO_PRODUCTO FROM PRODUCTO WHERE ID_PRODUCTO = :id",
            {"id": id_producto},
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        # Update PRODUCTO
        cursor.execute(
            """UPDATE PRODUCTO SET
                NOMBRE = :nombre, DESCRIPCION = :descripcion,
                TIPO_PRODUCTO = :tipo, ACTIVO = :activo,
                PRECIO_CUOTA_A = :precio_a, PRECIO_CUOTA_B = :precio_b
               WHERE ID_PRODUCTO = :id""",
            {
                "nombre": data.nombre,
                "descripcion": data.descripcion,
                "tipo": data.tipo_producto,
                "activo": data.activo,
                "precio_a": data.precio_cuota_a,
                "precio_b": data.precio_cuota_b,
                "id": id_producto,
            },
        )

        # Update subtype
        if data.tipo_producto == "MEDICAMENTO":
            cursor.execute(
                """MERGE INTO MEDICAMENTO m
                   USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src
                   ON (m.ID_PRODUCTO = src.ID_PRODUCTO)
                   WHEN MATCHED THEN UPDATE SET
                       PRESENTACION = :presentacion, DOSIS = :dosis,
                       REQUIERE_CADUCIDAD = :requiere
                   WHEN NOT MATCHED THEN INSERT
                       (ID_PRODUCTO, PRESENTACION, DOSIS, REQUIERE_CADUCIDAD)
                       VALUES (:id, :presentacion, :dosis, :requiere)""",
                {
                    "id": id_producto,
                    "presentacion": data.presentacion,
                    "dosis": data.dosis,
                    "requiere": data.requiere_caducidad or "N",
                },
            )
        else:
            cursor.execute(
                """MERGE INTO EQUIPO_MEDICO eq
                   USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src
                   ON (eq.ID_PRODUCTO = src.ID_PRODUCTO)
                   WHEN MATCHED THEN UPDATE SET
                       NUMERO_SERIE = :serie, MARCA = :marca, MODELO = :modelo,
                       ESTATUS_EQUIPO = :estatus, OBSERVACIONES = :obs
                   WHEN NOT MATCHED THEN INSERT
                       (ID_PRODUCTO, NUMERO_SERIE, MARCA, MODELO, ESTATUS_EQUIPO, OBSERVACIONES)
                       VALUES (:id, :serie, :marca, :modelo, :estatus, :obs)""",
                {
                    "id": id_producto,
                    "serie": data.numero_serie,
                    "marca": data.marca,
                    "modelo": data.modelo,
                    "estatus": data.estatus_equipo or "DISPONIBLE",
                    "obs": data.observaciones,
                },
            )

        # Update EXISTENCIA_PRODUCTO
        cursor.execute(
            """MERGE INTO EXISTENCIA_PRODUCTO ex
               USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src
               ON (ex.ID_PRODUCTO = src.ID_PRODUCTO AND ex.ACTIVO = 'S')
               WHEN MATCHED THEN UPDATE SET
                   CANTIDAD_DISPONIBLE = :cant, NIVEL_MINIMO = :nmin,
                   UNIDAD_MEDIDA = :unidad,
                   FECHA_CADUCIDAD = CASE WHEN :fecha_cad IS NOT NULL THEN TO_DATE(:fecha_cad2, 'YYYY-MM-DD') ELSE NULL END
               WHEN NOT MATCHED THEN INSERT
                   (ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO, UNIDAD_MEDIDA, ACTIVO, FECHA_CADUCIDAD)
                   VALUES (:id, :cant, :nmin, :unidad, 'S',
                           CASE WHEN :fecha_cad3 IS NOT NULL THEN TO_DATE(:fecha_cad4, 'YYYY-MM-DD') ELSE NULL END)""",
            {
                "id": id_producto,
                "cant": data.cantidad_disponible,
                "nmin": data.nivel_minimo,
                "unidad": data.unidad_medida,
                "fecha_cad": data.fecha_caducidad,
                "fecha_cad2": data.fecha_caducidad,
                "fecha_cad3": data.fecha_caducidad,
                "fecha_cad4": data.fecha_caducidad,
            },
        )

        conn.commit()

    return _fetch_producto(id_producto)


@router.delete("/productos/{id_producto}")
def desactivar_producto(
    id_producto: int,
    current_user: dict = Depends(require_role("ADMINISTRADOR")),
):
    """Desactivar un producto (soft delete)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE PRODUCTO SET ACTIVO = 'N' WHERE ID_PRODUCTO = :id",
            {"id": id_producto},
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        conn.commit()
    return {"message": "Producto desactivado correctamente"}


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS - SERVICIOS
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/servicios", response_model=List[ServicioResponse])
def listar_servicios(
    busqueda: Optional[str] = Query(None),
    activo: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar servicios con filtros opcionales."""
    sql = """
        SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,
               ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,
               PRECIO_CUOTA_A, PRECIO_CUOTA_B
        FROM SERVICIO WHERE 1=1
    """
    params: dict = {}

    if activo:
        sql += " AND ACTIVO = :activo"
        params["activo"] = activo

    if busqueda:
        sql += (
            " AND (LOWER(NOMBRE) LIKE :busqueda"
            " OR LOWER(DESCRIPCION) LIKE :busqueda)"
        )
        params["busqueda"] = f"%{busqueda.lower()}%"

    sql += " ORDER BY ID_SERVICIO"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)

    return [_serialize(r) for r in rows]


@router.get("/servicios/{id_servicio}", response_model=ServicioResponse)
def obtener_servicio(
    id_servicio: int,
    current_user: dict = Depends(get_current_user),
):
    """Obtener un servicio por ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,
                      ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,
                      PRECIO_CUOTA_A, PRECIO_CUOTA_B
               FROM SERVICIO WHERE ID_SERVICIO = :id""",
            {"id": id_servicio},
        )
        row = row_to_dict(cursor)

    if not row:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return _serialize(row)


@router.post("/servicios", status_code=201, response_model=ServicioResponse)
def crear_servicio(
    data: ServicioCreate,
    current_user: dict = Depends(require_role("ADMINISTRADOR")),
):
    """Crear un nuevo servicio."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get("id_usuario", 1)
        id_var = cursor.var(int)

        cursor.execute(
            """INSERT INTO SERVICIO
               (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO,
                ID_USUARIO_REGISTRO, FECHA_REGISTRO,
                PRECIO_CUOTA_A, PRECIO_CUOTA_B)
               VALUES (:nombre, :descripcion, :cuota, :activo,
                       :id_usuario, SYSDATE, :precio_a, :precio_b)
               RETURNING ID_SERVICIO INTO :id_out""",
            {
                "nombre": data.nombre,
                "descripcion": data.descripcion,
                "cuota": data.cuota_recuperacion,
                "activo": data.activo,
                "id_usuario": id_usuario,
                "precio_a": data.precio_cuota_a,
                "precio_b": data.precio_cuota_b,
                "id_out": id_var,
            },
        )
        id_servicio = id_var.getvalue()[0]
        conn.commit()

    return _fetch_servicio(id_servicio)


def _fetch_servicio(id_servicio: int) -> dict:
    """Fetch a single service (internal helper)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,
                      ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,
                      PRECIO_CUOTA_A, PRECIO_CUOTA_B
               FROM SERVICIO WHERE ID_SERVICIO = :id""",
            {"id": id_servicio},
        )
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return _serialize(row)


@router.put("/servicios/{id_servicio}", response_model=ServicioResponse)
def actualizar_servicio(
    id_servicio: int,
    data: ServicioCreate,
    current_user: dict = Depends(require_role("ADMINISTRADOR")),
):
    """Actualizar un servicio existente."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE SERVICIO SET
                NOMBRE = :nombre, DESCRIPCION = :descripcion,
                CUOTA_RECUPERACION = :cuota, ACTIVO = :activo,
                PRECIO_CUOTA_A = :precio_a, PRECIO_CUOTA_B = :precio_b
               WHERE ID_SERVICIO = :id""",
            {
                "nombre": data.nombre,
                "descripcion": data.descripcion,
                "cuota": data.cuota_recuperacion,
                "activo": data.activo,
                "precio_a": data.precio_cuota_a,
                "precio_b": data.precio_cuota_b,
                "id": id_servicio,
            },
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        conn.commit()

    return _fetch_servicio(id_servicio)


@router.delete("/servicios/{id_servicio}")
def desactivar_servicio(
    id_servicio: int,
    current_user: dict = Depends(require_role("ADMINISTRADOR")),
):
    """Desactivar un servicio (soft delete)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE SERVICIO SET ACTIVO = 'N' WHERE ID_SERVICIO = :id",
            {"id": id_servicio},
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        conn.commit()
    return {"message": "Servicio desactivado correctamente"}


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS - COMODATOS
# ══════════════════════════════════════════════════════════════════════════════

_COMODATOS_BASE_SQL = """
    SELECT c.ID_COMODATO, c.FOLIO_COMODATO, c.ID_EQUIPO, c.ID_PACIENTE,
           c.ID_USUARIO_REGISTRO, c.FECHA_PRESTAMO, c.FECHA_DEVOLUCION,
           c.ESTATUS, c.MONTO_TOTAL, c.MONTO_PAGADO, c.SALDO_PENDIENTE,
           c.EXENTO_PAGO, c.NOTAS,
           pa.NOMBRE || ' ' || pa.APELLIDO_PATERNO || ' ' || NVL(pa.APELLIDO_MATERNO, '') AS NOMBRE_PACIENTE,
           pa.FOLIO AS FOLIO_PACIENTE,
           pr.NOMBRE AS NOMBRE_EQUIPO
    FROM COMODATO c
    LEFT JOIN PACIENTE pa ON pa.ID_PACIENTE = c.ID_PACIENTE
    LEFT JOIN PRODUCTO pr ON pr.ID_PRODUCTO = c.ID_EQUIPO
"""


@router.get("/comodatos", response_model=List[ComodatoResponse])
def listar_comodatos(
    estatus: Optional[str] = Query(None, description="PRESTADO, DEVUELTO, CANCELADO"),
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar comodatos con filtros opcionales."""
    sql = _COMODATOS_BASE_SQL + " WHERE 1=1"
    params: dict = {}

    if estatus:
        sql += " AND c.ESTATUS = :estatus"
        params["estatus"] = estatus

    if busqueda:
        sql += (
            " AND (LOWER(pa.NOMBRE || ' ' || pa.APELLIDO_PATERNO) LIKE :busqueda"
            " OR LOWER(pr.NOMBRE) LIKE :busqueda"
            " OR LOWER(pa.FOLIO) LIKE :busqueda"
            " OR LOWER(c.FOLIO_COMODATO) LIKE :busqueda)"
        )
        params["busqueda"] = f"%{busqueda.lower()}%"

    sql += " ORDER BY c.ID_COMODATO DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)

    return [_serialize(r) for r in rows]


@router.get("/comodatos/{id_comodato}", response_model=ComodatoResponse)
def obtener_comodato(
    id_comodato: int,
    current_user: dict = Depends(get_current_user),
):
    """Obtener un comodato por ID."""
    sql = _COMODATOS_BASE_SQL + " WHERE c.ID_COMODATO = :id"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {"id": id_comodato})
        row = row_to_dict(cursor)

    if not row:
        raise HTTPException(status_code=404, detail="Comodato no encontrado")
    return _serialize(row)


@router.post("/comodatos", status_code=201, response_model=ComodatoResponse)
def crear_comodato(
    data: ComodatoCreate,
    current_user: dict = Depends(require_role("ADMINISTRADOR", "ENCARGADO_ALMACEN")),
):
    """Registrar un nuevo comodato con validación de inventario (RF-PS-06)."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get("id_usuario", 1)

        # RF-PS-06: Validar existencia en inventario antes de prestar
        cursor.execute(
            """SELECT ex.CANTIDAD_DISPONIBLE
               FROM EXISTENCIA_PRODUCTO ex
               WHERE ex.ID_PRODUCTO = :id_equipo AND ex.ACTIVO = 'S'""",
            {"id_equipo": data.id_equipo},
        )
        stock_row = cursor.fetchone()
        if stock_row is None:
            raise HTTPException(status_code=400, detail="El equipo no tiene registro de existencia en inventario")
        if stock_row[0] <= 0:
            raise HTTPException(status_code=400, detail="No hay existencia disponible del equipo seleccionado")

        # Generate FOLIO_COMODATO as COM-XXXXXX
        cursor.execute("SELECT NVL(MAX(ID_COMODATO), 0) + 1 FROM COMODATO")
        next_num = cursor.fetchone()[0]
        folio = f"COM-{next_num:06d}"

        id_var = cursor.var(int)
        cursor.execute(
            """INSERT INTO COMODATO
               (FOLIO_COMODATO, ID_EQUIPO, ID_PACIENTE, ID_USUARIO_REGISTRO,
                FECHA_PRESTAMO, FECHA_DEVOLUCION, ESTATUS,
                MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE,
                EXENTO_PAGO, NOTAS)
               VALUES (:folio, :id_equipo, :id_paciente, :id_usuario,
                       TO_DATE(:fecha_prest, 'YYYY-MM-DD'),
                       CASE WHEN :fecha_dev IS NOT NULL
                            THEN TO_DATE(:fecha_dev, 'YYYY-MM-DD')
                            ELSE NULL END,
                       :estatus, :monto_total, :monto_pagado, :saldo,
                       :exento, :notas)
               RETURNING ID_COMODATO INTO :id_out""",
            {
                "folio": folio,
                "id_equipo": data.id_equipo,
                "id_paciente": data.id_paciente,
                "id_usuario": id_usuario,
                "fecha_prest": data.fecha_prestamo,
                "fecha_dev": data.fecha_devolucion,
                "estatus": data.estatus,
                "monto_total": data.monto_total,
                "monto_pagado": data.monto_pagado,
                "saldo": data.saldo_pendiente,
                "exento": data.exento_pago,
                "notas": data.notas,
                "id_out": id_var,
            },
        )
        id_comodato = id_var.getvalue()[0]

        # RF-PS-07: Actualizar stock automáticamente (SALIDA)
        cursor.execute(
            """UPDATE EXISTENCIA_PRODUCTO
               SET CANTIDAD_DISPONIBLE = CANTIDAD_DISPONIBLE - 1
               WHERE ID_PRODUCTO = :id_equipo AND ACTIVO = 'S'""",
            {"id_equipo": data.id_equipo},
        )
        # Registrar movimiento de inventario
        cursor.execute(
            """INSERT INTO MOVIMIENTO_INVENTARIO
               (ID_PRODUCTO, ID_USUARIO_REGISTRO, ID_COMODATO,
                FECHA_MOVIMIENTO, TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES)
               VALUES (:id_prod, :id_usr, :id_com,
                       SYSTIMESTAMP, 'SALIDA', 1, :obs)""",
            {
                "id_prod": data.id_equipo,
                "id_usr": id_usuario,
                "id_com": id_comodato,
                "obs": f"Préstamo comodato {folio}",
            },
        )

        log_insert(conn, "COMODATO", id_comodato, id_usuario, f"Comodato {folio} creado para paciente {data.id_paciente}")
        conn.commit()

    return _fetch_comodato(id_comodato)


def _fetch_comodato(id_comodato: int) -> dict:
    """Fetch a single comodato (internal helper)."""
    sql = _COMODATOS_BASE_SQL + " WHERE c.ID_COMODATO = :id"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {"id": id_comodato})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail="Comodato no encontrado")
    return _serialize(row)


@router.put("/comodatos/{id_comodato}", response_model=ComodatoResponse)
def actualizar_comodato(
    id_comodato: int,
    data: ComodatoCreate,
    current_user: dict = Depends(require_role("ADMINISTRADOR", "ENCARGADO_ALMACEN")),
):
    """Actualizar un comodato existente (RF-PS-07: auto-update stock on return)."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get("id_usuario", 1)

        # Check previous status to detect returns
        cursor.execute(
            "SELECT ESTATUS, ID_EQUIPO FROM COMODATO WHERE ID_COMODATO = :id",
            {"id": id_comodato},
        )
        prev = cursor.fetchone()
        if prev is None:
            raise HTTPException(status_code=404, detail="Comodato no encontrado")
        prev_estatus = prev[0].strip() if prev[0] else ""
        id_equipo_prev = prev[1]

        cursor.execute(
            """UPDATE COMODATO SET
                ID_EQUIPO = :id_equipo, ID_PACIENTE = :id_paciente,
                FECHA_PRESTAMO = TO_DATE(:fecha_prest, 'YYYY-MM-DD'),
                FECHA_DEVOLUCION = CASE WHEN :fecha_dev IS NOT NULL
                                        THEN TO_DATE(:fecha_dev, 'YYYY-MM-DD')
                                        ELSE NULL END,
                ESTATUS = :estatus, MONTO_TOTAL = :monto_total,
                MONTO_PAGADO = :monto_pagado, SALDO_PENDIENTE = :saldo,
                EXENTO_PAGO = :exento, NOTAS = :notas
               WHERE ID_COMODATO = :id""",
            {
                "id_equipo": data.id_equipo,
                "id_paciente": data.id_paciente,
                "fecha_prest": data.fecha_prestamo,
                "fecha_dev": data.fecha_devolucion,
                "estatus": data.estatus,
                "monto_total": data.monto_total,
                "monto_pagado": data.monto_pagado,
                "saldo": data.saldo_pendiente,
                "exento": data.exento_pago,
                "notas": data.notas,
                "id": id_comodato,
            },
        )

        # RF-PS-07: Si se devuelve equipo, restaurar stock
        new_estatus = data.estatus.strip() if data.estatus else ""
        if prev_estatus == "PRESTADO" and new_estatus == "DEVUELTO":
            cursor.execute(
                """UPDATE EXISTENCIA_PRODUCTO
                   SET CANTIDAD_DISPONIBLE = CANTIDAD_DISPONIBLE + 1
                   WHERE ID_PRODUCTO = :id_equipo AND ACTIVO = 'S'""",
                {"id_equipo": id_equipo_prev},
            )
            cursor.execute(
                """INSERT INTO MOVIMIENTO_INVENTARIO
                   (ID_PRODUCTO, ID_USUARIO_REGISTRO, ID_COMODATO,
                    FECHA_MOVIMIENTO, TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES)
                   VALUES (:id_prod, :id_usr, :id_com,
                           SYSTIMESTAMP, 'ENTRADA', 1, :obs)""",
                {
                    "id_prod": id_equipo_prev,
                    "id_usr": id_usuario,
                    "id_com": id_comodato,
                    "obs": "Devolución de comodato",
                },
            )

        conn.commit()

    return _fetch_comodato(id_comodato)


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS - MOVIMIENTOS INVENTARIO
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/movimientos", response_model=List[MovimientoInventario])
def listar_movimientos(
    id_producto: Optional[int] = Query(None),
    tipo_movimiento: Optional[str] = Query(None, description="ENTRADA, SALIDA, AJUSTE"),
    current_user: dict = Depends(get_current_user),
):
    """Listar movimientos de inventario con filtros opcionales."""
    sql = """
        SELECT ID_MOVIMIENTO, ID_PRODUCTO, ID_USUARIO_REGISTRO,
               ID_VENTA, ID_COMODATO, FECHA_MOVIMIENTO,
               TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES
        FROM MOVIMIENTO_INVENTARIO WHERE 1=1
    """
    params: dict = {}

    if id_producto:
        sql += " AND ID_PRODUCTO = :id_producto"
        params["id_producto"] = id_producto

    if tipo_movimiento:
        sql += " AND TIPO_MOVIMIENTO = :tipo"
        params["tipo"] = tipo_movimiento

    sql += " ORDER BY FECHA_MOVIMIENTO DESC, ID_MOVIMIENTO DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)

    return [_serialize(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS - ESTADISTICAS
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/stats")
def almacen_stats(current_user: dict = Depends(get_current_user)):
    """Estadisticas del almacen para dashboard."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Total productos activos y unidades
        cursor.execute(
            """SELECT COUNT(p.ID_PRODUCTO),
                      NVL(SUM(ex.CANTIDAD_DISPONIBLE), 0)
               FROM PRODUCTO p
               LEFT JOIN EXISTENCIA_PRODUCTO ex
                   ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'
               WHERE p.ACTIVO = 'S'"""
        )
        row = cursor.fetchone()
        total_productos = row[0]
        total_unidades = int(row[1])

        # Stock bajo
        cursor.execute(
            """SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE,
                      ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO
               FROM PRODUCTO p
               JOIN EXISTENCIA_PRODUCTO ex
                   ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'
               WHERE p.ACTIVO = 'S'
                 AND ex.CANTIDAD_DISPONIBLE < ex.NIVEL_MINIMO"""
        )
        stock_bajo = rows_to_dicts(cursor)
        stock_bajo = [_serialize(r) for r in stock_bajo]

        # Productos por tipo
        cursor.execute(
            """SELECT TIPO_PRODUCTO, COUNT(*)
               FROM PRODUCTO WHERE ACTIVO = 'S'
               GROUP BY TIPO_PRODUCTO"""
        )
        por_tipo = {r[0].strip(): r[1] for r in cursor.fetchall()}

        # Comodatos activos
        cursor.execute(
            "SELECT COUNT(*) FROM COMODATO WHERE ESTATUS = 'PRESTADO'"
        )
        comodatos_activos = cursor.fetchone()[0]

        # Servicios activos
        cursor.execute(
            "SELECT COUNT(*) FROM SERVICIO WHERE ACTIVO = 'S'"
        )
        servicios_activos = cursor.fetchone()[0]

        # Total movimientos
        cursor.execute("SELECT COUNT(*) FROM MOVIMIENTO_INVENTARIO")
        total_movimientos = cursor.fetchone()[0]

        # RF-I-06: Productos próximos a vencer (30 días) o ya vencidos
        try:
            cursor.execute(
                """SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE,
                          ex.FECHA_CADUCIDAD, ex.CANTIDAD_DISPONIBLE,
                          CASE WHEN ex.FECHA_CADUCIDAD < TRUNC(SYSDATE)
                               THEN 'VENCIDO' ELSE 'PROXIMO' END AS ESTATUS_CADUCIDAD
                   FROM PRODUCTO p
                   JOIN EXISTENCIA_PRODUCTO ex
                       ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'
                   JOIN MEDICAMENTO m ON m.ID_PRODUCTO = p.ID_PRODUCTO
                   WHERE p.ACTIVO = 'S'
                     AND m.REQUIERE_CADUCIDAD = 'S'
                     AND ex.FECHA_CADUCIDAD IS NOT NULL
                     AND ex.FECHA_CADUCIDAD <= TRUNC(SYSDATE) + 30
                   ORDER BY ex.FECHA_CADUCIDAD"""
            )
            proximos_vencer = [_serialize(r) for r in rows_to_dicts(cursor)]
        except Exception:
            proximos_vencer = []

    return {
        "total_productos": total_productos,
        "total_unidades": total_unidades,
        "stock_bajo": stock_bajo,
        "alertas_stock_bajo": len(stock_bajo),
        "por_tipo": por_tipo,
        "comodatos_activos": comodatos_activos,
        "servicios_activos": servicios_activos,
        "total_movimientos": total_movimientos,
        "proximos_vencer": proximos_vencer,
        "alertas_caducidad": len(proximos_vencer),
    }
