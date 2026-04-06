from datetime import datetime, date
import logging
from fastapi import APIRouter, HTTPException, Depends
from app.core.security import get_current_user, require_role
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.core.crypto import encrypt, decrypt_row, DOCTOR_ENCRYPTED_FIELDS
from app.schemas.schemas import (
    DoctorCreate,
    DoctorResponse,
    DisponibilidadCreate,
    DisponibilidadResponse,
)

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


def _get_servicios_for_doctor(conn, id_doctor: int) -> list[dict]:
    """Fetch services linked to a doctor via DOCTOR_SERVICIO JOIN SERVICIO."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT s.ID_SERVICIO, s.NOMBRE "
        "FROM DOCTOR_SERVICIO ds "
        "JOIN SERVICIO s ON ds.ID_SERVICIO = s.ID_SERVICIO "
        "WHERE ds.ID_DOCTOR = :id_doctor",
        {"id_doctor": id_doctor},
    )
    return [_serialize(r) for r in rows_to_dicts(cursor)]


def _doctor_with_servicios(conn, doctor_row: dict) -> dict:
    """Attach servicios list to a doctor dict, descifrar datos sensibles."""
    d = _serialize(decrypt_row(doctor_row, DOCTOR_ENCRYPTED_FIELDS))
    d["servicios"] = _get_servicios_for_doctor(conn, d["id_doctor"])
    return d


def _sync_doctor_servicios(conn, id_doctor: int, servicio_ids: list[int]):
    """Replace DOCTOR_SERVICIO rows for a doctor."""
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM DOCTOR_SERVICIO WHERE ID_DOCTOR = :id_doctor",
        {"id_doctor": id_doctor},
    )
    for sid in servicio_ids:
        cursor.execute(
            "INSERT INTO DOCTOR_SERVICIO (ID_DOCTOR, ID_SERVICIO) "
            "VALUES (:id_doctor, :id_servicio)",
            {"id_doctor": id_doctor, "id_servicio": sid},
        )


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/hoy")
def doctor_del_dia(current_user: dict = Depends(get_current_user)):
    """Obtener el doctor asignado para hoy según DISPONIBILIDAD_DOCTOR."""
    hoy = date.today().isoformat()
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT d.ID_DOCTOR, d.NOMBRE, d.APELLIDO_PATERNO, d.APELLIDO_MATERNO, "
                "d.ESPECIALIDAD, d.TELEFONO, d.CORREO, d.ACTIVO, d.FECHA_REGISTRO, "
                "dd.HORA_INICIO, dd.HORA_FIN "
                "FROM DISPONIBILIDAD_DOCTOR dd "
                "JOIN DOCTOR d ON d.ID_DOCTOR = dd.ID_DOCTOR "
                "WHERE TRUNC(dd.FECHA) = TO_DATE(:fecha, 'YYYY-MM-DD') "
                "AND dd.DISPONIBLE = 'S' AND d.ACTIVO = 'S' "
                "ORDER BY dd.HORA_INICIO "
                "FETCH FIRST 1 ROWS ONLY",
                {"fecha": hoy},
            )
            row = row_to_dict(cursor)
            if row is None:
                return {"doctor": None, "hora_inicio": None, "hora_fin": None}
            hora_inicio = row.pop("hora_inicio", None)
            hora_fin = row.pop("hora_fin", None)
            doctor = _doctor_with_servicios(conn, row)
            doctor["hora_inicio"] = hora_inicio.isoformat() if isinstance(hora_inicio, datetime) else str(hora_inicio) if hora_inicio else None
            doctor["hora_fin"] = hora_fin.isoformat() if isinstance(hora_fin, datetime) else str(hora_fin) if hora_fin else None
            return {"doctor": doctor, "hora_inicio": doctor["hora_inicio"], "hora_fin": doctor["hora_fin"]}
    except Exception as e:
        logger.exception("Error al consultar doctor del día")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("")
def listar_doctores(current_user: dict = Depends(get_current_user)):
    """Listar todos los doctores con sus servicios."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, "
                "ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO "
                "FROM DOCTOR ORDER BY ID_DOCTOR"
            )
            rows = rows_to_dicts(cursor)
            return [_doctor_with_servicios(conn, r) for r in rows]
    except Exception as e:
        logger.exception("Error al consultar doctores")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/{id_doctor}")
def obtener_doctor(id_doctor: int, current_user: dict = Depends(get_current_user)):
    """Obtener un doctor por ID."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, "
                "ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO "
                "FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            row = row_to_dict(cursor)
            if row is None:
                raise HTTPException(status_code=404, detail="Doctor no encontrado")
            return _doctor_with_servicios(conn, row)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al consultar doctor")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("", status_code=201)
def crear_doctor(data: DoctorCreate, current_user: dict = Depends(require_role("ADMINISTRADOR"))):
    """Crear nuevo doctor con servicios asociados."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            id_var = cursor.var(int)
            cursor.execute(
                "INSERT INTO DOCTOR (NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, "
                "ESPECIALIDAD, TELEFONO, CORREO, ACTIVO) "
                "VALUES (:nombre, :ap, :am, :esp, :tel, :correo, :activo) "
                "RETURNING ID_DOCTOR INTO :id_out",
                {
                    "nombre": data.nombre,
                    "ap": data.apellido_paterno,
                    "am": data.apellido_materno,
                    "esp": data.especialidad,
                    "tel": encrypt(data.telefono),
                    "correo": encrypt(data.correo),
                    "activo": data.activo,
                    "id_out": id_var,
                },
            )
            new_id = id_var.getvalue()[0]

            if data.servicios:
                _sync_doctor_servicios(conn, new_id, data.servicios)

            conn.commit()

            # Fetch the newly created doctor to return
            cursor.execute(
                "SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, "
                "ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO "
                "FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": new_id},
            )
            row = row_to_dict(cursor)
            return _doctor_with_servicios(conn, row)
    except Exception as e:
        logger.exception("Error al crear doctor")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put("/{id_doctor}")
def actualizar_doctor(
    id_doctor: int,
    data: DoctorCreate,
    current_user: dict = Depends(require_role("ADMINISTRADOR")),
):
    """Actualizar doctor existente y sus servicios."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check doctor exists
            cursor.execute(
                "SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Doctor no encontrado")

            cursor.execute(
                "UPDATE DOCTOR SET NOMBRE = :nombre, APELLIDO_PATERNO = :ap, "
                "APELLIDO_MATERNO = :am, ESPECIALIDAD = :esp, TELEFONO = :tel, "
                "CORREO = :correo, ACTIVO = :activo "
                "WHERE ID_DOCTOR = :id_doctor",
                {
                    "nombre": data.nombre,
                    "ap": data.apellido_paterno,
                    "am": data.apellido_materno,
                    "esp": data.especialidad,
                    "tel": encrypt(data.telefono),
                    "correo": encrypt(data.correo),
                    "activo": data.activo,
                    "id_doctor": id_doctor,
                },
            )

            if data.servicios is not None:
                _sync_doctor_servicios(conn, id_doctor, data.servicios)

            conn.commit()

            # Return updated doctor
            cursor.execute(
                "SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, "
                "ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO "
                "FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            row = row_to_dict(cursor)
            return _doctor_with_servicios(conn, row)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al actualizar doctor")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{id_doctor}")
def desactivar_doctor(id_doctor: int, current_user: dict = Depends(require_role("ADMINISTRADOR"))):
    """Desactivar doctor (soft delete, ACTIVO = 'N')."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Doctor no encontrado")

            cursor.execute(
                "UPDATE DOCTOR SET ACTIVO = 'N' WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            conn.commit()
            return {"message": "Doctor desactivado", "id_doctor": id_doctor}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al desactivar doctor")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# ──────────────────────── DISPONIBILIDAD ─────────────────────────


@router.get("/{id_doctor}/disponibilidad")
def obtener_disponibilidad(id_doctor: int, current_user: dict = Depends(get_current_user)):
    """Obtener disponibilidad de un doctor."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check doctor exists
            cursor.execute(
                "SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Doctor no encontrado")

            cursor.execute(
                "SELECT ID_DISPONIBILIDAD, ID_DOCTOR, FECHA, HORA_INICIO, HORA_FIN, "
                "DISPONIBLE, FECHA_REGISTRO "
                "FROM DISPONIBILIDAD_DOCTOR "
                "WHERE ID_DOCTOR = :id_doctor ORDER BY FECHA, HORA_INICIO",
                {"id_doctor": id_doctor},
            )
            rows = rows_to_dicts(cursor)
            return [_serialize(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al consultar disponibilidad")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("/{id_doctor}/disponibilidad", status_code=201)
def crear_disponibilidad(
    id_doctor: int,
    data: DisponibilidadCreate,
    current_user: dict = Depends(get_current_user),
):
    """Crear un slot de disponibilidad para un doctor."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check doctor exists
            cursor.execute(
                "SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Doctor no encontrado")

            id_var = cursor.var(int)
            cursor.execute(
                "INSERT INTO DISPONIBILIDAD_DOCTOR "
                "(ID_DOCTOR, FECHA, HORA_INICIO, HORA_FIN, DISPONIBLE) "
                "VALUES (:id_doctor, :fecha, :hora_inicio, :hora_fin, :disponible) "
                "RETURNING ID_DISPONIBILIDAD INTO :id_out",
                {
                    "id_doctor": id_doctor,
                    "fecha": data.fecha,
                    "hora_inicio": data.hora_inicio,
                    "hora_fin": data.hora_fin,
                    "disponible": data.disponible,
                    "id_out": id_var,
                },
            )
            new_id = id_var.getvalue()[0]
            conn.commit()

            # Return the created slot
            cursor.execute(
                "SELECT ID_DISPONIBILIDAD, ID_DOCTOR, FECHA, HORA_INICIO, HORA_FIN, "
                "DISPONIBLE, FECHA_REGISTRO "
                "FROM DISPONIBILIDAD_DOCTOR WHERE ID_DISPONIBILIDAD = :id_disp",
                {"id_disp": new_id},
            )
            row = row_to_dict(cursor)
            return _serialize(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al crear disponibilidad")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{id_doctor}/disponibilidad/{id_disponibilidad}")
def eliminar_disponibilidad(
    id_doctor: int,
    id_disponibilidad: int,
    current_user: dict = Depends(get_current_user),
):
    """Eliminar un slot de disponibilidad de un doctor."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM DISPONIBILIDAD_DOCTOR "
                "WHERE ID_DISPONIBILIDAD = :id_disp AND ID_DOCTOR = :id_doctor",
                {"id_disp": id_disponibilidad, "id_doctor": id_doctor},
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Slot de disponibilidad no encontrado")
            conn.commit()
            return {"message": "Disponibilidad eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al eliminar disponibilidad")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


# ──────────────────────── SERVICIOS POR DOCTOR ─────────────────────────


@router.get("/{id_doctor}/servicios")
def obtener_servicios_doctor(id_doctor: int, current_user: dict = Depends(get_current_user)):
    """Obtener los servicios asociados a un doctor."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check doctor exists
            cursor.execute(
                "SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor",
                {"id_doctor": id_doctor},
            )
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Doctor no encontrado")

            return _get_servicios_for_doctor(conn, id_doctor)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al consultar servicios del doctor")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
