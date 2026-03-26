from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.core.security import get_current_user
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.schemas.schemas import (
    DoctorCreate,
    DoctorResponse,
    DisponibilidadCreate,
    DisponibilidadResponse,
)

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
    """Attach servicios list to a doctor dict."""
    d = _serialize(doctor_row)
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
        raise HTTPException(status_code=500, detail=f"Error al consultar doctores: {str(e)}")


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
        raise HTTPException(status_code=500, detail=f"Error al consultar doctor: {str(e)}")


@router.post("", status_code=201)
def crear_doctor(data: DoctorCreate, current_user: dict = Depends(get_current_user)):
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
                    "tel": data.telefono,
                    "correo": data.correo,
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
        raise HTTPException(status_code=500, detail=f"Error al crear doctor: {str(e)}")


@router.put("/{id_doctor}")
def actualizar_doctor(
    id_doctor: int,
    data: DoctorCreate,
    current_user: dict = Depends(get_current_user),
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
                    "tel": data.telefono,
                    "correo": data.correo,
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
        raise HTTPException(status_code=500, detail=f"Error al actualizar doctor: {str(e)}")


@router.delete("/{id_doctor}")
def desactivar_doctor(id_doctor: int, current_user: dict = Depends(get_current_user)):
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
        raise HTTPException(status_code=500, detail=f"Error al desactivar doctor: {str(e)}")


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
        raise HTTPException(status_code=500, detail=f"Error al consultar disponibilidad: {str(e)}")


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
        raise HTTPException(status_code=500, detail=f"Error al crear disponibilidad: {str(e)}")


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
        raise HTTPException(status_code=500, detail=f"Error al consultar servicios: {str(e)}")
