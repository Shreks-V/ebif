from fastapi import HTTPException
from typing import Optional
from datetime import date, datetime
from app.infrastructure.audit.bitacora import log_insert
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.schemas.schemas import ProductoCreate, ServicioCreate, ComodatoCreate

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
_PRODUCTOS_BASE_SQL = "\n    SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE, p.DESCRIPCION,\n           p.TIPO_PRODUCTO, p.ACTIVO, p.ID_USUARIO_REGISTRO, p.FECHA_REGISTRO,\n           p.PRECIO_CUOTA_A, p.PRECIO_CUOTA_B,\n           m.PRESENTACION, m.DOSIS, m.REQUIERE_CADUCIDAD,\n           e.NUMERO_SERIE, e2.MARCA, e2.MODELO, e2.ESTATUS_EQUIPO, e2.OBSERVACIONES,\n           ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO, ex.UNIDAD_MEDIDA\n    FROM PRODUCTO p\n    LEFT JOIN MEDICAMENTO m       ON m.ID_PRODUCTO  = p.ID_PRODUCTO\n    LEFT JOIN EQUIPO_MEDICO e2    ON e2.ID_PRODUCTO = p.ID_PRODUCTO\n    LEFT JOIN EXISTENCIA_PRODUCTO ex ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n"
_PRODUCTOS_BASE_SQL = "\n    SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE, p.DESCRIPCION,\n           p.TIPO_PRODUCTO, p.ACTIVO, p.ID_USUARIO_REGISTRO, p.FECHA_REGISTRO,\n           p.PRECIO_CUOTA_A, p.PRECIO_CUOTA_B,\n           m.PRESENTACION, m.DOSIS, m.REQUIERE_CADUCIDAD,\n           eq.NUMERO_SERIE, eq.MARCA, eq.MODELO, eq.ESTATUS_EQUIPO, eq.OBSERVACIONES,\n           ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO, ex.UNIDAD_MEDIDA, ex.FECHA_CADUCIDAD\n    FROM PRODUCTO p\n    LEFT JOIN MEDICAMENTO m        ON m.ID_PRODUCTO  = p.ID_PRODUCTO\n    LEFT JOIN EQUIPO_MEDICO eq     ON eq.ID_PRODUCTO = p.ID_PRODUCTO\n    LEFT JOIN EXISTENCIA_PRODUCTO ex ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n"

def listar_productos(tipo_producto: Optional[str]=None, busqueda: Optional[str]=None, activo: Optional[str]=None, current_user: dict=None):
    """Listar productos del almacen con filtros opcionales."""
    sql = _PRODUCTOS_BASE_SQL + ' WHERE 1=1'
    params: dict = {}
    if tipo_producto:
        sql += ' AND p.TIPO_PRODUCTO = :tipo_producto'
        params['tipo_producto'] = tipo_producto
    if activo:
        sql += ' AND p.ACTIVO = :activo'
        params['activo'] = activo
    if busqueda:
        sql += ' AND (LOWER(p.NOMBRE) LIKE :busqueda OR LOWER(p.DESCRIPCION) LIKE :busqueda OR LOWER(p.CLAVE_INTERNA) LIKE :busqueda)'
        params['busqueda'] = f'%{busqueda.lower()}%'
    sql += ' ORDER BY p.ID_PRODUCTO'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_producto(id_producto: int, current_user: dict=None):
    """Obtener un producto por ID."""
    sql = _PRODUCTOS_BASE_SQL + ' WHERE p.ID_PRODUCTO = :id_producto'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id_producto': id_producto})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Producto no encontrado')
    return _serialize(row)

def crear_producto(data: ProductoCreate, current_user: dict=None):
    """Crear un nuevo producto con su subtipo y existencia."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        if data.tipo_producto == 'MEDICAMENTO':
            prefix = 'MED'
        else:
            prefix = 'EQP'
        cursor.execute('SELECT COUNT(*) FROM PRODUCTO WHERE TIPO_PRODUCTO = :tipo', {'tipo': data.tipo_producto})
        count = cursor.fetchone()[0]
        clave_interna = f'{prefix}-{count + 1:03d}'
        id_var = cursor.var(int)
        cursor.execute('INSERT INTO PRODUCTO\n               (CLAVE_INTERNA, NOMBRE, DESCRIPCION, TIPO_PRODUCTO, ACTIVO,\n                ID_USUARIO_REGISTRO, FECHA_REGISTRO, PRECIO_CUOTA_A, PRECIO_CUOTA_B)\n               VALUES (:clave, :nombre, :descripcion, :tipo, :activo,\n                       :id_usuario, SYSDATE, :precio_a, :precio_b)\n               RETURNING ID_PRODUCTO INTO :id_out', {'clave': clave_interna, 'nombre': data.nombre, 'descripcion': data.descripcion, 'tipo': data.tipo_producto, 'activo': data.activo, 'id_usuario': id_usuario, 'precio_a': data.precio_cuota_a, 'precio_b': data.precio_cuota_b, 'id_out': id_var})
        id_producto = id_var.getvalue()[0]
        if data.tipo_producto == 'MEDICAMENTO':
            cursor.execute('INSERT INTO MEDICAMENTO\n                   (ID_PRODUCTO, PRESENTACION, DOSIS, REQUIERE_CADUCIDAD)\n                   VALUES (:id, :presentacion, :dosis, :requiere)', {'id': id_producto, 'presentacion': data.presentacion, 'dosis': data.dosis, 'requiere': data.requiere_caducidad or 'N'})
        else:
            cursor.execute('INSERT INTO EQUIPO_MEDICO\n                   (ID_PRODUCTO, NUMERO_SERIE, MARCA, MODELO,\n                    ESTATUS_EQUIPO, OBSERVACIONES)\n                   VALUES (:id, :serie, :marca, :modelo, :estatus, :obs)', {'id': id_producto, 'serie': data.numero_serie, 'marca': data.marca, 'modelo': data.modelo, 'estatus': data.estatus_equipo or 'DISPONIBLE', 'obs': data.observaciones})
        cursor.execute("INSERT INTO EXISTENCIA_PRODUCTO\n               (ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO, UNIDAD_MEDIDA, ACTIVO, FECHA_CADUCIDAD)\n               VALUES (:id, :cant, :nmin, :unidad, 'S',\n                       CASE WHEN :fecha_cad IS NOT NULL THEN TO_DATE(:fecha_cad2, 'YYYY-MM-DD') ELSE NULL END)", {'id': id_producto, 'cant': data.cantidad_disponible, 'nmin': data.nivel_minimo, 'unidad': data.unidad_medida, 'fecha_cad': data.fecha_caducidad, 'fecha_cad2': data.fecha_caducidad})
        log_insert(conn, 'PRODUCTO', id_producto, id_usuario, f'Producto {clave_interna} creado')
        conn.commit()
    return obtener_producto.__wrapped__(id_producto, current_user) if hasattr(obtener_producto, '__wrapped__') else _fetch_producto(id_producto)

def _fetch_producto(id_producto: int) -> dict:
    """Fetch a single product (internal helper, no auth)."""
    sql = _PRODUCTOS_BASE_SQL + ' WHERE p.ID_PRODUCTO = :id_producto'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id_producto': id_producto})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Producto no encontrado')
    return _serialize(row)

def actualizar_producto(id_producto: int, data: ProductoCreate, current_user: dict=None):
    """Actualizar un producto existente."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_PRODUCTO, TIPO_PRODUCTO FROM PRODUCTO WHERE ID_PRODUCTO = :id', {'id': id_producto})
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail='Producto no encontrado')
        cursor.execute('UPDATE PRODUCTO SET\n                NOMBRE = :nombre, DESCRIPCION = :descripcion,\n                TIPO_PRODUCTO = :tipo, ACTIVO = :activo,\n                PRECIO_CUOTA_A = :precio_a, PRECIO_CUOTA_B = :precio_b\n               WHERE ID_PRODUCTO = :id', {'nombre': data.nombre, 'descripcion': data.descripcion, 'tipo': data.tipo_producto, 'activo': data.activo, 'precio_a': data.precio_cuota_a, 'precio_b': data.precio_cuota_b, 'id': id_producto})
        if data.tipo_producto == 'MEDICAMENTO':
            cursor.execute('MERGE INTO MEDICAMENTO m\n                   USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src\n                   ON (m.ID_PRODUCTO = src.ID_PRODUCTO)\n                   WHEN MATCHED THEN UPDATE SET\n                       PRESENTACION = :presentacion, DOSIS = :dosis,\n                       REQUIERE_CADUCIDAD = :requiere\n                   WHEN NOT MATCHED THEN INSERT\n                       (ID_PRODUCTO, PRESENTACION, DOSIS, REQUIERE_CADUCIDAD)\n                       VALUES (:id, :presentacion, :dosis, :requiere)', {'id': id_producto, 'presentacion': data.presentacion, 'dosis': data.dosis, 'requiere': data.requiere_caducidad or 'N'})
        else:
            cursor.execute('MERGE INTO EQUIPO_MEDICO eq\n                   USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src\n                   ON (eq.ID_PRODUCTO = src.ID_PRODUCTO)\n                   WHEN MATCHED THEN UPDATE SET\n                       NUMERO_SERIE = :serie, MARCA = :marca, MODELO = :modelo,\n                       ESTATUS_EQUIPO = :estatus, OBSERVACIONES = :obs\n                   WHEN NOT MATCHED THEN INSERT\n                       (ID_PRODUCTO, NUMERO_SERIE, MARCA, MODELO, ESTATUS_EQUIPO, OBSERVACIONES)\n                       VALUES (:id, :serie, :marca, :modelo, :estatus, :obs)', {'id': id_producto, 'serie': data.numero_serie, 'marca': data.marca, 'modelo': data.modelo, 'estatus': data.estatus_equipo or 'DISPONIBLE', 'obs': data.observaciones})
        cursor.execute("MERGE INTO EXISTENCIA_PRODUCTO ex\n               USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src\n               ON (ex.ID_PRODUCTO = src.ID_PRODUCTO AND ex.ACTIVO = 'S')\n               WHEN MATCHED THEN UPDATE SET\n                   CANTIDAD_DISPONIBLE = :cant, NIVEL_MINIMO = :nmin,\n                   UNIDAD_MEDIDA = :unidad,\n                   FECHA_CADUCIDAD = CASE WHEN :fecha_cad IS NOT NULL THEN TO_DATE(:fecha_cad2, 'YYYY-MM-DD') ELSE NULL END\n               WHEN NOT MATCHED THEN INSERT\n                   (ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO, UNIDAD_MEDIDA, ACTIVO, FECHA_CADUCIDAD)\n                   VALUES (:id, :cant, :nmin, :unidad, 'S',\n                           CASE WHEN :fecha_cad3 IS NOT NULL THEN TO_DATE(:fecha_cad4, 'YYYY-MM-DD') ELSE NULL END)", {'id': id_producto, 'cant': data.cantidad_disponible, 'nmin': data.nivel_minimo, 'unidad': data.unidad_medida, 'fecha_cad': data.fecha_caducidad, 'fecha_cad2': data.fecha_caducidad, 'fecha_cad3': data.fecha_caducidad, 'fecha_cad4': data.fecha_caducidad})
        conn.commit()
    return _fetch_producto(id_producto)

def desactivar_producto(id_producto: int, current_user: dict=None):
    """Desactivar un producto (soft delete)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE PRODUCTO SET ACTIVO = 'N' WHERE ID_PRODUCTO = :id", {'id': id_producto})
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Producto no encontrado')
        conn.commit()
    return {'message': 'Producto desactivado correctamente'}

def listar_servicios(busqueda: Optional[str]=None, activo: Optional[str]=None, current_user: dict=None):
    """Listar servicios con filtros opcionales."""
    sql = '\n        SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,\n               ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n               PRECIO_CUOTA_A, PRECIO_CUOTA_B\n        FROM SERVICIO WHERE 1=1\n    '
    params: dict = {}
    if activo:
        sql += ' AND ACTIVO = :activo'
        params['activo'] = activo
    if busqueda:
        sql += ' AND (LOWER(NOMBRE) LIKE :busqueda OR LOWER(DESCRIPCION) LIKE :busqueda)'
        params['busqueda'] = f'%{busqueda.lower()}%'
    sql += ' ORDER BY ID_SERVICIO'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_servicio(id_servicio: int, current_user: dict=None):
    """Obtener un servicio por ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,\n                      ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                      PRECIO_CUOTA_A, PRECIO_CUOTA_B\n               FROM SERVICIO WHERE ID_SERVICIO = :id', {'id': id_servicio})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Servicio no encontrado')
    return _serialize(row)

def crear_servicio(data: ServicioCreate, current_user: dict=None):
    """Crear un nuevo servicio."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        id_var = cursor.var(int)
        cursor.execute('INSERT INTO SERVICIO\n               (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO,\n                ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                PRECIO_CUOTA_A, PRECIO_CUOTA_B)\n               VALUES (:nombre, :descripcion, :cuota, :activo,\n                       :id_usuario, SYSDATE, :precio_a, :precio_b)\n               RETURNING ID_SERVICIO INTO :id_out', {'nombre': data.nombre, 'descripcion': data.descripcion, 'cuota': data.cuota_recuperacion, 'activo': data.activo, 'id_usuario': id_usuario, 'precio_a': data.precio_cuota_a, 'precio_b': data.precio_cuota_b, 'id_out': id_var})
        id_servicio = id_var.getvalue()[0]
        conn.commit()
    return _fetch_servicio(id_servicio)

def _fetch_servicio(id_servicio: int) -> dict:
    """Fetch a single service (internal helper)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,\n                      ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                      PRECIO_CUOTA_A, PRECIO_CUOTA_B\n               FROM SERVICIO WHERE ID_SERVICIO = :id', {'id': id_servicio})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Servicio no encontrado')
    return _serialize(row)

def actualizar_servicio(id_servicio: int, data: ServicioCreate, current_user: dict=None):
    """Actualizar un servicio existente."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE SERVICIO SET\n                NOMBRE = :nombre, DESCRIPCION = :descripcion,\n                CUOTA_RECUPERACION = :cuota, ACTIVO = :activo,\n                PRECIO_CUOTA_A = :precio_a, PRECIO_CUOTA_B = :precio_b\n               WHERE ID_SERVICIO = :id', {'nombre': data.nombre, 'descripcion': data.descripcion, 'cuota': data.cuota_recuperacion, 'activo': data.activo, 'precio_a': data.precio_cuota_a, 'precio_b': data.precio_cuota_b, 'id': id_servicio})
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Servicio no encontrado')
        conn.commit()
    return _fetch_servicio(id_servicio)

def desactivar_servicio(id_servicio: int, current_user: dict=None):
    """Desactivar un servicio (soft delete)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE SERVICIO SET ACTIVO = 'N' WHERE ID_SERVICIO = :id", {'id': id_servicio})
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Servicio no encontrado')
        conn.commit()
    return {'message': 'Servicio desactivado correctamente'}
_COMODATOS_BASE_SQL = "\n    SELECT c.ID_COMODATO, c.FOLIO_COMODATO, c.ID_EQUIPO, c.ID_PACIENTE,\n           c.ID_USUARIO_REGISTRO, c.FECHA_PRESTAMO, c.FECHA_DEVOLUCION,\n           c.ESTATUS, c.MONTO_TOTAL, c.MONTO_PAGADO, c.SALDO_PENDIENTE,\n           c.EXENTO_PAGO, c.NOTAS,\n           pa.NOMBRE || ' ' || pa.APELLIDO_PATERNO || ' ' || NVL(pa.APELLIDO_MATERNO, '') AS NOMBRE_PACIENTE,\n           pa.FOLIO AS FOLIO_PACIENTE,\n           pr.NOMBRE AS NOMBRE_EQUIPO\n    FROM COMODATO c\n    LEFT JOIN PACIENTE pa ON pa.ID_PACIENTE = c.ID_PACIENTE\n    LEFT JOIN PRODUCTO pr ON pr.ID_PRODUCTO = c.ID_EQUIPO\n"

def listar_comodatos(estatus: Optional[str]=None, busqueda: Optional[str]=None, current_user: dict=None):
    """Listar comodatos con filtros opcionales."""
    sql = _COMODATOS_BASE_SQL + ' WHERE 1=1'
    params: dict = {}
    if estatus:
        sql += ' AND c.ESTATUS = :estatus'
        params['estatus'] = estatus
    if busqueda:
        sql += " AND (LOWER(pa.NOMBRE || ' ' || pa.APELLIDO_PATERNO) LIKE :busqueda OR LOWER(pr.NOMBRE) LIKE :busqueda OR LOWER(pa.FOLIO) LIKE :busqueda OR LOWER(c.FOLIO_COMODATO) LIKE :busqueda)"
        params['busqueda'] = f'%{busqueda.lower()}%'
    sql += ' ORDER BY c.ID_COMODATO DESC'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_comodato(id_comodato: int, current_user: dict=None):
    """Obtener un comodato por ID."""
    sql = _COMODATOS_BASE_SQL + ' WHERE c.ID_COMODATO = :id'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id': id_comodato})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Comodato no encontrado')
    return _serialize(row)

def crear_comodato(data: ComodatoCreate, current_user: dict=None):
    """Registrar un nuevo comodato con validación de inventario (RF-PS-06)."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        cursor.execute("SELECT ex.CANTIDAD_DISPONIBLE\n               FROM EXISTENCIA_PRODUCTO ex\n               WHERE ex.ID_PRODUCTO = :id_equipo AND ex.ACTIVO = 'S'", {'id_equipo': data.id_equipo})
        stock_row = cursor.fetchone()
        if stock_row is None:
            raise HTTPException(status_code=400, detail='El equipo no tiene registro de existencia en inventario')
        if stock_row[0] <= 0:
            raise HTTPException(status_code=400, detail='No hay existencia disponible del equipo seleccionado')
        cursor.execute('SELECT NVL(MAX(ID_COMODATO), 0) + 1 FROM COMODATO')
        next_num = cursor.fetchone()[0]
        folio = f'COM-{next_num:06d}'
        id_var = cursor.var(int)
        cursor.execute("INSERT INTO COMODATO\n               (FOLIO_COMODATO, ID_EQUIPO, ID_PACIENTE, ID_USUARIO_REGISTRO,\n                FECHA_PRESTAMO, FECHA_DEVOLUCION, ESTATUS,\n                MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE,\n                EXENTO_PAGO, NOTAS)\n               VALUES (:folio, :id_equipo, :id_paciente, :id_usuario,\n                       TO_DATE(:fecha_prest, 'YYYY-MM-DD'),\n                       CASE WHEN :fecha_dev IS NOT NULL\n                            THEN TO_DATE(:fecha_dev, 'YYYY-MM-DD')\n                            ELSE NULL END,\n                       :estatus, :monto_total, :monto_pagado, :saldo,\n                       :exento, :notas)\n               RETURNING ID_COMODATO INTO :id_out", {'folio': folio, 'id_equipo': data.id_equipo, 'id_paciente': data.id_paciente, 'id_usuario': id_usuario, 'fecha_prest': data.fecha_prestamo, 'fecha_dev': data.fecha_devolucion, 'estatus': data.estatus, 'monto_total': data.monto_total, 'monto_pagado': data.monto_pagado, 'saldo': data.saldo_pendiente, 'exento': data.exento_pago, 'notas': data.notas, 'id_out': id_var})
        id_comodato = id_var.getvalue()[0]
        cursor.execute("UPDATE EXISTENCIA_PRODUCTO\n               SET CANTIDAD_DISPONIBLE = CANTIDAD_DISPONIBLE - 1\n               WHERE ID_PRODUCTO = :id_equipo AND ACTIVO = 'S'", {'id_equipo': data.id_equipo})
        cursor.execute("INSERT INTO MOVIMIENTO_INVENTARIO\n               (ID_PRODUCTO, ID_USUARIO_REGISTRO, ID_COMODATO,\n                FECHA_MOVIMIENTO, TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES)\n               VALUES (:id_prod, :id_usr, :id_com,\n                       SYSTIMESTAMP, 'SALIDA', 1, :obs)", {'id_prod': data.id_equipo, 'id_usr': id_usuario, 'id_com': id_comodato, 'obs': f'Préstamo comodato {folio}'})
        log_insert(conn, 'COMODATO', id_comodato, id_usuario, f'Comodato {folio} creado para paciente {data.id_paciente}')
        conn.commit()
    return _fetch_comodato(id_comodato)

def _fetch_comodato(id_comodato: int) -> dict:
    """Fetch a single comodato (internal helper)."""
    sql = _COMODATOS_BASE_SQL + ' WHERE c.ID_COMODATO = :id'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id': id_comodato})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Comodato no encontrado')
    return _serialize(row)

def actualizar_comodato(id_comodato: int, data: ComodatoCreate, current_user: dict=None):
    """Actualizar un comodato existente (RF-PS-07: auto-update stock on return)."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        cursor.execute('SELECT ESTATUS, ID_EQUIPO FROM COMODATO WHERE ID_COMODATO = :id', {'id': id_comodato})
        prev = cursor.fetchone()
        if prev is None:
            raise HTTPException(status_code=404, detail='Comodato no encontrado')
        prev_estatus = prev[0].strip() if prev[0] else ''
        id_equipo_prev = prev[1]
        cursor.execute("UPDATE COMODATO SET\n                ID_EQUIPO = :id_equipo, ID_PACIENTE = :id_paciente,\n                FECHA_PRESTAMO = TO_DATE(:fecha_prest, 'YYYY-MM-DD'),\n                FECHA_DEVOLUCION = CASE WHEN :fecha_dev IS NOT NULL\n                                        THEN TO_DATE(:fecha_dev, 'YYYY-MM-DD')\n                                        ELSE NULL END,\n                ESTATUS = :estatus, MONTO_TOTAL = :monto_total,\n                MONTO_PAGADO = :monto_pagado, SALDO_PENDIENTE = :saldo,\n                EXENTO_PAGO = :exento, NOTAS = :notas\n               WHERE ID_COMODATO = :id", {'id_equipo': data.id_equipo, 'id_paciente': data.id_paciente, 'fecha_prest': data.fecha_prestamo, 'fecha_dev': data.fecha_devolucion, 'estatus': data.estatus, 'monto_total': data.monto_total, 'monto_pagado': data.monto_pagado, 'saldo': data.saldo_pendiente, 'exento': data.exento_pago, 'notas': data.notas, 'id': id_comodato})
        new_estatus = data.estatus.strip() if data.estatus else ''
        if prev_estatus == 'PRESTADO' and new_estatus == 'DEVUELTO':
            cursor.execute("UPDATE EXISTENCIA_PRODUCTO\n                   SET CANTIDAD_DISPONIBLE = CANTIDAD_DISPONIBLE + 1\n                   WHERE ID_PRODUCTO = :id_equipo AND ACTIVO = 'S'", {'id_equipo': id_equipo_prev})
            cursor.execute("INSERT INTO MOVIMIENTO_INVENTARIO\n                   (ID_PRODUCTO, ID_USUARIO_REGISTRO, ID_COMODATO,\n                    FECHA_MOVIMIENTO, TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES)\n                   VALUES (:id_prod, :id_usr, :id_com,\n                           SYSTIMESTAMP, 'ENTRADA', 1, :obs)", {'id_prod': id_equipo_prev, 'id_usr': id_usuario, 'id_com': id_comodato, 'obs': 'Devolución de comodato'})
        conn.commit()
    return _fetch_comodato(id_comodato)

def listar_movimientos(id_producto: Optional[int]=None, tipo_movimiento: Optional[str]=None, current_user: dict=None):
    """Listar movimientos de inventario con filtros opcionales."""
    sql = '\n        SELECT ID_MOVIMIENTO, ID_PRODUCTO, ID_USUARIO_REGISTRO,\n               ID_VENTA, ID_COMODATO, FECHA_MOVIMIENTO,\n               TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES\n        FROM MOVIMIENTO_INVENTARIO WHERE 1=1\n    '
    params: dict = {}
    if id_producto:
        sql += ' AND ID_PRODUCTO = :id_producto'
        params['id_producto'] = id_producto
    if tipo_movimiento:
        sql += ' AND TIPO_MOVIMIENTO = :tipo'
        params['tipo'] = tipo_movimiento
    sql += ' ORDER BY FECHA_MOVIMIENTO DESC, ID_MOVIMIENTO DESC'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def almacen_stats(current_user: dict=None):
    """Estadisticas del almacen para dashboard."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(p.ID_PRODUCTO),\n                      NVL(SUM(ex.CANTIDAD_DISPONIBLE), 0)\n               FROM PRODUCTO p\n               LEFT JOIN EXISTENCIA_PRODUCTO ex\n                   ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n               WHERE p.ACTIVO = 'S'")
        row = cursor.fetchone()
        total_productos = row[0]
        total_unidades = int(row[1])
        cursor.execute("SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE,\n                      ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO\n               FROM PRODUCTO p\n               JOIN EXISTENCIA_PRODUCTO ex\n                   ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n               WHERE p.ACTIVO = 'S'\n                 AND ex.CANTIDAD_DISPONIBLE < ex.NIVEL_MINIMO")
        stock_bajo = rows_to_dicts(cursor)
        stock_bajo = [_serialize(r) for r in stock_bajo]
        cursor.execute("SELECT TIPO_PRODUCTO, COUNT(*)\n               FROM PRODUCTO WHERE ACTIVO = 'S'\n               GROUP BY TIPO_PRODUCTO")
        por_tipo = {r[0].strip(): r[1] for r in cursor.fetchall()}
        cursor.execute("SELECT COUNT(*) FROM COMODATO WHERE ESTATUS = 'PRESTADO'")
        comodatos_activos = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM SERVICIO WHERE ACTIVO = 'S'")
        servicios_activos = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM MOVIMIENTO_INVENTARIO')
        total_movimientos = cursor.fetchone()[0]
        try:
            cursor.execute("SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE,\n                          ex.FECHA_CADUCIDAD, ex.CANTIDAD_DISPONIBLE,\n                          CASE WHEN ex.FECHA_CADUCIDAD < TRUNC(SYSDATE)\n                               THEN 'VENCIDO' ELSE 'PROXIMO' END AS ESTATUS_CADUCIDAD\n                   FROM PRODUCTO p\n                   JOIN EXISTENCIA_PRODUCTO ex\n                       ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n                   JOIN MEDICAMENTO m ON m.ID_PRODUCTO = p.ID_PRODUCTO\n                   WHERE p.ACTIVO = 'S'\n                     AND m.REQUIERE_CADUCIDAD = 'S'\n                     AND ex.FECHA_CADUCIDAD IS NOT NULL\n                     AND ex.FECHA_CADUCIDAD <= TRUNC(SYSDATE) + 30\n                   ORDER BY ex.FECHA_CADUCIDAD")
            proximos_vencer = [_serialize(r) for r in rows_to_dicts(cursor)]
        except Exception:
            proximos_vencer = []
    return {'total_productos': total_productos, 'total_unidades': total_unidades, 'stock_bajo': stock_bajo, 'alertas_stock_bajo': len(stock_bajo), 'por_tipo': por_tipo, 'comodatos_activos': comodatos_activos, 'servicios_activos': servicios_activos, 'total_movimientos': total_movimientos, 'proximos_vencer': proximos_vencer, 'alertas_caducidad': len(proximos_vencer)}


class OracleAlmacenRepository:
    def listar_productos(self, *args, **kwargs):
        return listar_productos(*args, **kwargs)

    def obtener_producto(self, *args, **kwargs):
        return obtener_producto(*args, **kwargs)

    def crear_producto(self, *args, **kwargs):
        return crear_producto(*args, **kwargs)

    def actualizar_producto(self, *args, **kwargs):
        return actualizar_producto(*args, **kwargs)

    def desactivar_producto(self, *args, **kwargs):
        return desactivar_producto(*args, **kwargs)

    def listar_servicios(self, *args, **kwargs):
        return listar_servicios(*args, **kwargs)

    def obtener_servicio(self, *args, **kwargs):
        return obtener_servicio(*args, **kwargs)

    def crear_servicio(self, *args, **kwargs):
        return crear_servicio(*args, **kwargs)

    def actualizar_servicio(self, *args, **kwargs):
        return actualizar_servicio(*args, **kwargs)

    def desactivar_servicio(self, *args, **kwargs):
        return desactivar_servicio(*args, **kwargs)

    def listar_comodatos(self, *args, **kwargs):
        return listar_comodatos(*args, **kwargs)

    def obtener_comodato(self, *args, **kwargs):
        return obtener_comodato(*args, **kwargs)

    def crear_comodato(self, *args, **kwargs):
        return crear_comodato(*args, **kwargs)

    def actualizar_comodato(self, *args, **kwargs):
        return actualizar_comodato(*args, **kwargs)

    def listar_movimientos(self, *args, **kwargs):
        return listar_movimientos(*args, **kwargs)

    def almacen_stats(self, *args, **kwargs):
        return almacen_stats(*args, **kwargs)
