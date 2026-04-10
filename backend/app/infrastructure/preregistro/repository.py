from datetime import datetime, date
import logging
import os
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile
from typing import Optional
from app.core.config import settings
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.privacy.crypto import encrypt, decrypt_row, PACIENTE_ENCRYPTED_FIELDS
from app.schemas.schemas import PreRegistroCreate
logger = logging.getLogger(__name__)
UPLOAD_DIR = Path(__file__).resolve().parents[3] / 'uploads' / 'documentos'
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _serialize(row: dict) -> dict:
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, str):
            result[key] = value.strip()
        else:
            result[key] = value
    return result
_BASE_SQL = '\n    SELECT ID_PACIENTE, FOLIO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,\n           FECHA_NACIMIENTO, GENERO, CURP,\n           ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO, NOMBRE_PADRE_MADRE,\n           DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,\n           TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,\n           TIPO_CUOTA, NOTAS_ADICIONALES, PASO_ACTUAL, ESTATUS_REGISTRO,\n           FECHA_REGISTRO, EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,\n           TIPO_SANGRE, USA_VALVULA\n    FROM PACIENTE\n'

def listar_preregistros(estatus: Optional[str]=None, current_user: dict=None):
    """Listar todos los pre-registros (pacientes pendientes de aprobación)."""
    sql = _BASE_SQL + " WHERE ESTATUS_REGISTRO IN ('PENDIENTE', 'RECHAZADO')"
    params: dict = {}
    if estatus:
        sql = _BASE_SQL + ' WHERE ESTATUS_REGISTRO = :estatus'
        params['estatus'] = estatus
    sql += ' ORDER BY FECHA_REGISTRO DESC'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(decrypt_row(r, PACIENTE_ENCRYPTED_FIELDS)) for r in rows]

def crear_preregistro(data: PreRegistroCreate):
    """Enviar un nuevo pre-registro (endpoint público, sin autenticación)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE')
        next_id = cursor.fetchone()[0]
        folio = f'PRE-{next_id:06d}'
        id_var = cursor.var(int)
        cursor.execute("INSERT INTO PACIENTE\n               (FOLIO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,\n                FECHA_NACIMIENTO, GENERO, CURP,\n                ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO, NOMBRE_PADRE_MADRE,\n                DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,\n                TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,\n                EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,\n                TIPO_SANGRE, USA_VALVULA,\n                TIPO_CUOTA, NOTAS_ADICIONALES, PASO_ACTUAL,\n                ESTATUS_REGISTRO, ACTIVO, FECHA_REGISTRO)\n               VALUES (:folio, :nombre, :ap, :am,\n                       TO_DATE(:fecha_nac, 'YYYY-MM-DD'), :genero, :curp,\n                       :estado_nac, :hospital, :padre_madre,\n                       :direccion, :colonia, :ciudad, :estado, :cp,\n                       :tel_casa, :tel_cel, :correo,\n                       :emergencia_avisar, :tel_emergencia,\n                       :tipo_sangre, :usa_valvula,\n                       :tipo_cuota, :notas, :paso,\n                       'PENDIENTE', 'S', SYSDATE)\n               RETURNING ID_PACIENTE INTO :id_out", {'folio': folio, 'nombre': data.nombre, 'ap': data.apellido_paterno, 'am': data.apellido_materno, 'fecha_nac': data.fecha_nacimiento, 'genero': data.genero, 'curp': encrypt(data.curp), 'estado_nac': data.estado_nacimiento, 'hospital': encrypt(data.hospital_nacimiento), 'padre_madre': encrypt(data.nombre_padre_madre), 'direccion': encrypt(data.direccion), 'colonia': data.colonia, 'ciudad': data.ciudad, 'estado': data.estado, 'cp': data.codigo_postal, 'tel_casa': encrypt(data.telefono_casa), 'tel_cel': encrypt(data.telefono_celular), 'correo': encrypt(data.correo_electronico), 'emergencia_avisar': encrypt(data.en_emergencia_avisar_a), 'tel_emergencia': encrypt(data.telefono_emergencia), 'tipo_sangre': encrypt(data.tipo_sangre), 'usa_valvula': data.usa_valvula or 'N', 'tipo_cuota': data.tipo_cuota, 'notas': encrypt(data.notas_adicionales), 'paso': data.paso_actual or 1, 'id_out': id_var})
        new_id = id_var.getvalue()[0]
        if data.tipos_espina:
            for tid in data.tipos_espina:
                cursor.execute('INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO) VALUES (:id_pac, :id_tipo, SYSDATE)', {'id_pac': new_id, 'id_tipo': tid})
        conn.commit()
    return _fetch_preregistro(new_id)

def _fetch_preregistro(id_paciente: int) -> dict:
    sql = _BASE_SQL + ' WHERE ID_PACIENTE = :id'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id': id_paciente})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Pre-registro no encontrado')
    return _serialize(decrypt_row(row, PACIENTE_ENCRYPTED_FIELDS))

def listar_tipos_espina_publico():
    """Listar tipos de espina bífida (endpoint público para pre-registro)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_TIPO_ESPINA, NOMBRE, DESCRIPCION FROM TIPO_ESPINA_BIFIDA WHERE ACTIVO = 'S' ORDER BY ID_TIPO_ESPINA")
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def listar_tipos_documento_publico():
    """Listar tipos de documento (endpoint público para pre-registro)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_TIPO_DOCUMENTO, NOMBRE, DESCRIPCION FROM TIPO_DOCUMENTO WHERE ACTIVO = 'S' ORDER BY ID_TIPO_DOCUMENTO")
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_preregistro(id_paciente: int):
    """Obtener detalle de un pre-registro."""
    return _fetch_preregistro(id_paciente)

def actualizar_preregistro(id_paciente: int, data: PreRegistroCreate):
    """Actualizar un pre-registro existente (formulario multi-paso)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_PACIENTE FROM PACIENTE WHERE ID_PACIENTE = :id AND ESTATUS_REGISTRO = 'PENDIENTE'", {'id': id_paciente})
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail='Pre-registro no encontrado')
        cursor.execute("UPDATE PACIENTE SET\n                NOMBRE = :nombre, APELLIDO_PATERNO = :ap, APELLIDO_MATERNO = :am,\n                FECHA_NACIMIENTO = TO_DATE(:fecha_nac, 'YYYY-MM-DD'),\n                GENERO = :genero, CURP = :curp,\n                ESTADO_NACIMIENTO = :estado_nac, HOSPITAL_NACIMIENTO = :hospital,\n                NOMBRE_PADRE_MADRE = :padre_madre,\n                DIRECCION = :direccion, COLONIA = :colonia, CIUDAD = :ciudad,\n                ESTADO = :estado, CODIGO_POSTAL = :cp,\n                TELEFONO_CASA = :tel_casa, TELEFONO_CELULAR = :tel_cel,\n                CORREO_ELECTRONICO = :correo,\n                EN_EMERGENCIA_AVISAR_A = :emergencia_avisar,\n                TELEFONO_EMERGENCIA = :tel_emergencia,\n                TIPO_SANGRE = :tipo_sangre, USA_VALVULA = :usa_valvula,\n                TIPO_CUOTA = :tipo_cuota, NOTAS_ADICIONALES = :notas,\n                PASO_ACTUAL = :paso\n               WHERE ID_PACIENTE = :id", {'nombre': data.nombre, 'ap': data.apellido_paterno, 'am': data.apellido_materno, 'fecha_nac': data.fecha_nacimiento, 'genero': data.genero, 'curp': encrypt(data.curp), 'estado_nac': data.estado_nacimiento, 'hospital': encrypt(data.hospital_nacimiento), 'padre_madre': encrypt(data.nombre_padre_madre), 'direccion': encrypt(data.direccion), 'colonia': data.colonia, 'ciudad': data.ciudad, 'estado': data.estado, 'cp': data.codigo_postal, 'tel_casa': encrypt(data.telefono_casa), 'tel_cel': encrypt(data.telefono_celular), 'correo': encrypt(data.correo_electronico), 'emergencia_avisar': encrypt(data.en_emergencia_avisar_a), 'tel_emergencia': encrypt(data.telefono_emergencia), 'tipo_sangre': encrypt(data.tipo_sangre), 'usa_valvula': data.usa_valvula or 'N', 'tipo_cuota': data.tipo_cuota, 'notas': encrypt(data.notas_adicionales), 'paso': data.paso_actual or 1, 'id': id_paciente})
        if data.tipos_espina is not None:
            cursor.execute('DELETE FROM PACIENTE_TIPO_ESPINA WHERE ID_PACIENTE = :id', {'id': id_paciente})
            for tid in data.tipos_espina:
                cursor.execute('INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO) VALUES (:id_pac, :id_tipo, SYSDATE)', {'id_pac': id_paciente, 'id_tipo': tid})
        conn.commit()
    return _fetch_preregistro(id_paciente)

def aprobar_preregistro(id_paciente: int, current_user: dict=None):
    """Aprobar un pre-registro y convertirlo en beneficiario aprobado."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ESTATUS_REGISTRO FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail='Pre-registro no encontrado')
        estatus = row[0].strip() if row[0] else None
        if estatus == 'APROBADO':
            raise HTTPException(status_code=400, detail='Este pre-registro ya fue aprobado')
        if estatus != 'PENDIENTE':
            raise HTTPException(status_code=400, detail='Solo se pueden aprobar pre-registros pendientes')
        cursor.execute('SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE')
        folio_num = cursor.fetchone()[0]
        new_folio = f'BEN-{folio_num:06d}'
        cursor.execute("UPDATE PACIENTE SET\n                ESTATUS_REGISTRO = 'APROBADO',\n                FOLIO = :folio,\n                MEMBRESIA_ESTATUS = 'ACTIVO',\n                FECHA_ALTA = SYSDATE\n               WHERE ID_PACIENTE = :id", {'folio': new_folio, 'id': id_paciente})
        conn.commit()
    preregistro = _fetch_preregistro(id_paciente)
    return {'message': 'Pre-registro aprobado exitosamente', 'preregistro': preregistro}

async def subir_documento(id_paciente: int, id_tipo_documento: int=..., archivo: UploadFile=...):
    """Subir un documento para un pre-registro."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_PACIENTE FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail='Pre-registro no encontrado')
    original_name = archivo.filename or ''
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f'Tipo de archivo no permitido. Extensiones válidas: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}')
    content = await archivo.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f'El archivo excede el tamaño máximo permitido ({settings.MAX_UPLOAD_SIZE // (1024 * 1024)} MB)')
    allowed_content_types = {'.pdf': ['application/pdf'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'], '.doc': ['application/msword'], '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
    if archivo.content_type and ext in allowed_content_types:
        if archivo.content_type not in allowed_content_types[ext]:
            raise HTTPException(status_code=400, detail='El tipo de contenido del archivo no coincide con la extensión')
    unique_name = f'{id_paciente}_{uuid.uuid4().hex}{ext}'
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, 'wb') as f:
        f.write(content)
    with get_db() as conn:
        cursor = conn.cursor()
        id_var = cursor.var(int)
        cursor.execute("INSERT INTO DOCUMENTO_PACIENTE\n               (ID_PACIENTE, ID_TIPO_DOCUMENTO, NOMBRE_ARCHIVO, RUTA_ARCHIVO, FORMATO_ARCHIVO, ACTIVO, FECHA_CARGA)\n               VALUES (:id_pac, :id_tipo, :nombre, :ruta, :formato, 'S', SYSDATE)\n               RETURNING ID_DOCUMENTO INTO :id_out", {'id_pac': id_paciente, 'id_tipo': id_tipo_documento, 'nombre': archivo.filename, 'ruta': unique_name, 'formato': ext.lstrip('.').upper() if ext else 'OTRO', 'id_out': id_var})
        new_id = id_var.getvalue()[0]
        conn.commit()
    return {'id_documento': new_id, 'nombre_archivo': archivo.filename, 'formato': ext.lstrip('.').upper() if ext else 'OTRO'}

def listar_documentos(id_paciente: int):
    """Listar documentos de un pre-registro."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT dp.ID_DOCUMENTO, dp.ID_TIPO_DOCUMENTO, td.NOMBRE AS TIPO_NOMBRE,\n                      dp.NOMBRE_ARCHIVO, dp.FORMATO_ARCHIVO, dp.FECHA_CARGA\n               FROM DOCUMENTO_PACIENTE dp\n               LEFT JOIN TIPO_DOCUMENTO td ON td.ID_TIPO_DOCUMENTO = dp.ID_TIPO_DOCUMENTO\n               WHERE dp.ID_PACIENTE = :id AND dp.ACTIVO = 'S'\n               ORDER BY dp.FECHA_CARGA DESC", {'id': id_paciente})
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def eliminar_documento(id_paciente: int, id_documento: int):
    """Eliminar (soft delete) un documento."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE DOCUMENTO_PACIENTE SET ACTIVO = 'N' WHERE ID_DOCUMENTO = :id_doc AND ID_PACIENTE = :id_pac", {'id_doc': id_documento, 'id_pac': id_paciente})
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Documento no encontrado')
        conn.commit()
    return {'message': 'Documento eliminado correctamente'}

def rechazar_preregistro(id_paciente: int, current_user: dict=None):
    """Rechazar un pre-registro."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ESTATUS_REGISTRO FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail='Pre-registro no encontrado')
        cursor.execute("UPDATE PACIENTE SET ESTATUS_REGISTRO = 'RECHAZADO' WHERE ID_PACIENTE = :id", {'id': id_paciente})
        conn.commit()
    preregistro = _fetch_preregistro(id_paciente)
    return {'message': 'Pre-registro rechazado', 'preregistro': preregistro}


class OraclePreregistroRepository:
    def listar_preregistros(self, *args, **kwargs):
        return listar_preregistros(*args, **kwargs)

    def crear_preregistro(self, *args, **kwargs):
        return crear_preregistro(*args, **kwargs)

    def listar_tipos_espina_publico(self, *args, **kwargs):
        return listar_tipos_espina_publico(*args, **kwargs)

    def listar_tipos_documento_publico(self, *args, **kwargs):
        return listar_tipos_documento_publico(*args, **kwargs)

    def obtener_preregistro(self, *args, **kwargs):
        return obtener_preregistro(*args, **kwargs)

    def actualizar_preregistro(self, *args, **kwargs):
        return actualizar_preregistro(*args, **kwargs)

    def aprobar_preregistro(self, *args, **kwargs):
        return aprobar_preregistro(*args, **kwargs)

    async def subir_documento(self, *args, **kwargs):
        return await subir_documento(*args, **kwargs)

    def listar_documentos(self, *args, **kwargs):
        return listar_documentos(*args, **kwargs)

    def eliminar_documento(self, *args, **kwargs):
        return eliminar_documento(*args, **kwargs)

    def rechazar_preregistro(self, *args, **kwargs):
        return rechazar_preregistro(*args, **kwargs)
