from __future__ import annotations

import logging
import oracledb
from app.domain.beneficiarios.ports import BeneficiariosRepository
from app.domain.shared.current_user import CurrentUser
from app.domain.exceptions import NotFoundError, InternalError, ValidationError
from datetime import date, datetime, timedelta
from app.infrastructure.audit.bitacora import log_insert, log_delete, log_update
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.persistence.helpers import (
    normalize_pagination as _normalize_pagination,
    date_to_str as _date_to_str,
    normalize_date_input as _normalize_date_input,
    strip_char as _strip_char,
    safe_rows_query as _safe_rows_query_impl,
)
from app.infrastructure.privacy.crypto import encrypt, decrypt_row, PACIENTE_ENCRYPTED_FIELDS
from app.domain.beneficiarios.services import calculate_age, etapa_vida, normalize_genero, is_nuevo_leon

logger = logging.getLogger(__name__)

_MSG_BENEFICIARIO_NO_ENCONTRADO = 'Beneficiario no encontrado'
_SELECT_PACIENTE_BY_FOLIO = 'SELECT * FROM PACIENTE WHERE FOLIO = :folio'
_SELECT_PACIENTE_BY_ID = 'SELECT * FROM PACIENTE WHERE ID_PACIENTE = :id'

# Shared WHERE predicates — single source of truth for the active/approved patient filter
_ACTIVO_APROBADO = "ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'"
_P_ACTIVO_APROBADO = "p.ACTIVO = 'S' AND p.ESTATUS_REGISTRO = 'APROBADO'"

def _safe_rows_query(cur, sql: str, params: dict, context: str) -> list[dict]:
    return _safe_rows_query_impl(cur, sql, params, context, logger)

def _fetch_tipos_espina(conn, id_paciente: int) -> list[dict]:
    """Fetch tipos_espina for a given patient."""
    cur = conn.cursor()
    cur.execute('\n        SELECT te.ID_TIPO_ESPINA, te.NOMBRE\n        FROM PACIENTE_TIPO_ESPINA pte\n        JOIN TIPO_ESPINA_BIFIDA te ON te.ID_TIPO_ESPINA = pte.ID_TIPO_ESPINA\n        WHERE pte.ID_PACIENTE = :id\n        ', {'id': id_paciente})
    rows = rows_to_dicts(cur)
    return [{'id_tipo_espina': r['id_tipo_espina'], 'nombre': _strip_char(r['nombre'])} for r in rows]

def _patient_row_to_response(row: dict, conn=None, tipos_map: dict | None=None) -> dict:
    """Convert a raw patient row dict to the API response format."""
    row = decrypt_row(row, PACIENTE_ENCRYPTED_FIELDS)
    row['fecha_nacimiento'] = _date_to_str(row.get('fecha_nacimiento'))
    row['fecha_alta'] = _date_to_str(row.get('fecha_alta'))
    row['fecha_registro'] = _date_to_str(row.get('fecha_registro'))
    row['fecha_inicio_membresia'] = _date_to_str(row.get('fecha_inicio_membresia'))
    row['fecha_vencimiento_membresia'] = _date_to_str(row.get('fecha_vencimiento_membresia'))
    for field in ('activo', 'usa_valvula', 'genero', 'membresia_estatus', 'tipo_cuota'):
        if field in row and row[field] is not None:
            row[field] = _strip_char(row[field])
    if tipos_map is not None:
        row['tipos_espina'] = tipos_map.get(row['id_paciente'], [])
    elif conn is not None:
        row['tipos_espina'] = _fetch_tipos_espina(conn, row['id_paciente'])
    else:
        row['tipos_espina'] = []
    return row

def _batch_fetch_tipos_espina(conn, patient_ids: list[int]) -> dict[int, list[dict]]:
    """Fetch tipos_espina for many patients in a single query."""
    if not patient_ids:
        return {}
    cur = conn.cursor()
    result: dict[int, list[dict]] = {pid: [] for pid in patient_ids}
    for i in range(0, len(patient_ids), 900):
        chunk = patient_ids[i:i + 900]
        placeholders = ', '.join((f':p{j}' for j in range(len(chunk))))
        params = {f'p{j}': pid for j, pid in enumerate(chunk)}
        cur.execute(f'\n            SELECT pte.ID_PACIENTE, te.ID_TIPO_ESPINA, te.NOMBRE\n              FROM PACIENTE_TIPO_ESPINA pte\n              JOIN TIPO_ESPINA_BIFIDA te ON te.ID_TIPO_ESPINA = pte.ID_TIPO_ESPINA\n             WHERE pte.ID_PACIENTE IN ({placeholders})\n            ', params)
        for row in cur.fetchall():
            pid = row[0]
            result[pid].append({'id_tipo_espina': row[1], 'nombre': _strip_char(row[2])})
    return result

def _listar_tipos_espina(_current_user: CurrentUser | None = None):
    """Listar todos los tipos de espina bífida."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT ID_TIPO_ESPINA, NOMBRE, DESCRIPCION, ACTIVO FROM TIPO_ESPINA_BIFIDA WHERE ACTIVO = 'S' ORDER BY ID_TIPO_ESPINA")
        rows = rows_to_dicts(cur)
        for r in rows:
            r['activo'] = _strip_char(r.get('activo'))
            r['nombre'] = _strip_char(r.get('nombre'))
        return rows

def _stats_beneficiarios(_current_user: CurrentUser | None = None):
    """Conteo total de beneficiarios."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM PACIENTE WHERE {_ACTIVO_APROBADO}")
        total_activos = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ESTATUS_REGISTRO = 'APROBADO'")
        total = cur.fetchone()[0]
        return {'total': total, 'activos': total_activos, 'inactivos': total - total_activos}

def _dashboard_stats(_current_user: CurrentUser | None = None):
    """Estadísticas generales para el dashboard."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM PACIENTE WHERE {_ACTIVO_APROBADO}")
        total = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM PACIENTE WHERE {_ACTIVO_APROBADO} AND MEMBRESIA_ESTATUS = 'ACTIVO'")
        activos = cur.fetchone()[0]
        inactivos = total - activos
        cur.execute(f"""
            SELECT GENERO, COUNT(*) AS cnt
              FROM PACIENTE
             WHERE {_ACTIVO_APROBADO} AND MEMBRESIA_ESTATUS = 'ACTIVO'
             GROUP BY GENERO
        """)
        por_genero = {'Hombre': 0, 'Mujer': 0}
        for row in rows_to_dicts(cur):
            genero = normalize_genero(row.get('genero'))
            if genero:
                por_genero[genero] += int(row.get('cnt') or 0)
        cur.execute(f"SELECT ESTADO, COUNT(*) AS cnt FROM PACIENTE WHERE {_ACTIVO_APROBADO} AND MEMBRESIA_ESTATUS = 'ACTIVO' GROUP BY ESTADO")
        nuevo_leon = 0
        for row in rows_to_dicts(cur):
            if is_nuevo_leon(row.get('estado')):
                nuevo_leon += int(row.get('cnt') or 0)
        foraneos = activos - nuevo_leon
        cur.execute(f"SELECT FECHA_NACIMIENTO FROM PACIENTE WHERE {_ACTIVO_APROBADO} AND MEMBRESIA_ESTATUS = 'ACTIVO'")
        fechas = [row[0] for row in cur.fetchall()]
        etapas: dict[str, int] = {}
        for fn in fechas:
            edad = calculate_age(fn)
            e = etapa_vida(edad)
            etapas[e] = etapas.get(e, 0) + 1
        hoy = date.today()
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        inicio_semana_ant = inicio_semana - timedelta(days=7)
        cur.execute("SELECT COUNT(*) FROM PACIENTE\n               WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'\n                 AND FECHA_REGISTRO >= TO_DATE(:inicio, 'YYYY-MM-DD')", {'inicio': inicio_semana.isoformat()})
        nuevos_esta_semana = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE\n               WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'\n                 AND FECHA_REGISTRO >= TO_DATE(:inicio, 'YYYY-MM-DD')\n                 AND FECHA_REGISTRO < TO_DATE(:fin, 'YYYY-MM-DD')", {'inicio': inicio_semana_ant.isoformat(), 'fin': inicio_semana.isoformat()})
        nuevos_semana_anterior = cur.fetchone()[0]
        por_genero_compat = {
            'Hombre': por_genero['Hombre'],
            'Mujer': por_genero['Mujer'],
            'Masculino': por_genero['Hombre'],
            'Femenino': por_genero['Mujer'],
        }
        etapas_compat = {
            **etapas,
            'Primera Infancia': etapas.get('Primera Infancia (0-5)', 0),
            'Infancia': etapas.get('Infancia (6-11)', 0),
            'Adolescencia': etapas.get('Adolescencia (12-17)', 0),
            'Juventud': etapas.get('Juventud (18-29)', 0),
            'Adultez': etapas.get('Adultez (30-59)', 0),
            'Adulto Mayor': etapas.get('Adulto Mayor (60+)', 0),
        }
        return {
            'total': total,
            'activos': activos,
            'inactivos': inactivos,
            'por_genero': por_genero_compat,
            'por_procedencia': {'Nuevo León': nuevo_leon, 'Foráneos': foraneos},
            'por_etapa_vida': etapas_compat,
            'nuevos_esta_semana': nuevos_esta_semana,
            'nuevos_semana_anterior': nuevos_semana_anterior,
        }

def _sync_membresias_vencidas(conn) -> int:
    """Marca como VENCIDO las membresías cuya fecha de vencimiento ya pasó."""
    cur = conn.cursor()
    cur.execute("""
        UPDATE PACIENTE
           SET MEMBRESIA_ESTATUS = 'VENCIDO'
         WHERE MEMBRESIA_ESTATUS = 'ACTIVO'
           AND FECHA_VENCIMIENTO_MEMBRESIA IS NOT NULL
           AND FECHA_VENCIMIENTO_MEMBRESIA < TRUNC(SYSDATE)
    """)
    updated = cur.rowcount
    if updated:
        conn.commit()
    return updated


def _listar_beneficiarios(nombre: str | None=None, estado: str | None=None, genero: str | None=None, busqueda: str | None=None, membresia_estatus: str | None=None, tipo_cuota: str | None=None, activo: str | None='S', _current_user: CurrentUser | None = None, limit: int=100, offset: int=0):
    """Listar beneficiarios con filtros opcionales."""
    with get_db() as conn:
        safe_limit, safe_offset = _normalize_pagination(limit, offset)
        _sync_membresias_vencidas(conn)
        params: dict = {}
        conditions = ["p.ESTATUS_REGISTRO = 'APROBADO'"]
        activo_normalizado = str(activo or 'S').strip().upper()
        if activo_normalizado != 'TODOS':
            conditions.append('p.ACTIVO = :activo')
            params['activo'] = 'N' if activo_normalizado == 'N' else 'S'
        if nombre:
            conditions.append('(LOWER(p.NOMBRE) LIKE :nombre OR LOWER(p.APELLIDO_PATERNO) LIKE :nombre OR LOWER(p.APELLIDO_MATERNO) LIKE :nombre)')
            params['nombre'] = f'%{nombre.lower()}%'
        if estado:
            conditions.append('p.MEMBRESIA_ESTATUS = :estado')
            params['estado'] = estado
        if membresia_estatus:
            conditions.append('p.MEMBRESIA_ESTATUS = :membresia_estatus')
            params['membresia_estatus'] = membresia_estatus
        if tipo_cuota:
            conditions.append('p.TIPO_CUOTA = :tipo_cuota')
            params['tipo_cuota'] = tipo_cuota
        if genero:
            conditions.append('p.GENERO = :genero')
            params['genero'] = genero
        if busqueda:
            conditions.append('(LOWER(p.NOMBRE) LIKE :busqueda OR LOWER(p.APELLIDO_PATERNO) LIKE :busqueda OR LOWER(p.APELLIDO_MATERNO) LIKE :busqueda OR LOWER(p.FOLIO) LIKE :busqueda OR LOWER(p.CIUDAD) LIKE :busqueda)')
            params['busqueda'] = f'%{busqueda.lower()}%'
        where_clause = ' AND '.join(conditions)
        params['offset'] = safe_offset
        params['limit'] = safe_limit
        sql = f'SELECT p.* FROM PACIENTE p WHERE {where_clause} ORDER BY p.ID_PACIENTE OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = rows_to_dicts(cur)
        patient_ids = [r['id_paciente'] for r in rows]
        tipos_map = _batch_fetch_tipos_espina(conn, patient_ids)
        return [_patient_row_to_response(row, tipos_map=tipos_map) for row in rows]

def _obtener_beneficiario(folio: str, _current_user: CurrentUser | None = None):
    """Obtener beneficiario por folio."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(_SELECT_PACIENTE_BY_FOLIO, {'folio': folio})
        row = row_to_dict(cur)
        if row is None:
            raise NotFoundError(_MSG_BENEFICIARIO_NO_ENCONTRADO)
        return _patient_row_to_response(row, conn)

def _crear_beneficiario(data, current_user: CurrentUser | None = None):
    """Crear nuevo beneficiario con folio auto-generado."""
    with get_db() as conn:
        cur = conn.cursor()
        # Find the next available FOLIO, skipping any that already exist
        # (rows may exist in non-APROBADO states invisible to the list endpoint)
        cur.execute('SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE')
        next_id = int(cur.fetchone()[0])
        folio = f'BEN-{next_id:06d}'
        cur.execute('SELECT COUNT(*) FROM PACIENTE WHERE FOLIO = :f', {'f': folio})
        while cur.fetchone()[0] > 0:
            next_id += 1
            folio = f'BEN-{next_id:06d}'
            cur.execute('SELECT COUNT(*) FROM PACIENTE WHERE FOLIO = :f', {'f': folio})
        payload = data.model_dump()
        tipos_ids = payload.pop('tipos_espina', None) or []
        out_id = cur.var(int)
        cur.execute("\n            INSERT INTO PACIENTE (\n                FOLIO, ACTIVO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,\n                GENERO, FECHA_NACIMIENTO, CURP, NOMBRE_PADRE_MADRE,\n                DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,\n                TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,\n                EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,\n                MUNICIPIO_NACIMIENTO, ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO,\n                TIPO_SANGRE, USA_VALVULA, NOTAS_ADICIONALES,\n                FECHA_ALTA, MEMBRESIA_ESTATUS, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                TIPO_CUOTA, ESTATUS_REGISTRO\n            ) VALUES (\n                :folio, :activo, :nombre, :apellido_paterno, :apellido_materno,\n                :genero, TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'), :curp, :nombre_padre_madre,\n                :direccion, :colonia, :ciudad, :estado, :codigo_postal,\n                :telefono_casa, :telefono_celular, :correo_electronico,\n                :en_emergencia_avisar_a, :telefono_emergencia,\n                :municipio_nacimiento, :estado_nacimiento, :hospital_nacimiento,\n                :tipo_sangre, :usa_valvula, :notas_adicionales,\n                SYSDATE, :membresia_estatus, :id_usuario_registro, SYSDATE,\n                :tipo_cuota, 'APROBADO'\n            )\n            RETURNING ID_PACIENTE INTO :out_id\n            ", {'folio': folio, 'activo': payload.get('activo', 'S'), 'nombre': payload['nombre'], 'apellido_paterno': payload['apellido_paterno'], 'apellido_materno': payload.get('apellido_materno'), 'genero': payload.get('genero'), 'fecha_nacimiento': _normalize_date_input(payload.get('fecha_nacimiento')), 'curp': encrypt(payload.get('curp')), 'nombre_padre_madre': encrypt(payload.get('nombre_padre_madre')), 'direccion': encrypt(payload.get('direccion')), 'colonia': payload.get('colonia'), 'ciudad': payload.get('ciudad'), 'estado': payload.get('estado'), 'codigo_postal': payload.get('codigo_postal'), 'telefono_casa': encrypt(payload.get('telefono_casa')), 'telefono_celular': encrypt(payload.get('telefono_celular')), 'correo_electronico': encrypt(payload.get('correo_electronico')), 'en_emergencia_avisar_a': encrypt(payload.get('en_emergencia_avisar_a')), 'telefono_emergencia': encrypt(payload.get('telefono_emergencia')), 'municipio_nacimiento': payload.get('municipio_nacimiento'), 'estado_nacimiento': payload.get('estado_nacimiento'), 'hospital_nacimiento': encrypt(payload.get('hospital_nacimiento')), 'tipo_sangre': encrypt(payload.get('tipo_sangre')), 'usa_valvula': payload.get('usa_valvula', 'N'), 'notas_adicionales': encrypt(payload.get('notas_adicionales')), 'membresia_estatus': payload.get('membresia_estatus', 'ACTIVO'), 'id_usuario_registro': current_user.get('id_usuario'), 'tipo_cuota': payload.get('tipo_cuota'), 'out_id': out_id})
        raw = out_id.getvalue()
        new_id = raw[0] if isinstance(raw, (list, tuple)) else raw
        for tid in tipos_ids:
            cur.execute('\n                INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO)\n                VALUES (:id_paciente, :id_tipo_espina, SYSDATE)\n                ', {'id_paciente': new_id, 'id_tipo_espina': tid})
        log_insert(conn, 'PACIENTE', new_id, current_user.get('id_usuario', 1), f'Beneficiario {folio} creado')
        conn.commit()
        cur.execute(_SELECT_PACIENTE_BY_ID, {'id': new_id})
        row = row_to_dict(cur)
        return _patient_row_to_response(row, conn)

def _actualizar_beneficiario(folio: str, data, _current_user: CurrentUser | None = None):
    """Actualizar beneficiario existente."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(_MSG_BENEFICIARIO_NO_ENCONTRADO)
        id_paciente = row[0]
        payload = data.model_dump()
        tipos_ids = payload.pop('tipos_espina', None) or []
        cur.execute("\n            UPDATE PACIENTE SET\n                NOMBRE = :nombre,\n                APELLIDO_PATERNO = :apellido_paterno,\n                APELLIDO_MATERNO = :apellido_materno,\n                GENERO = :genero,\n                FECHA_NACIMIENTO = TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),\n                CURP = :curp,\n                NOMBRE_PADRE_MADRE = :nombre_padre_madre,\n                DIRECCION = :direccion,\n                COLONIA = :colonia,\n                CIUDAD = :ciudad,\n                ESTADO = :estado,\n                CODIGO_POSTAL = :codigo_postal,\n                TELEFONO_CASA = :telefono_casa,\n                TELEFONO_CELULAR = :telefono_celular,\n                CORREO_ELECTRONICO = :correo_electronico,\n                EN_EMERGENCIA_AVISAR_A = :en_emergencia_avisar_a,\n                TELEFONO_EMERGENCIA = :telefono_emergencia,\n                MUNICIPIO_NACIMIENTO = :municipio_nacimiento,\n                ESTADO_NACIMIENTO = :estado_nacimiento,\n                HOSPITAL_NACIMIENTO = :hospital_nacimiento,\n                TIPO_SANGRE = :tipo_sangre,\n                USA_VALVULA = :usa_valvula,\n                NOTAS_ADICIONALES = :notas_adicionales,\n                MEMBRESIA_ESTATUS = :membresia_estatus,\n                ACTIVO = :activo,\n                TIPO_CUOTA = :tipo_cuota\n            WHERE ID_PACIENTE = :id_paciente\n            ", {'nombre': payload['nombre'], 'apellido_paterno': payload['apellido_paterno'], 'apellido_materno': payload.get('apellido_materno'), 'genero': payload.get('genero'), 'fecha_nacimiento': _normalize_date_input(payload.get('fecha_nacimiento')), 'curp': encrypt(payload.get('curp')), 'nombre_padre_madre': encrypt(payload.get('nombre_padre_madre')), 'direccion': encrypt(payload.get('direccion')), 'colonia': payload.get('colonia'), 'ciudad': payload.get('ciudad'), 'estado': payload.get('estado'), 'codigo_postal': payload.get('codigo_postal'), 'telefono_casa': encrypt(payload.get('telefono_casa')), 'telefono_celular': encrypt(payload.get('telefono_celular')), 'correo_electronico': encrypt(payload.get('correo_electronico')), 'en_emergencia_avisar_a': encrypt(payload.get('en_emergencia_avisar_a')), 'telefono_emergencia': encrypt(payload.get('telefono_emergencia')), 'municipio_nacimiento': payload.get('municipio_nacimiento'), 'estado_nacimiento': payload.get('estado_nacimiento'), 'hospital_nacimiento': encrypt(payload.get('hospital_nacimiento')), 'tipo_sangre': encrypt(payload.get('tipo_sangre')), 'usa_valvula': payload.get('usa_valvula', 'N'), 'notas_adicionales': encrypt(payload.get('notas_adicionales')), 'membresia_estatus': payload.get('membresia_estatus', 'ACTIVO'), 'activo': payload.get('activo', 'S'), 'tipo_cuota': payload.get('tipo_cuota'), 'id_paciente': id_paciente})
        # Si la membresía quedó ACTIVO y las fechas están vacías o vencidas,
        # iniciar un nuevo período desde hoy + 12 meses.
        cur.execute("""
            UPDATE PACIENTE
               SET FECHA_INICIO_MEMBRESIA      = TRUNC(SYSDATE),
                   FECHA_VENCIMIENTO_MEMBRESIA = ADD_MONTHS(TRUNC(SYSDATE), 12)
             WHERE ID_PACIENTE = :id_paciente
               AND MEMBRESIA_ESTATUS = 'ACTIVO'
               AND (FECHA_INICIO_MEMBRESIA IS NULL
                    OR FECHA_VENCIMIENTO_MEMBRESIA < TRUNC(SYSDATE))
        """, {'id_paciente': id_paciente})
        cur.execute('DELETE FROM PACIENTE_TIPO_ESPINA WHERE ID_PACIENTE = :id', {'id': id_paciente})
        for tid in tipos_ids:
            cur.execute('\n                INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO)\n                VALUES (:id_paciente, :id_tipo_espina, SYSDATE)\n                ', {'id_paciente': id_paciente, 'id_tipo_espina': tid})
        conn.commit()
        cur.execute(_SELECT_PACIENTE_BY_ID, {'id': id_paciente})
        row = row_to_dict(cur)
        return _patient_row_to_response(row, conn)

def _eliminar_beneficiario(folio: str, current_user: CurrentUser | None = None):
    """Soft delete: marcar beneficiario como inactivo."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(_MSG_BENEFICIARIO_NO_ENCONTRADO)
        id_paciente = row[0]
        cur.execute("UPDATE PACIENTE SET ACTIVO = 'N' WHERE FOLIO = :folio", {'folio': folio})
        log_delete(conn, 'PACIENTE', id_paciente, current_user.get('id_usuario', 1), f'Beneficiario {folio} desactivado')
        conn.commit()
        return {'detail': 'Beneficiario eliminado correctamente'}

def _reactivar_beneficiario(folio: str, current_user: CurrentUser | None = None):
    """Reactivar beneficiario previamente desactivado."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT ID_PACIENTE, ACTIVO FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(_MSG_BENEFICIARIO_NO_ENCONTRADO)
        id_paciente, activo_anterior = row[0], _strip_char(row[1])
        cur.execute("UPDATE PACIENTE SET ACTIVO = 'S' WHERE FOLIO = :folio", {'folio': folio})
        log_update(
            conn,
            'PACIENTE',
            id_paciente,
            'ACTIVO',
            activo_anterior,
            'S',
            current_user.get('id_usuario', 1),
            f'Beneficiario {folio} reactivado',
        )
        conn.commit()
        cur.execute(_SELECT_PACIENTE_BY_ID, {'id': id_paciente})
        row_dict = row_to_dict(cur)
        return _patient_row_to_response(row_dict, conn)

def _historial_beneficiario(
    folio: str,
    _current_user: CurrentUser | None = None,
    limit_citas: int=100,
    offset_citas: int=0,
    limit_pagos: int=100,
    offset_pagos: int=0,
    limit_comodatos: int=100,
    offset_comodatos: int=0,
):
    """Obtener historial de servicios, pagos y citas del beneficiario."""
    safe_limit_citas, safe_offset_citas = _normalize_pagination(limit_citas, offset_citas)
    safe_limit_pagos, safe_offset_pagos = _normalize_pagination(limit_pagos, offset_pagos)
    safe_limit_comodatos, safe_offset_comodatos = _normalize_pagination(limit_comodatos, offset_comodatos)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(_SELECT_PACIENTE_BY_FOLIO, {'folio': folio})
        paciente = row_to_dict(cur)
        if paciente is None:
            raise NotFoundError(_MSG_BENEFICIARIO_NO_ENCONTRADO)
        paciente = decrypt_row(paciente, PACIENTE_ENCRYPTED_FIELDS)
        nombre_completo = ' '.join((
            _strip_char(paciente.get('nombre')) or '',
            _strip_char(paciente.get('apellido_paterno')) or '',
            _strip_char(paciente.get('apellido_materno')) or '',
        )).strip() or folio
        id_paciente = paciente['id_paciente']
        citas_raw = _safe_rows_query(
            cur,
            '\n            SELECT c.ID_CITA, c.FECHA_HORA, c.ESTATUS, c.NOTAS, c.FECHA_REGISTRO\n            FROM CITA c\n            WHERE c.ID_PACIENTE = :id\n            ORDER BY c.FECHA_HORA DESC\n            OFFSET :offset_citas ROWS FETCH NEXT :limit_citas ROWS ONLY\n            ',
            {'id': id_paciente, 'offset_citas': safe_offset_citas, 'limit_citas': safe_limit_citas},
            'citas del beneficiario',
        )
        citas = []
        for ci in citas_raw:
            ci['fecha_hora'] = _date_to_str(ci.get('fecha_hora'))
            ci['fecha_registro'] = _date_to_str(ci.get('fecha_registro'))
            ci['estatus'] = _strip_char(ci.get('estatus'))
            servicios = _safe_rows_query(
                cur,
                '\n                SELECT s.NOMBRE, d.CANTIDAD, d.MONTO_PAGADO, d.CANCELADO\n                FROM DETALLE_CITA_SERVICIO d\n                JOIN SERVICIO s ON s.ID_SERVICIO = d.ID_SERVICIO\n                WHERE d.ID_CITA = :id_cita\n                ',
                {'id_cita': ci['id_cita']},
                f"servicios de cita {ci['id_cita']}",
            )
            for sv in servicios:
                sv['nombre'] = _strip_char(sv.get('nombre'))
                sv['cancelado'] = _strip_char(sv.get('cancelado'))
            ci['servicios'] = servicios
            doctores = _safe_rows_query(
                cur,
                'SELECT DISTINCT dr.NOMBRE || \' \' || dr.APELLIDO_PATERNO AS nombre_doctor,'
                ' dr.ESPECIALIDAD, NULL AS rol_doctor'
                ' FROM DETALLE_CITA_SERVICIO d'
                ' JOIN DOCTOR dr ON dr.ID_DOCTOR = d.ID_DOCTOR'
                ' WHERE d.ID_CITA = :id_cita AND d.ID_DOCTOR IS NOT NULL',
                {'id_cita': ci['id_cita']},
                f"doctores de cita {ci['id_cita']}",
            )
            for doc in doctores:
                doc['nombre_doctor'] = _strip_char(doc.get('nombre_doctor'))
                doc['especialidad'] = _strip_char(doc.get('especialidad'))
                doc['rol_doctor'] = _strip_char(doc.get('rol_doctor'))
            ci['doctores'] = doctores
            citas.append(ci)
        pagos_raw = _safe_rows_query(
            cur,
            '\n            SELECT v.ID_VENTA, v.FOLIO_VENTA, v.FECHA_VENTA,\n                   v.MONTO_TOTAL, v.MONTO_PAGADO, v.SALDO_PENDIENTE,\n                   v.EXENTO_PAGO, v.CANCELADA, v.MOTIVO_CANCELACION\n            FROM VENTA v\n            WHERE v.ID_PACIENTE = :id\n            ORDER BY v.FECHA_VENTA DESC\n            OFFSET :offset_pagos ROWS FETCH NEXT :limit_pagos ROWS ONLY\n            ',
            {'id': id_paciente, 'offset_pagos': safe_offset_pagos, 'limit_pagos': safe_limit_pagos},
            'pagos del beneficiario',
        )
        pagos = []
        for pg in pagos_raw:
            pg['fecha_venta'] = _date_to_str(pg.get('fecha_venta'))
            pg['cancelada'] = _strip_char(pg.get('cancelada'))
            pg['exento_pago'] = _strip_char(pg.get('exento_pago'))
            pg['folio_venta'] = _strip_char(pg.get('folio_venta'))
            pagos.append(pg)
        comodatos_raw = _safe_rows_query(
            cur,
            '\n            SELECT c.ID_COMODATO, c.FOLIO_COMODATO, c.FECHA_PRESTAMO,\n                   c.FECHA_DEVOLUCION, c.ESTATUS, c.MONTO_TOTAL,\n                   c.MONTO_PAGADO, c.SALDO_PENDIENTE,\n                   pr.NOMBRE AS nombre_equipo\n            FROM COMODATO c\n            LEFT JOIN PRODUCTO pr ON pr.ID_PRODUCTO = c.ID_EQUIPO\n            WHERE c.ID_PACIENTE = :id\n            ORDER BY c.FECHA_PRESTAMO DESC\n            OFFSET :offset_comodatos ROWS FETCH NEXT :limit_comodatos ROWS ONLY\n            ',
            {'id': id_paciente, 'offset_comodatos': safe_offset_comodatos, 'limit_comodatos': safe_limit_comodatos},
            'comodatos del beneficiario',
        )
        comodatos = []
        for cm in comodatos_raw:
            cm['fecha_prestamo'] = _date_to_str(cm.get('fecha_prestamo'))
            cm['fecha_devolucion'] = _date_to_str(cm.get('fecha_devolucion'))
            cm['estatus'] = _strip_char(cm.get('estatus'))
            cm['folio_comodato'] = _strip_char(cm.get('folio_comodato'))
            cm['nombre_equipo'] = _strip_char(cm.get('nombre_equipo'))
            comodatos.append(cm)
        return {'folio': folio, 'nombre': nombre_completo, 'citas': citas, 'pagos': pagos, 'comodatos': comodatos}


def _listar_membresias_proximas_a_vencer(dias: int = 30, _current_user: CurrentUser | None = None, limit: int=500, offset: int=0):
    """Beneficiarios con membresía que vence en los próximos N días."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    with get_db() as conn:
        _sync_membresias_vencidas(conn)
        cur = conn.cursor()
        cur.execute("""
            SELECT p.*
              FROM PACIENTE p
             WHERE p.ACTIVO = 'S'
               AND p.ESTATUS_REGISTRO = 'APROBADO'
               AND p.MEMBRESIA_ESTATUS = 'ACTIVO'
               AND p.FECHA_VENCIMIENTO_MEMBRESIA IS NOT NULL
               AND p.FECHA_VENCIMIENTO_MEMBRESIA <= TRUNC(SYSDATE) + :dias
           ORDER BY p.FECHA_VENCIMIENTO_MEMBRESIA ASC
           OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
       """, {'dias': dias, 'offset': safe_offset, 'limit': safe_limit})
        rows = rows_to_dicts(cur)
        patient_ids = [r['id_paciente'] for r in rows]
        tipos_map = _batch_fetch_tipos_espina(conn, patient_ids)
        return [_patient_row_to_response(row, tipos_map=tipos_map) for row in rows]


def _renovar_membresia(folio: str, data: dict, current_user: CurrentUser | None = None):
    """Renueva la membresía por 12 meses y crea el cobro correspondiente."""
    from app.infrastructure.persistence.sp_helpers import make_number_list, make_varchar_list, make_decimal_list, sp_error_to_http
    import oracledb

    monto_total = float(data.get('monto_total', 0))
    exento_pago = data.get('exento_pago', 'N')
    metodos_pago = data.get('metodos_pago', [])
    id_usuario = (current_user or {}).get('id_usuario', 1)
    if monto_total <= 0:
        raise ValidationError('El monto de la cuota debe ser mayor a 0.')

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio AND ACTIVO = 'S'",
            {'folio': folio}
        )
        row = cur.fetchone()
        if row is None:
            raise NotFoundError(_MSG_BENEFICIARIO_NO_ENCONTRADO)
        id_paciente = row[0]

        # 1. Actualizar fechas de membresía
        cur.execute("""
            UPDATE PACIENTE
               SET MEMBRESIA_ESTATUS           = 'ACTIVO',
                   FECHA_INICIO_MEMBRESIA      = TRUNC(SYSDATE),
                   FECHA_VENCIMIENTO_MEMBRESIA = ADD_MONTHS(TRUNC(SYSDATE), 12)
             WHERE ID_PACIENTE = :id
        """, {'id': id_paciente})

        # 2. Crear cobro vía SP (igual que cualquier venta normal)
        metodos_ids   = [int(mp['id_metodo_pago']) for mp in metodos_pago if mp.get('monto', 0) > 0]
        metodos_montos = [float(mp['monto']) for mp in metodos_pago if mp.get('monto', 0) > 0]
        total_pagado = round(sum(metodos_montos), 2)
        if exento_pago != 'S' and not metodos_ids:
            raise ValidationError('Agrega al menos un método de pago.')
        if exento_pago != 'S' and total_pagado > round(monto_total, 2):
            raise ValidationError('La suma de los métodos de pago no puede exceder el monto de la cuota.')

        linea_tipos_arr = make_varchar_list(conn, ['SERVICIO'])
        linea_ids_arr = make_number_list(conn, [0])
        linea_descs_arr = make_varchar_list(conn, ['Renovación de membresía'])
        linea_precios_arr = make_decimal_list(conn, [monto_total])
        linea_cantidades_arr = make_number_list(conn, [1])
        metodos_arr = make_number_list(conn, [] if exento_pago == 'S' else metodos_ids)
        montos_arr = make_decimal_list(conn, [] if exento_pago == 'S' else metodos_montos)

        id_venta_out = cur.var(int)
        folio_venta_out = cur.var(str)
        try:
            cur.callproc('SP_REGISTRAR_VENTA_COMPLETA', [
                id_paciente,
                id_usuario,
                monto_total,
                exento_pago,
                linea_tipos_arr,
                linea_ids_arr,
                linea_descs_arr,
                linea_precios_arr,
                linea_cantidades_arr,
                metodos_arr,
                montos_arr,
                id_venta_out,
                folio_venta_out,
            ])
        except oracledb.DatabaseError as exc:
            raise sp_error_to_http(exc, {}, default_detail='No se pudo registrar el cobro de renovación')

        folio_venta = folio_venta_out.getvalue()
        conn.commit()

        # 3. Devolver paciente actualizado
        cur.execute(_SELECT_PACIENTE_BY_ID, {'id': id_paciente})
        patient_row = row_to_dict(cur)
        return {
            'paciente': _patient_row_to_response(patient_row, conn),
            'folio_venta': folio_venta,
        }


def _mapa_beneficiarios(_current_user=None):
    """Devuelve todos los beneficiarios activos con sus coordenadas geocodificadas para el mapa."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            # Try with geocoding columns first; fall back if migration hasn't run yet
            try:
                cur.execute("""
                    SELECT p.ID_PACIENTE,
                           p.FOLIO                AS folio_paciente,
                           TRIM(p.NOMBRE || ' ' || NVL(p.APELLIDO_PATERNO, '') || ' ' || NVL(p.APELLIDO_MATERNO, '')) AS nombre_completo,
                           p.CIUDAD,
                           p.ESTADO,
                           p.TIPO_CUOTA,
                           p.LATITUD,
                           p.LONGITUD,
                           p.GEOCODIFICADO
                      FROM PACIENTE p
                     WHERE p.ACTIVO = 'S'
                       AND p.ESTATUS_REGISTRO = 'APROBADO'
                     ORDER BY p.NOMBRE, p.APELLIDO_PATERNO
                """)
            except oracledb.DatabaseError:
                # Geocoding columns not yet added — return rows without them
                cur.execute("""
                    SELECT p.ID_PACIENTE,
                           p.FOLIO                AS folio_paciente,
                           TRIM(p.NOMBRE || ' ' || NVL(p.APELLIDO_PATERNO, '') || ' ' || NVL(p.APELLIDO_MATERNO, '')) AS nombre_completo,
                           p.CIUDAD,
                           p.ESTADO,
                           p.TIPO_CUOTA,
                           NULL AS LATITUD,
                           NULL AS LONGITUD,
                           'N'  AS GEOCODIFICADO
                      FROM PACIENTE p
                     WHERE p.ACTIVO = 'S'
                       AND p.ESTATUS_REGISTRO = 'APROBADO'
                     ORDER BY p.NOMBRE, p.APELLIDO_PATERNO
                """)
            cols = [c[0].lower() for c in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]
    except oracledb.DatabaseError:
        logger.exception('Error en _mapa_beneficiarios')
        raise InternalError('Error interno del servidor')


def _expirar_membresias_vencidas() -> int:
    with get_db() as conn:
        return _sync_membresias_vencidas(conn)


def _get_sin_geocodificar(limit: int) -> list[dict]:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT ID_PACIENTE, CIUDAD, ESTADO
                 FROM PACIENTE
                WHERE (GEOCODIFICADO = 'N' OR GEOCODIFICADO IS NULL)
                  AND (CIUDAD IS NOT NULL OR ESTADO IS NOT NULL)
                  AND ROWNUM <= :limit""",
            {"limit": limit},
        )
        return [{"id": r[0], "ciudad": r[1], "estado": r[2]} for r in cur.fetchall()]


def _guardar_geocodificacion(id_paciente: int, lat: float, lon: float) -> None:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE PACIENTE SET LATITUD=:lat, LONGITUD=:lon, GEOCODIFICADO='S' WHERE ID_PACIENTE=:id",
            {"lat": lat, "lon": lon, "id": id_paciente},
        )
        conn.commit()


def _marcar_geocodificacion_fallida(id_paciente: int) -> None:
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE PACIENTE SET GEOCODIFICADO='F' WHERE ID_PACIENTE=:id",
            {"id": id_paciente},
        )
        conn.commit()


class OracleBeneficiariosRepository(BeneficiariosRepository):
    def listar_tipos_espina(self, current_user=None):
        return _listar_tipos_espina(current_user)

    def stats_beneficiarios(self, current_user=None):
        return _stats_beneficiarios(current_user)

    def dashboard_stats(self, current_user=None):
        return _dashboard_stats(current_user)

    def listar_beneficiarios(self, nombre=None, estado=None, genero=None, busqueda=None, membresia_estatus=None, tipo_cuota=None, activo='S', current_user=None, limit=100, offset=0):
        return _listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, activo, current_user, limit, offset)

    def obtener_beneficiario(self, folio, current_user=None):
        return _obtener_beneficiario(folio, current_user)

    def crear_beneficiario(self, data, current_user=None):
        return _crear_beneficiario(data, current_user)

    def actualizar_beneficiario(self, folio, data, current_user=None):
        return _actualizar_beneficiario(folio, data, current_user)

    def eliminar_beneficiario(self, folio, current_user=None):
        return _eliminar_beneficiario(folio, current_user)

    def reactivar_beneficiario(self, folio, current_user=None):
        return _reactivar_beneficiario(folio, current_user)

    def historial_beneficiario(self, folio, current_user=None, limit_citas=100, offset_citas=0, limit_pagos=100, offset_pagos=0, limit_comodatos=100, offset_comodatos=0):
        return _historial_beneficiario(folio, current_user, limit_citas, offset_citas, limit_pagos, offset_pagos, limit_comodatos, offset_comodatos)

    def listar_membresias_proximas_a_vencer(self, dias=30, current_user=None, limit=500, offset=0):
        return _listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

    def renovar_membresia(self, folio, data, current_user=None):
        return _renovar_membresia(folio, data, current_user)

    def mapa_beneficiarios(self, current_user=None):
        return _mapa_beneficiarios(current_user)

    def expirar_membresias_vencidas(self) -> int:
        return _expirar_membresias_vencidas()

    def get_sin_geocodificar(self, limit: int) -> list[dict]:
        return _get_sin_geocodificar(limit)

    def guardar_geocodificacion(self, id_paciente: int, lat: float, lon: float) -> None:
        _guardar_geocodificacion(id_paciente, lat, lon)

    def marcar_geocodificacion_fallida(self, id_paciente: int) -> None:
        _marcar_geocodificacion_fallida(id_paciente)
