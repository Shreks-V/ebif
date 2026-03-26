from fastapi import APIRouter, HTTPException
from datetime import date
from app.schemas.schemas import PreRegistroCreate, PreRegistroResponse

router = APIRouter()

# ──────────────────────────── MOCK DATA ────────────────────────────

mock_preregistros = [
    {
        "id": 1,
        "nombre": "Santiago",
        "apellido_paterno": "Herrera",
        "apellido_materno": "Domínguez",
        "fecha_nacimiento": "2024-05-10",
        "genero": "Masculino",
        "curp": "HEDS240510HNLRMN01",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Universitario UANL",
        "nombre_padre_madre": "Claudia Domínguez Ramos",
        "direccion": "Av. Constitución 1234",
        "colonia": "Centro",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64000",
        "telefono_casa": "8181234500",
        "telefono_celular": "8119001122",
        "correo_electronico": "claudia.dominguez@email.com",
        "tipo_cuota": "mensual",
        "notas": "Bebé diagnosticado al nacer, busca apoyo integral",
        "paso_actual": 3,
        "completado": True,
        "fecha_solicitud": "2026-03-18",
        "estatus": "PENDIENTE",
    },
    {
        "id": 2,
        "nombre": "Mariana",
        "apellido_paterno": "Olvera",
        "apellido_materno": "Sánchez",
        "fecha_nacimiento": "2017-11-28",
        "genero": "Femenino",
        "curp": "OESM171128MNLLNR03",
        "tipo_espina_bifida": "Meningocele",
        "estado_nacimiento": "Coahuila",
        "hospital_nacimiento": "Hospital General de Saltillo",
        "nombre_padre_madre": "Rosa Sánchez Medina",
        "direccion": "Calle Morelos 567",
        "colonia": "Independencia",
        "ciudad": "Saltillo",
        "estado": "Coahuila",
        "codigo_postal": "25000",
        "telefono_casa": None,
        "telefono_celular": "8442233445",
        "correo_electronico": "rosa.sanchez@email.com",
        "tipo_cuota": "mensual",
        "notas": "Foránea, dispuesta a viajar a Monterrey para atención",
        "paso_actual": 3,
        "completado": True,
        "fecha_solicitud": "2026-03-10",
        "estatus": "REVISADO",
    },
    {
        "id": 3,
        "nombre": "Mateo",
        "apellido_paterno": "Luna",
        "apellido_materno": "Espinoza",
        "fecha_nacimiento": "2021-08-03",
        "genero": "Masculino",
        "curp": "LUEM210803HNLNSP06",
        "tipo_espina_bifida": "Lipomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Christus Muguerza",
        "nombre_padre_madre": "Miguel Luna Torres",
        "direccion": "Blvd. Acapulco 890",
        "colonia": "Residencial Acapulco",
        "ciudad": "San Nicolás de los Garza",
        "estado": "Nuevo León",
        "codigo_postal": "66480",
        "telefono_casa": "8183456700",
        "telefono_celular": "8117788990",
        "correo_electronico": "miguel.luna@email.com",
        "tipo_cuota": "mensual",
        "notas": "",
        "paso_actual": 2,
        "completado": False,
        "fecha_solicitud": "2026-03-22",
        "estatus": "PENDIENTE",
    },
    {
        "id": 4,
        "nombre": "Valentina",
        "apellido_paterno": "Garza",
        "apellido_materno": "Treviño",
        "fecha_nacimiento": "2023-01-15",
        "genero": "Femenino",
        "curp": "GATV230115MNLRRN08",
        "tipo_espina_bifida": "Espina bífida oculta",
        "estado_nacimiento": "Tamaulipas",
        "hospital_nacimiento": "Hospital Civil de Ciudad Victoria",
        "nombre_padre_madre": "Laura Treviño Pérez",
        "direccion": "Calle Hidalgo 245",
        "colonia": "Las Flores",
        "ciudad": "Ciudad Victoria",
        "estado": "Tamaulipas",
        "codigo_postal": "87000",
        "telefono_casa": None,
        "telefono_celular": "8341556789",
        "correo_electronico": "laura.trevino@email.com",
        "tipo_cuota": "anual",
        "notas": "Diagnóstico reciente, referida por pediatra",
        "paso_actual": 1,
        "completado": False,
        "fecha_solicitud": "2026-03-24",
        "estatus": "PENDIENTE",
    },
]

_next_id = len(mock_preregistros) + 1


# ──────────────────────────── ENDPOINTS ────────────────────────────
# Pre-registro is PUBLIC (no auth required)


@router.get("/")
def listar_preregistros():
    """Listar todos los pre-registros."""
    return mock_preregistros


@router.post("/", status_code=201)
def crear_preregistro(data: PreRegistroCreate):
    """Enviar un nuevo pre-registro (endpoint público, sin autenticación)."""
    global _next_id
    nuevo = data.model_dump()
    nuevo["id"] = _next_id
    nuevo["fecha_solicitud"] = date.today().isoformat()
    nuevo["estatus"] = "PENDIENTE"
    _next_id += 1
    mock_preregistros.append(nuevo)
    return nuevo


@router.get("/{id_preregistro}")
def obtener_preregistro(id_preregistro: int):
    """Obtener detalle de un pre-registro."""
    preregistro = next(
        (p for p in mock_preregistros if p["id"] == id_preregistro), None
    )
    if preregistro is None:
        raise HTTPException(
            status_code=404, detail="Pre-registro no encontrado"
        )
    return preregistro


@router.put("/{id_preregistro}")
def actualizar_preregistro(id_preregistro: int, data: PreRegistroCreate):
    """Actualizar un pre-registro existente (formulario multi-paso)."""
    preregistro = next(
        (p for p in mock_preregistros if p["id"] == id_preregistro), None
    )
    if preregistro is None:
        raise HTTPException(
            status_code=404, detail="Pre-registro no encontrado"
        )
    actualizado = data.model_dump(exclude_unset=True)
    preregistro.update(actualizado)
    return preregistro


@router.post("/{id_preregistro}/aprobar")
def aprobar_preregistro(id_preregistro: int):
    """Aprobar un pre-registro y convertirlo en beneficiario."""
    preregistro = next(
        (p for p in mock_preregistros if p["id"] == id_preregistro), None
    )
    if preregistro is None:
        raise HTTPException(
            status_code=404, detail="Pre-registro no encontrado"
        )
    if not preregistro.get("completado"):
        raise HTTPException(
            status_code=400,
            detail="El pre-registro no está completado. Todos los pasos deben finalizarse antes de aprobar.",
        )
    if preregistro["estatus"] == "APROBADO":
        raise HTTPException(
            status_code=400, detail="Este pre-registro ya fue aprobado"
        )
    preregistro["estatus"] = "APROBADO"
    # TODO: crear registro completo en PACIENTE / BENEFICIARIO
    return {
        "message": "Pre-registro aprobado exitosamente",
        "preregistro": preregistro,
    }
