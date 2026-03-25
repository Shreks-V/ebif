from fastapi import APIRouter, HTTPException, Depends
from app.core.security import get_current_user
from app.schemas.schemas import DoctorCreate, DoctorResponse

router = APIRouter()

# ──────────────────────────── MOCK DATA ────────────────────────────

mock_doctores = [
    {
        "id_doctor": 1,
        "nombre": "Alejandro",
        "apellido_paterno": "Cavazos",
        "apellido_materno": "Garza",
        "especialidad": "Neurocirugía",
        "telefono": "8181001001",
        "correo": "dr.cavazos@ebif.org",
        "activo": True,
    },
    {
        "id_doctor": 2,
        "nombre": "María Elena",
        "apellido_paterno": "Villarreal",
        "apellido_materno": "Treviño",
        "especialidad": "Urología Pediátrica",
        "telefono": "8181002002",
        "correo": "dra.villarreal@ebif.org",
        "activo": True,
    },
    {
        "id_doctor": 3,
        "nombre": "Ricardo",
        "apellido_paterno": "Montemayor",
        "apellido_materno": "Salinas",
        "especialidad": "Ortopedia",
        "telefono": "8181003003",
        "correo": "dr.montemayor@ebif.org",
        "activo": True,
    },
    {
        "id_doctor": 4,
        "nombre": "Patricia",
        "apellido_paterno": "Leal",
        "apellido_materno": "Hernández",
        "especialidad": "Medicina Física y Rehabilitación",
        "telefono": "8181004004",
        "correo": "dra.leal@ebif.org",
        "activo": True,
    },
    {
        "id_doctor": 5,
        "nombre": "Jorge",
        "apellido_paterno": "Sepúlveda",
        "apellido_materno": "Cantú",
        "especialidad": "Pediatría",
        "telefono": "8181005005",
        "correo": "dr.sepulveda@ebif.org",
        "activo": True,
    },
    {
        "id_doctor": 6,
        "nombre": "Laura",
        "apellido_paterno": "Garza",
        "apellido_materno": "Rodríguez",
        "especialidad": "Neurología",
        "telefono": "8181006006",
        "correo": "dra.garza@ebif.org",
        "activo": False,
    },
]

_next_id = len(mock_doctores) + 1


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/")
def listar_doctores(current_user: dict = Depends(get_current_user)):
    """Listar todos los doctores."""
    return mock_doctores


@router.post("/", status_code=201)
def crear_doctor(data: DoctorCreate, current_user: dict = Depends(get_current_user)):
    """Crear nuevo doctor."""
    global _next_id
    nuevo = data.model_dump()
    nuevo["id_doctor"] = _next_id
    _next_id += 1
    mock_doctores.append(nuevo)
    return nuevo


@router.put("/{id_doctor}")
def actualizar_doctor(
    id_doctor: int,
    data: DoctorCreate,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar doctor existente."""
    for i, d in enumerate(mock_doctores):
        if d["id_doctor"] == id_doctor:
            updated = data.model_dump()
            updated["id_doctor"] = id_doctor
            mock_doctores[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Doctor no encontrado")
