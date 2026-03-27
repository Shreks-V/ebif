from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import date, datetime
from app.core.security import get_current_user
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.core.crypto import encrypt, decrypt_row, decrypt_rows, PACIENTE_ENCRYPTED_FIELDS
from app.schemas.schemas import BeneficiarioCreate, BeneficiarioResponse

router = APIRouter()


# ──────────────────────────── HELPERS ────────────────────────────


def _date_to_str(val) -> str | None:
    """Convert a datetime/date object to ISO string, or return None."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return str(val)


def _strip_char(val) -> str | None:
    """Strip trailing spaces from CHAR columns."""
    if val is None:
        return None
    return str(val).strip()


def _fetch_tipos_espina(conn, id_paciente: int) -> list[dict]:
    """Fetch tipos_espina for a given patient."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT te.ID_TIPO_ESPINA, te.NOMBRE
        FROM PACIENTE_TIPO_ESPINA pte
        JOIN TIPO_ESPINA_BIFIDA te ON te.ID_TIPO_ESPINA = pte.ID_TIPO_ESPINA
        WHERE pte.ID_PACIENTE = :id
        """,
        {"id": id_paciente},
    )
    rows = rows_to_dicts(cur)
    return [{"id_tipo_espina": r["id_tipo_espina"], "nombre": _strip_char(r["nombre"])} for r in rows]


def _patient_row_to_response(row: dict, conn) -> dict:
    """Convert a raw patient row dict to the API response format."""
    # Descifrar campos sensibles (LFPDPPP)
    row = decrypt_row(row, PACIENTE_ENCRYPTED_FIELDS)
    row["fecha_nacimiento"] = _date_to_str(row.get("fecha_nacimiento"))
    row["fecha_alta"] = _date_to_str(row.get("fecha_alta"))
    row["fecha_registro"] = _date_to_str(row.get("fecha_registro"))
    # Strip CHAR(1) fields
    for field in ("activo", "usa_valvula", "genero", "membresia_estatus", "tipo_cuota"):
        if field in row and row[field] is not None:
            row[field] = _strip_char(row[field])
    # Fetch tipos_espina
    row["tipos_espina"] = _fetch_tipos_espina(conn, row["id_paciente"])
    return row


def _calculate_age(fecha_nac) -> int:
    if not fecha_nac:
        return 0
    try:
        if isinstance(fecha_nac, str):
            fn = datetime.strptime(fecha_nac, "%Y-%m-%d").date()
        elif isinstance(fecha_nac, datetime):
            fn = fecha_nac.date()
        elif isinstance(fecha_nac, date):
            fn = fecha_nac
        else:
            return 0
        today = date.today()
        return today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))
    except Exception:
        return 0


def _etapa_vida(edad: int) -> str:
    if edad <= 5:
        return "Primera Infancia"
    elif edad <= 11:
        return "Infancia"
    elif edad <= 17:
        return "Adolescencia"
    elif edad <= 29:
        return "Juventud"
    elif edad <= 59:
        return "Adultez"
    else:
        return "Adulto Mayor"


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/tipos-espina")
def listar_tipos_espina(current_user: dict = Depends(get_current_user)):
    """Listar todos los tipos de espina bífida."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT ID_TIPO_ESPINA, NOMBRE, DESCRIPCION, ACTIVO FROM TIPO_ESPINA_BIFIDA WHERE ACTIVO = 'S' ORDER BY ID_TIPO_ESPINA")
        rows = rows_to_dicts(cur)
        for r in rows:
            r["activo"] = _strip_char(r.get("activo"))
            r["nombre"] = _strip_char(r.get("nombre"))
        return rows


@router.get("/stats")
def stats_beneficiarios(current_user: dict = Depends(get_current_user)):
    """Conteo total de beneficiarios."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND ESTATUS_REGISTRO = 'APROBADO'")
        total_activos = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ESTATUS_REGISTRO = 'APROBADO'")
        total = cur.fetchone()[0]
        return {"total": total, "activos": total_activos, "inactivos": total - total_activos}


@router.get("/stats/dashboard")
def dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Estadísticas generales para el dashboard."""
    with get_db() as conn:
        cur = conn.cursor()

        # Total patients
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'")
        total = cur.fetchone()[0]

        # Activos by membresia
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND MEMBRESIA_ESTATUS = 'ACTIVO'")
        activos = cur.fetchone()[0]
        inactivos = total - activos

        # By gender
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND GENERO = 'Masculino'")
        masculino = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND GENERO = 'Femenino'")
        femenino = cur.fetchone()[0]

        # By origin
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND ESTADO = 'Nuevo León'")
        nuevo_leon = cur.fetchone()[0]
        foraneos = total - nuevo_leon

        # Age distribution
        cur.execute("SELECT FECHA_NACIMIENTO FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'")
        fechas = [row[0] for row in cur.fetchall()]
        etapas: dict[str, int] = {}
        for fn in fechas:
            edad = _calculate_age(fn)
            e = _etapa_vida(edad)
            etapas[e] = etapas.get(e, 0) + 1

        return {
            "total": total,
            "activos": activos,
            "inactivos": inactivos,
            "por_genero": {"Masculino": masculino, "Femenino": femenino},
            "por_procedencia": {"Nuevo León": nuevo_leon, "Foráneos": foraneos},
            "por_etapa_vida": etapas,
        }


@router.get("", response_model=list[BeneficiarioResponse])
def listar_beneficiarios(
    nombre: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    genero: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    membresia_estatus: Optional[str] = Query(None),
    tipo_cuota: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar beneficiarios con filtros opcionales."""
    with get_db() as conn:
        conditions = ["p.ACTIVO = 'S'", "p.ESTATUS_REGISTRO = 'APROBADO'"]
        params: dict = {}

        if nombre:
            conditions.append(
                "(LOWER(p.NOMBRE) LIKE :nombre OR LOWER(p.APELLIDO_PATERNO) LIKE :nombre OR LOWER(p.APELLIDO_MATERNO) LIKE :nombre)"
            )
            params["nombre"] = f"%{nombre.lower()}%"

        if estado:
            conditions.append("p.MEMBRESIA_ESTATUS = :estado")
            params["estado"] = estado

        if membresia_estatus:
            conditions.append("p.MEMBRESIA_ESTATUS = :membresia_estatus")
            params["membresia_estatus"] = membresia_estatus

        if tipo_cuota:
            conditions.append("p.TIPO_CUOTA = :tipo_cuota")
            params["tipo_cuota"] = tipo_cuota

        if genero:
            conditions.append("p.GENERO = :genero")
            params["genero"] = genero

        if busqueda:
            # CURP esta cifrado, no se puede buscar con LIKE en SQL
            conditions.append(
                "(LOWER(p.NOMBRE) LIKE :busqueda OR LOWER(p.APELLIDO_PATERNO) LIKE :busqueda "
                "OR LOWER(p.APELLIDO_MATERNO) LIKE :busqueda OR LOWER(p.FOLIO) LIKE :busqueda "
                "OR LOWER(p.CIUDAD) LIKE :busqueda)"
            )
            params["busqueda"] = f"%{busqueda.lower()}%"

        where_clause = " AND ".join(conditions)
        sql = f"SELECT p.* FROM PACIENTE p WHERE {where_clause} ORDER BY p.ID_PACIENTE"

        cur = conn.cursor()
        cur.execute(sql, params)
        rows = rows_to_dicts(cur)

        return [_patient_row_to_response(row, conn) for row in rows]


@router.get("/{folio}", response_model=BeneficiarioResponse)
def obtener_beneficiario(folio: str, current_user: dict = Depends(get_current_user)):
    """Obtener beneficiario por folio."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM PACIENTE WHERE FOLIO = :folio", {"folio": folio})
        row = row_to_dict(cur)
        if row is None:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        return _patient_row_to_response(row, conn)


@router.post("", status_code=201, response_model=BeneficiarioResponse)
def crear_beneficiario(
    data: BeneficiarioCreate, current_user: dict = Depends(get_current_user)
):
    """Crear nuevo beneficiario con folio auto-generado."""
    with get_db() as conn:
        cur = conn.cursor()

        # Generate folio
        cur.execute("SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE")
        next_id = cur.fetchone()[0]
        folio = f"BEN-{next_id:06d}"

        payload = data.model_dump()
        tipos_ids = payload.pop("tipos_espina", None) or []

        # Prepare output variable for RETURNING clause
        out_id = cur.var(int)

        cur.execute(
            """
            INSERT INTO PACIENTE (
                FOLIO, ACTIVO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,
                GENERO, FECHA_NACIMIENTO, CURP, NOMBRE_PADRE_MADRE,
                DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,
                TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,
                EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,
                MUNICIPIO_NACIMIENTO, ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO,
                TIPO_SANGRE, USA_VALVULA, NOTAS_ADICIONALES,
                FECHA_ALTA, MEMBRESIA_ESTATUS, ID_USUARIO_REGISTRO, FECHA_REGISTRO,
                TIPO_CUOTA, ESTATUS_REGISTRO
            ) VALUES (
                :folio, :activo, :nombre, :apellido_paterno, :apellido_materno,
                :genero, TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'), :curp, :nombre_padre_madre,
                :direccion, :colonia, :ciudad, :estado, :codigo_postal,
                :telefono_casa, :telefono_celular, :correo_electronico,
                :en_emergencia_avisar_a, :telefono_emergencia,
                :municipio_nacimiento, :estado_nacimiento, :hospital_nacimiento,
                :tipo_sangre, :usa_valvula, :notas_adicionales,
                SYSDATE, :membresia_estatus, :id_usuario_registro, SYSDATE,
                :tipo_cuota, 'APROBADO'
            )
            RETURNING ID_PACIENTE INTO :out_id
            """,
            {
                "folio": folio,
                "activo": payload.get("activo", "S"),
                "nombre": payload["nombre"],
                "apellido_paterno": payload["apellido_paterno"],
                "apellido_materno": payload.get("apellido_materno"),
                "genero": payload.get("genero"),
                "fecha_nacimiento": payload.get("fecha_nacimiento"),
                "curp": encrypt(payload.get("curp")),
                "nombre_padre_madre": encrypt(payload.get("nombre_padre_madre")),
                "direccion": encrypt(payload.get("direccion")),
                "colonia": payload.get("colonia"),
                "ciudad": payload.get("ciudad"),
                "estado": payload.get("estado"),
                "codigo_postal": payload.get("codigo_postal"),
                "telefono_casa": encrypt(payload.get("telefono_casa")),
                "telefono_celular": encrypt(payload.get("telefono_celular")),
                "correo_electronico": encrypt(payload.get("correo_electronico")),
                "en_emergencia_avisar_a": encrypt(payload.get("en_emergencia_avisar_a")),
                "telefono_emergencia": encrypt(payload.get("telefono_emergencia")),
                "municipio_nacimiento": payload.get("municipio_nacimiento"),
                "estado_nacimiento": payload.get("estado_nacimiento"),
                "hospital_nacimiento": encrypt(payload.get("hospital_nacimiento")),
                "tipo_sangre": encrypt(payload.get("tipo_sangre")),
                "usa_valvula": payload.get("usa_valvula", "N"),
                "notas_adicionales": encrypt(payload.get("notas_adicionales")),
                "membresia_estatus": payload.get("membresia_estatus", "ACTIVO"),
                "id_usuario_registro": current_user.get("id_usuario"),
                "tipo_cuota": payload.get("tipo_cuota"),
                "out_id": out_id,
            },
        )

        new_id = out_id.getvalue()[0]

        # Insert tipos_espina
        for tid in tipos_ids:
            cur.execute(
                """
                INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO)
                VALUES (:id_paciente, :id_tipo_espina, SYSDATE)
                """,
                {"id_paciente": new_id, "id_tipo_espina": tid},
            )

        conn.commit()

        # Fetch the created record
        cur.execute("SELECT * FROM PACIENTE WHERE ID_PACIENTE = :id", {"id": new_id})
        row = row_to_dict(cur)
        return _patient_row_to_response(row, conn)


@router.put("/{folio}", response_model=BeneficiarioResponse)
def actualizar_beneficiario(
    folio: str,
    data: BeneficiarioCreate,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar beneficiario existente."""
    with get_db() as conn:
        cur = conn.cursor()

        # Find patient
        cur.execute("SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio", {"folio": folio})
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        id_paciente = row[0]

        payload = data.model_dump()
        tipos_ids = payload.pop("tipos_espina", None) or []

        cur.execute(
            """
            UPDATE PACIENTE SET
                NOMBRE = :nombre,
                APELLIDO_PATERNO = :apellido_paterno,
                APELLIDO_MATERNO = :apellido_materno,
                GENERO = :genero,
                FECHA_NACIMIENTO = TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),
                CURP = :curp,
                NOMBRE_PADRE_MADRE = :nombre_padre_madre,
                DIRECCION = :direccion,
                COLONIA = :colonia,
                CIUDAD = :ciudad,
                ESTADO = :estado,
                CODIGO_POSTAL = :codigo_postal,
                TELEFONO_CASA = :telefono_casa,
                TELEFONO_CELULAR = :telefono_celular,
                CORREO_ELECTRONICO = :correo_electronico,
                EN_EMERGENCIA_AVISAR_A = :en_emergencia_avisar_a,
                TELEFONO_EMERGENCIA = :telefono_emergencia,
                MUNICIPIO_NACIMIENTO = :municipio_nacimiento,
                ESTADO_NACIMIENTO = :estado_nacimiento,
                HOSPITAL_NACIMIENTO = :hospital_nacimiento,
                TIPO_SANGRE = :tipo_sangre,
                USA_VALVULA = :usa_valvula,
                NOTAS_ADICIONALES = :notas_adicionales,
                MEMBRESIA_ESTATUS = :membresia_estatus,
                ACTIVO = :activo,
                TIPO_CUOTA = :tipo_cuota
            WHERE ID_PACIENTE = :id_paciente
            """,
            {
                "nombre": payload["nombre"],
                "apellido_paterno": payload["apellido_paterno"],
                "apellido_materno": payload.get("apellido_materno"),
                "genero": payload.get("genero"),
                "fecha_nacimiento": payload.get("fecha_nacimiento"),
                "curp": encrypt(payload.get("curp")),
                "nombre_padre_madre": encrypt(payload.get("nombre_padre_madre")),
                "direccion": encrypt(payload.get("direccion")),
                "colonia": payload.get("colonia"),
                "ciudad": payload.get("ciudad"),
                "estado": payload.get("estado"),
                "codigo_postal": payload.get("codigo_postal"),
                "telefono_casa": encrypt(payload.get("telefono_casa")),
                "telefono_celular": encrypt(payload.get("telefono_celular")),
                "correo_electronico": encrypt(payload.get("correo_electronico")),
                "en_emergencia_avisar_a": encrypt(payload.get("en_emergencia_avisar_a")),
                "telefono_emergencia": encrypt(payload.get("telefono_emergencia")),
                "municipio_nacimiento": payload.get("municipio_nacimiento"),
                "estado_nacimiento": payload.get("estado_nacimiento"),
                "hospital_nacimiento": encrypt(payload.get("hospital_nacimiento")),
                "tipo_sangre": encrypt(payload.get("tipo_sangre")),
                "usa_valvula": payload.get("usa_valvula", "N"),
                "notas_adicionales": encrypt(payload.get("notas_adicionales")),
                "membresia_estatus": payload.get("membresia_estatus", "ACTIVO"),
                "activo": payload.get("activo", "S"),
                "tipo_cuota": payload.get("tipo_cuota"),
                "id_paciente": id_paciente,
            },
        )

        # Replace tipos_espina: delete old, insert new
        cur.execute("DELETE FROM PACIENTE_TIPO_ESPINA WHERE ID_PACIENTE = :id", {"id": id_paciente})
        for tid in tipos_ids:
            cur.execute(
                """
                INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO)
                VALUES (:id_paciente, :id_tipo_espina, SYSDATE)
                """,
                {"id_paciente": id_paciente, "id_tipo_espina": tid},
            )

        conn.commit()

        # Fetch updated record
        cur.execute("SELECT * FROM PACIENTE WHERE ID_PACIENTE = :id", {"id": id_paciente})
        row = row_to_dict(cur)
        return _patient_row_to_response(row, conn)


@router.delete("/{folio}", status_code=200)
def eliminar_beneficiario(folio: str, current_user: dict = Depends(get_current_user)):
    """Soft delete: marcar beneficiario como inactivo."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio", {"folio": folio})
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")

        cur.execute("UPDATE PACIENTE SET ACTIVO = 'N' WHERE FOLIO = :folio", {"folio": folio})
        conn.commit()
        return {"detail": "Beneficiario eliminado correctamente"}


@router.get("/{folio}/historial")
def historial_beneficiario(
    folio: str, current_user: dict = Depends(get_current_user)
):
    """Obtener historial de servicios, pagos y citas del beneficiario."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM PACIENTE WHERE FOLIO = :folio", {"folio": folio})
        paciente = row_to_dict(cur)
        if paciente is None:
            raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
        paciente = decrypt_row(paciente, PACIENTE_ENCRYPTED_FIELDS)

        nombre_completo = (
            f"{paciente['nombre']} {paciente['apellido_paterno']}"
            f" {paciente.get('apellido_materno') or ''}".strip()
        )

        # Historial placeholder - will be populated when related tables are integrated
        historial = {
            "folio": folio,
            "nombre": nombre_completo,
            "servicios": [],
            "pagos": [],
            "citas": [],
        }
        return historial
