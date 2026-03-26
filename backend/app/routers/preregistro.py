from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.core.security import get_current_user
from app.schemas.schemas import PreRegistroCreate

router = APIRouter()


# ──────────────────────────── HELPERS ────────────────────────────


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


_BASE_SQL = """
    SELECT ID_PACIENTE, FOLIO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,
           FECHA_NACIMIENTO, GENERO, CURP,
           ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO, NOMBRE_PADRE_MADRE,
           DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,
           TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
           TIPO_CUOTA, NOTAS_ADICIONALES, PASO_ACTUAL, ESTATUS_REGISTRO,
           FECHA_REGISTRO, EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,
           TIPO_SANGRE, USA_VALVULA
    FROM PACIENTE
"""


# ──────────────────────────── ENDPOINTS ────────────────────────────
# Pre-registro is PUBLIC (no auth required) for POST
# GET/PUT/approve require auth (admin reviewing submissions)


@router.get("")
def listar_preregistros(
    estatus: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar todos los pre-registros (pacientes pendientes de aprobación)."""
    sql = _BASE_SQL + " WHERE ESTATUS_REGISTRO IN ('PENDIENTE', 'RECHAZADO')"
    params: dict = {}

    if estatus:
        sql = _BASE_SQL + " WHERE ESTATUS_REGISTRO = :estatus"
        params["estatus"] = estatus

    sql += " ORDER BY FECHA_REGISTRO DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)

    return [_serialize(r) for r in rows]


@router.post("", status_code=201)
def crear_preregistro(data: PreRegistroCreate):
    """Enviar un nuevo pre-registro (endpoint público, sin autenticación)."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Generate folio for pre-registro
        cursor.execute("SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE")
        next_id = cursor.fetchone()[0]
        folio = f"PRE-{next_id:06d}"

        id_var = cursor.var(int)

        cursor.execute(
            """INSERT INTO PACIENTE
               (FOLIO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,
                FECHA_NACIMIENTO, GENERO, CURP,
                ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO, NOMBRE_PADRE_MADRE,
                DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,
                TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
                EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,
                TIPO_SANGRE, USA_VALVULA,
                TIPO_CUOTA, NOTAS_ADICIONALES, PASO_ACTUAL,
                ESTATUS_REGISTRO, ACTIVO, FECHA_REGISTRO)
               VALUES (:folio, :nombre, :ap, :am,
                       TO_DATE(:fecha_nac, 'YYYY-MM-DD'), :genero, :curp,
                       :estado_nac, :hospital, :padre_madre,
                       :direccion, :colonia, :ciudad, :estado, :cp,
                       :tel_casa, :tel_cel, :correo,
                       :emergencia_avisar, :tel_emergencia,
                       :tipo_sangre, :usa_valvula,
                       :tipo_cuota, :notas, :paso,
                       'PENDIENTE', 'S', SYSDATE)
               RETURNING ID_PACIENTE INTO :id_out""",
            {
                "folio": folio,
                "nombre": data.nombre,
                "ap": data.apellido_paterno,
                "am": data.apellido_materno,
                "fecha_nac": data.fecha_nacimiento,
                "genero": data.genero,
                "curp": data.curp,
                "estado_nac": data.estado_nacimiento,
                "hospital": data.hospital_nacimiento,
                "padre_madre": data.nombre_padre_madre,
                "direccion": data.direccion,
                "colonia": data.colonia,
                "ciudad": data.ciudad,
                "estado": data.estado,
                "cp": data.codigo_postal,
                "tel_casa": data.telefono_casa,
                "tel_cel": data.telefono_celular,
                "correo": data.correo_electronico,
                "emergencia_avisar": data.en_emergencia_avisar_a,
                "tel_emergencia": data.telefono_emergencia,
                "tipo_sangre": data.tipo_sangre,
                "usa_valvula": data.usa_valvula or "N",
                "tipo_cuota": data.tipo_cuota,
                "notas": data.notas_adicionales,
                "paso": data.paso_actual or 1,
                "id_out": id_var,
            },
        )
        new_id = id_var.getvalue()[0]
        conn.commit()

    return _fetch_preregistro(new_id)


def _fetch_preregistro(id_paciente: int) -> dict:
    sql = _BASE_SQL + " WHERE ID_PACIENTE = :id"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {"id": id_paciente})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail="Pre-registro no encontrado")
    return _serialize(row)


@router.get("/{id_paciente}")
def obtener_preregistro(id_paciente: int):
    """Obtener detalle de un pre-registro."""
    return _fetch_preregistro(id_paciente)


@router.put("/{id_paciente}")
def actualizar_preregistro(id_paciente: int, data: PreRegistroCreate):
    """Actualizar un pre-registro existente (formulario multi-paso)."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT ID_PACIENTE FROM PACIENTE WHERE ID_PACIENTE = :id AND ESTATUS_REGISTRO = 'PENDIENTE'",
            {"id": id_paciente},
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")

        cursor.execute(
            """UPDATE PACIENTE SET
                NOMBRE = :nombre, APELLIDO_PATERNO = :ap, APELLIDO_MATERNO = :am,
                FECHA_NACIMIENTO = TO_DATE(:fecha_nac, 'YYYY-MM-DD'),
                GENERO = :genero, CURP = :curp,
                ESTADO_NACIMIENTO = :estado_nac, HOSPITAL_NACIMIENTO = :hospital,
                NOMBRE_PADRE_MADRE = :padre_madre,
                DIRECCION = :direccion, COLONIA = :colonia, CIUDAD = :ciudad,
                ESTADO = :estado, CODIGO_POSTAL = :cp,
                TELEFONO_CASA = :tel_casa, TELEFONO_CELULAR = :tel_cel,
                CORREO_ELECTRONICO = :correo,
                EN_EMERGENCIA_AVISAR_A = :emergencia_avisar,
                TELEFONO_EMERGENCIA = :tel_emergencia,
                TIPO_SANGRE = :tipo_sangre, USA_VALVULA = :usa_valvula,
                TIPO_CUOTA = :tipo_cuota, NOTAS_ADICIONALES = :notas,
                PASO_ACTUAL = :paso
               WHERE ID_PACIENTE = :id""",
            {
                "nombre": data.nombre,
                "ap": data.apellido_paterno,
                "am": data.apellido_materno,
                "fecha_nac": data.fecha_nacimiento,
                "genero": data.genero,
                "curp": data.curp,
                "estado_nac": data.estado_nacimiento,
                "hospital": data.hospital_nacimiento,
                "padre_madre": data.nombre_padre_madre,
                "direccion": data.direccion,
                "colonia": data.colonia,
                "ciudad": data.ciudad,
                "estado": data.estado,
                "cp": data.codigo_postal,
                "tel_casa": data.telefono_casa,
                "tel_cel": data.telefono_celular,
                "correo": data.correo_electronico,
                "emergencia_avisar": data.en_emergencia_avisar_a,
                "tel_emergencia": data.telefono_emergencia,
                "tipo_sangre": data.tipo_sangre,
                "usa_valvula": data.usa_valvula or "N",
                "tipo_cuota": data.tipo_cuota,
                "notas": data.notas_adicionales,
                "paso": data.paso_actual or 1,
                "id": id_paciente,
            },
        )
        conn.commit()

    return _fetch_preregistro(id_paciente)


@router.post("/{id_paciente}/aprobar")
def aprobar_preregistro(
    id_paciente: int,
    current_user: dict = Depends(get_current_user),
):
    """Aprobar un pre-registro y convertirlo en beneficiario aprobado."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT ESTATUS_REGISTRO FROM PACIENTE WHERE ID_PACIENTE = :id",
            {"id": id_paciente},
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")

        estatus = row[0].strip() if row[0] else None
        if estatus == "APROBADO":
            raise HTTPException(status_code=400, detail="Este pre-registro ya fue aprobado")
        if estatus != "PENDIENTE":
            raise HTTPException(status_code=400, detail="Solo se pueden aprobar pre-registros pendientes")

        # Generate proper BEN folio
        cursor.execute("SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE")
        folio_num = cursor.fetchone()[0]
        new_folio = f"BEN-{folio_num:06d}"

        cursor.execute(
            """UPDATE PACIENTE SET
                ESTATUS_REGISTRO = 'APROBADO',
                FOLIO = :folio,
                MEMBRESIA_ESTATUS = 'ACTIVO',
                FECHA_ALTA = SYSDATE
               WHERE ID_PACIENTE = :id""",
            {"folio": new_folio, "id": id_paciente},
        )
        conn.commit()

    preregistro = _fetch_preregistro(id_paciente)
    return {"message": "Pre-registro aprobado exitosamente", "preregistro": preregistro}


@router.post("/{id_paciente}/rechazar")
def rechazar_preregistro(
    id_paciente: int,
    current_user: dict = Depends(get_current_user),
):
    """Rechazar un pre-registro."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT ESTATUS_REGISTRO FROM PACIENTE WHERE ID_PACIENTE = :id",
            {"id": id_paciente},
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Pre-registro no encontrado")

        cursor.execute(
            "UPDATE PACIENTE SET ESTATUS_REGISTRO = 'RECHAZADO' WHERE ID_PACIENTE = :id",
            {"id": id_paciente},
        )
        conn.commit()

    preregistro = _fetch_preregistro(id_paciente)
    return {"message": "Pre-registro rechazado", "preregistro": preregistro}
