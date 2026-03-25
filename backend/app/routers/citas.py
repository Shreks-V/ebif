from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import date
from app.core.security import get_current_user
from app.schemas.schemas import CitaCreate, CitaResponse

router = APIRouter()

# ──────────────────────────── MOCK DATA ────────────────────────────

mock_citas = [
    {
        "id_cita": 1,
        "id_paciente": "BEN-000001",
        "nombre_paciente": "María Fernanda García López",
        "fecha_hora": "2026-03-24T09:00:00",
        "id_doctor": "1",
        "nombre_doctor": "Dr. Alejandro Cavazos Garza",
        "especialidad": "Neurocirugía",
        "tipo_servicio": "Consulta de seguimiento",
        "estatus": "PROGRAMADA",
        "notas": "Revisión postquirúrgica",
    },
    {
        "id_cita": 2,
        "id_paciente": "BEN-000004",
        "nombre_paciente": "Diego Alejandro Treviño Salazar",
        "fecha_hora": "2026-03-24T10:30:00",
        "id_doctor": "2",
        "nombre_doctor": "Dra. María Elena Villarreal Treviño",
        "especialidad": "Urología Pediátrica",
        "tipo_servicio": "Consulta urológica",
        "estatus": "PROGRAMADA",
        "notas": "Control de vejiga neurogénica",
    },
    {
        "id_cita": 3,
        "id_paciente": "BEN-000009",
        "nombre_paciente": "Isabella Lozano Pérez",
        "fecha_hora": "2026-03-24T11:00:00",
        "id_doctor": "5",
        "nombre_doctor": "Dr. Jorge Sepúlveda Cantú",
        "especialidad": "Pediatría",
        "tipo_servicio": "Consulta pediátrica",
        "estatus": "PROGRAMADA",
        "notas": "Control de peso y desarrollo",
    },
    {
        "id_cita": 4,
        "id_paciente": "BEN-000002",
        "nombre_paciente": "Carlos Eduardo Martínez Hernández",
        "fecha_hora": "2026-03-24T12:00:00",
        "id_doctor": "4",
        "nombre_doctor": "Dra. Patricia Leal Hernández",
        "especialidad": "Medicina Física y Rehabilitación",
        "tipo_servicio": "Terapia física",
        "estatus": "PROGRAMADA",
        "notas": "Sesión de rehabilitación semanal",
    },
    {
        "id_cita": 5,
        "id_paciente": "BEN-000006",
        "nombre_paciente": "José Manuel Ramírez Ochoa",
        "fecha_hora": "2026-03-22T09:30:00",
        "id_doctor": "3",
        "nombre_doctor": "Dr. Ricardo Montemayor Salinas",
        "especialidad": "Ortopedia",
        "tipo_servicio": "Consulta ortopédica",
        "estatus": "COMPLETADA",
        "notas": "Evaluación para nueva silla de ruedas",
    },
    {
        "id_cita": 6,
        "id_paciente": "BEN-000005",
        "nombre_paciente": "Valentina Flores Cantú",
        "fecha_hora": "2026-03-21T10:00:00",
        "id_doctor": "1",
        "nombre_doctor": "Dr. Alejandro Cavazos Garza",
        "especialidad": "Neurocirugía",
        "tipo_servicio": "Consulta neurológica",
        "estatus": "COMPLETADA",
        "notas": "Seguimiento trimestral",
    },
    {
        "id_cita": 7,
        "id_paciente": "BEN-000012",
        "nombre_paciente": "Emiliano Reyes Morales",
        "fecha_hora": "2026-03-20T14:00:00",
        "id_doctor": "2",
        "nombre_doctor": "Dra. María Elena Villarreal Treviño",
        "especialidad": "Urología Pediátrica",
        "tipo_servicio": "Estudios urodinámicos",
        "estatus": "COMPLETADA",
        "notas": "Resultados normales",
    },
    {
        "id_cita": 8,
        "id_paciente": "BEN-000003",
        "nombre_paciente": "Sofía Rodríguez Garza",
        "fecha_hora": "2026-03-19T09:00:00",
        "id_doctor": "4",
        "nombre_doctor": "Dra. Patricia Leal Hernández",
        "especialidad": "Medicina Física y Rehabilitación",
        "tipo_servicio": "Terapia física",
        "estatus": "COMPLETADA",
        "notas": "Progreso satisfactorio",
    },
    {
        "id_cita": 9,
        "id_paciente": "BEN-000015",
        "nombre_paciente": "Ximena Guajardo Tamez",
        "fecha_hora": "2026-03-25T09:00:00",
        "id_doctor": "5",
        "nombre_doctor": "Dr. Jorge Sepúlveda Cantú",
        "especialidad": "Pediatría",
        "tipo_servicio": "Consulta pediátrica",
        "estatus": "PROGRAMADA",
        "notas": "Control de crecimiento",
    },
    {
        "id_cita": 10,
        "id_paciente": "BEN-000010",
        "nombre_paciente": "Andrés De la Garza Ríos",
        "fecha_hora": "2026-03-18T11:00:00",
        "id_doctor": "3",
        "nombre_doctor": "Dr. Ricardo Montemayor Salinas",
        "especialidad": "Ortopedia",
        "tipo_servicio": "Consulta ortopédica",
        "estatus": "CANCELADA",
        "notas": "Cancelada por el paciente",
    },
    {
        "id_cita": 11,
        "id_paciente": "BEN-000007",
        "nombre_paciente": "Ana Lucía Villarreal Mendoza",
        "fecha_hora": "2026-03-25T10:30:00",
        "id_doctor": "1",
        "nombre_doctor": "Dr. Alejandro Cavazos Garza",
        "especialidad": "Neurocirugía",
        "tipo_servicio": "Consulta de seguimiento",
        "estatus": "PROGRAMADA",
        "notas": "Evaluación anual",
    },
    {
        "id_cita": 12,
        "id_paciente": "BEN-000013",
        "nombre_paciente": "Camila Soto Elizondo",
        "fecha_hora": "2026-03-26T09:00:00",
        "id_doctor": "4",
        "nombre_doctor": "Dra. Patricia Leal Hernández",
        "especialidad": "Medicina Física y Rehabilitación",
        "tipo_servicio": "Terapia física",
        "estatus": "PROGRAMADA",
        "notas": "Primera sesión del mes",
    },
]

_next_id = len(mock_citas) + 1


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/hoy")
def citas_hoy(current_user: dict = Depends(get_current_user)):
    """Obtener el conteo de citas de hoy."""
    hoy = date.today().isoformat()
    citas_del_dia = [c for c in mock_citas if c["fecha_hora"].startswith(hoy)]
    programadas = sum(1 for c in citas_del_dia if c["estatus"] == "PROGRAMADA")
    completadas = sum(1 for c in citas_del_dia if c["estatus"] == "COMPLETADA")
    canceladas = sum(1 for c in citas_del_dia if c["estatus"] == "CANCELADA")
    return {
        "fecha": hoy,
        "total": len(citas_del_dia),
        "programadas": programadas,
        "completadas": completadas,
        "canceladas": canceladas,
        "citas": citas_del_dia,
    }


@router.get("/")
def listar_citas(
    fecha: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    tipo_consulta: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar citas con filtros opcionales."""
    resultados = list(mock_citas)

    if fecha:
        resultados = [c for c in resultados if c["fecha_hora"].startswith(fecha)]

    if estatus:
        resultados = [c for c in resultados if c["estatus"] == estatus]

    if tipo_consulta:
        q = tipo_consulta.lower()
        resultados = [c for c in resultados if q in c["tipo_servicio"].lower()]

    if busqueda:
        q = busqueda.lower()
        resultados = [
            c
            for c in resultados
            if q in c["nombre_paciente"].lower()
            or q in c["nombre_doctor"].lower()
            or q in c["especialidad"].lower()
            or q in c["id_paciente"].lower()
        ]

    return resultados


@router.post("/", status_code=201)
def crear_cita(data: CitaCreate, current_user: dict = Depends(get_current_user)):
    """Crear nueva cita."""
    global _next_id
    nueva = data.model_dump()
    nueva["id_cita"] = _next_id
    _next_id += 1
    mock_citas.append(nueva)
    return nueva


@router.put("/{id_cita}")
def actualizar_cita(
    id_cita: int,
    data: CitaCreate,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar cita existente (cambiar estatus, notas, etc.)."""
    for i, c in enumerate(mock_citas):
        if c["id_cita"] == id_cita:
            updated = data.model_dump()
            updated["id_cita"] = id_cita
            mock_citas[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Cita no encontrada")
