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
        "nombre_tutor": "Claudia Domínguez Ramos",
        "calle": "Av. Constitución",
        "numero": "1234",
        "colonia": "Centro",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64000",
        "telefono_casa": "8181234500",
        "telefono_celular": "8119001122",
        "correo": "claudia.dominguez@email.com",
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
        "nombre_tutor": "Rosa Sánchez Medina",
        "calle": "Calle Morelos",
        "numero": "567",
        "colonia": "Independencia",
        "ciudad": "Saltillo",
        "estado": "Coahuila",
        "codigo_postal": "25000",
        "telefono_casa": None,
        "telefono_celular": "8442233445",
        "correo": "rosa.sanchez@email.com",
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
        "nombre_tutor": "Miguel Luna Torres",
        "calle": "Blvd. Acapulco",
        "numero": "890",
        "colonia": "Residencial Acapulco",
        "ciudad": "San Nicolás de los Garza",
        "estado": "Nuevo León",
        "codigo_postal": "66480",
        "telefono_casa": "8183456700",
        "telefono_celular": "8117788990",
        "correo": "miguel.luna@email.com",
        "tipo_cuota": "mensual",
        "notas": "",
        "paso_actual": 2,
        "completado": False,
        "fecha_solicitud": "2026-03-22",
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
