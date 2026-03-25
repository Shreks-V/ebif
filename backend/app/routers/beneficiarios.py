from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import date, datetime
from app.core.security import get_current_user
from app.schemas.schemas import BeneficiarioCreate, BeneficiarioResponse

router = APIRouter()

# ──────────────────────────── MOCK DATA ────────────────────────────

mock_beneficiarios = [
    {
        "folio": "BEN-000001",
        "nombre": "María Fernanda",
        "apellido_paterno": "García",
        "apellido_materno": "López",
        "fecha_nacimiento": "2018-03-15",
        "genero": "Femenino",
        "curp": "GALF180315MNLRPR01",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Universitario UANL",
        "nombre_tutor": "Ana López Martínez",
        "calle": "Av. Universidad",
        "numero": "1450",
        "colonia": "Mitras Centro",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64460",
        "telefono_casa": "8183456789",
        "telefono_celular": "8111234567",
        "correo": "ana.lopez@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2019-06-01",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Requiere silla de ruedas pediátrica",
    },
    {
        "folio": "BEN-000002",
        "nombre": "Carlos Eduardo",
        "apellido_paterno": "Martínez",
        "apellido_materno": "Hernández",
        "fecha_nacimiento": "2010-07-22",
        "genero": "Masculino",
        "curp": "MAHC100722HNLRRR05",
        "tipo_espina_bifida": "Espina bífida oculta",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Christus Muguerza",
        "nombre_tutor": "Eduardo Martínez Salinas",
        "calle": "Calzada del Valle",
        "numero": "320",
        "colonia": "Del Valle",
        "ciudad": "San Pedro Garza García",
        "estado": "Nuevo León",
        "codigo_postal": "66220",
        "telefono_casa": "8188765432",
        "telefono_celular": "8119876543",
        "correo": "edu.martinez@email.com",
        "tipo_cuota": "anual",
        "fecha_ingreso": "2015-01-15",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Terapia física semanal",
    },
    {
        "folio": "BEN-000003",
        "nombre": "Sofía",
        "apellido_paterno": "Rodríguez",
        "apellido_materno": "Garza",
        "fecha_nacimiento": "2015-11-03",
        "genero": "Femenino",
        "curp": "ROGS151103MNLDRF08",
        "tipo_espina_bifida": "Meningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital San José",
        "nombre_tutor": "Patricia Garza Villarreal",
        "calle": "Av. Lázaro Cárdenas",
        "numero": "2810",
        "colonia": "Residencial San Agustín",
        "ciudad": "San Pedro Garza García",
        "estado": "Nuevo León",
        "codigo_postal": "66260",
        "telefono_casa": "8187654321",
        "telefono_celular": "8112345678",
        "correo": "patricia.garza@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2020-03-10",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "",
    },
    {
        "folio": "BEN-000004",
        "nombre": "Diego Alejandro",
        "apellido_paterno": "Treviño",
        "apellido_materno": "Salazar",
        "fecha_nacimiento": "2005-01-28",
        "genero": "Masculino",
        "curp": "TESD050128HNLRLZ03",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Metropolitano",
        "nombre_tutor": "Roberto Treviño Peña",
        "calle": "Av. Ruiz Cortines",
        "numero": "455",
        "colonia": "Cumbres",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64610",
        "telefono_casa": "8181122334",
        "telefono_celular": "8114455667",
        "correo": "roberto.trevino@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2010-08-20",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Usa cateterismo intermitente",
    },
    {
        "folio": "BEN-000005",
        "nombre": "Valentina",
        "apellido_paterno": "Flores",
        "apellido_materno": "Cantú",
        "fecha_nacimiento": "2020-06-12",
        "genero": "Femenino",
        "curp": "FOCV200612MNLLNT04",
        "tipo_espina_bifida": "Lipomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Universitario UANL",
        "nombre_tutor": "Laura Cantú de Flores",
        "calle": "Paseo de los Leones",
        "numero": "1200",
        "colonia": "Las Cumbres",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64619",
        "telefono_casa": "8183344556",
        "telefono_celular": "8116677889",
        "correo": "laura.cantu@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2021-02-14",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Seguimiento neurológico trimestral",
    },
    {
        "folio": "BEN-000006",
        "nombre": "José Manuel",
        "apellido_paterno": "Ramírez",
        "apellido_materno": "Ochoa",
        "fecha_nacimiento": "1995-09-08",
        "genero": "Masculino",
        "curp": "RAOJ950908HNLMCH02",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Tamaulipas",
        "hospital_nacimiento": "Hospital Civil de Ciudad Victoria",
        "nombre_tutor": None,
        "calle": "Calle Hidalgo",
        "numero": "789",
        "colonia": "Centro",
        "ciudad": "Guadalupe",
        "estado": "Nuevo León",
        "codigo_postal": "67100",
        "telefono_casa": None,
        "telefono_celular": "8117788990",
        "correo": "jmanuel.ramirez@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2018-05-22",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Adulto, independiente. Usa silla de ruedas.",
    },
    {
        "folio": "BEN-000007",
        "nombre": "Ana Lucía",
        "apellido_paterno": "Villarreal",
        "apellido_materno": "Mendoza",
        "fecha_nacimiento": "2012-04-17",
        "genero": "Femenino",
        "curp": "VIMA120417MNLLND06",
        "tipo_espina_bifida": "Espina bífida oculta",
        "estado_nacimiento": "Coahuila",
        "hospital_nacimiento": "Hospital Universitario de Saltillo",
        "nombre_tutor": "Gabriela Mendoza Torres",
        "calle": "Av. Constitución",
        "numero": "567",
        "colonia": "Obispado",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64060",
        "telefono_casa": "8182233445",
        "telefono_celular": "8118899001",
        "correo": "gabriela.mendoza@email.com",
        "tipo_cuota": "anual",
        "fecha_ingreso": "2017-09-03",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Proveniente de Saltillo, acude cada 2 meses",
    },
    {
        "folio": "BEN-000008",
        "nombre": "Luis Ángel",
        "apellido_paterno": "Salinas",
        "apellido_materno": "Gutiérrez",
        "fecha_nacimiento": "2000-12-05",
        "genero": "Masculino",
        "curp": "SAGL001205HNLLTS09",
        "tipo_espina_bifida": "Meningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Christus Muguerza",
        "nombre_tutor": None,
        "calle": "Av. Revolución",
        "numero": "890",
        "colonia": "Contry",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64860",
        "telefono_casa": "8184455667",
        "telefono_celular": "8113344556",
        "correo": "luis.salinas@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2016-11-28",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Estudiante universitario",
    },
    {
        "folio": "BEN-000009",
        "nombre": "Isabella",
        "apellido_paterno": "Lozano",
        "apellido_materno": "Pérez",
        "fecha_nacimiento": "2022-02-14",
        "genero": "Femenino",
        "curp": "LOPI220214MNLZRR07",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Universitario UANL",
        "nombre_tutor": "Mariana Pérez de Lozano",
        "calle": "Sierra Madre",
        "numero": "234",
        "colonia": "Chepevera",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64030",
        "telefono_casa": "8185566778",
        "telefono_celular": "8112233445",
        "correo": "mariana.perez@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2022-08-05",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Bebé, seguimiento mensual con neurocirugía",
    },
    {
        "folio": "BEN-000010",
        "nombre": "Andrés",
        "apellido_paterno": "De la Garza",
        "apellido_materno": "Ríos",
        "fecha_nacimiento": "1988-05-30",
        "genero": "Masculino",
        "curp": "GARA880530HNLRNS01",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "San Luis Potosí",
        "hospital_nacimiento": "Hospital Central Dr. Ignacio Morones Prieto",
        "nombre_tutor": None,
        "calle": "Av. Morones Prieto",
        "numero": "1500",
        "colonia": "Independencia",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64720",
        "telefono_casa": None,
        "telefono_celular": "8119900112",
        "correo": "andres.garza@email.com",
        "tipo_cuota": "anual",
        "fecha_ingreso": "2012-04-18",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Adulto, trabaja. Foráneo de SLP.",
    },
    {
        "folio": "BEN-000011",
        "nombre": "Regina",
        "apellido_paterno": "Cavazos",
        "apellido_materno": "Luna",
        "fecha_nacimiento": "2016-08-21",
        "genero": "Femenino",
        "curp": "CALR160821MNLVNR03",
        "tipo_espina_bifida": "Lipomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital San José",
        "nombre_tutor": "Teresa Luna Garza",
        "calle": "Blvd. Díaz Ordaz",
        "numero": "1020",
        "colonia": "Santa María",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64650",
        "telefono_casa": "8186677889",
        "telefono_celular": "8115544332",
        "correo": "teresa.luna@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2019-10-12",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "",
    },
    {
        "folio": "BEN-000012",
        "nombre": "Emiliano",
        "apellido_paterno": "Reyes",
        "apellido_materno": "Morales",
        "fecha_nacimiento": "2008-03-10",
        "genero": "Masculino",
        "curp": "REME080310HNLYRL07",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Metropolitano",
        "nombre_tutor": "Carmen Morales Vázquez",
        "calle": "Av. Lincoln",
        "numero": "3450",
        "colonia": "Valle de Lincoln",
        "ciudad": "García",
        "estado": "Nuevo León",
        "codigo_postal": "66000",
        "telefono_casa": "8187788990",
        "telefono_celular": "8116655443",
        "correo": "carmen.morales@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2014-07-20",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Cirugía de derivación VP en 2009",
    },
    {
        "folio": "BEN-000013",
        "nombre": "Camila",
        "apellido_paterno": "Soto",
        "apellido_materno": "Elizondo",
        "fecha_nacimiento": "2019-01-25",
        "genero": "Femenino",
        "curp": "SOEC190125MNLTLM05",
        "tipo_espina_bifida": "Meningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Universitario UANL",
        "nombre_tutor": "Daniela Elizondo Cantú",
        "calle": "Calle Juárez",
        "numero": "456",
        "colonia": "Centro",
        "ciudad": "Santa Catarina",
        "estado": "Nuevo León",
        "codigo_postal": "66350",
        "telefono_casa": "8188899001",
        "telefono_celular": "8117766554",
        "correo": "daniela.elizondo@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2020-06-30",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "",
    },
    {
        "folio": "BEN-000014",
        "nombre": "Roberto",
        "apellido_paterno": "Chávez",
        "apellido_materno": "Banda",
        "fecha_nacimiento": "1970-11-18",
        "genero": "Masculino",
        "curp": "CABR701118HNLHND04",
        "tipo_espina_bifida": "Espina bífida oculta",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Hospital Universitario UANL",
        "nombre_tutor": None,
        "calle": "Av. Eugenio Garza Sada",
        "numero": "2501",
        "colonia": "Tecnológico",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64849",
        "telefono_casa": "8181234567",
        "telefono_celular": "8118877665",
        "correo": "roberto.chavez@email.com",
        "tipo_cuota": "anual",
        "fecha_ingreso": "2005-02-10",
        "estado_membresia": "inactivo",
        "fotografia_url": None,
        "notas": "Adulto mayor, diagnóstico tardío",
    },
    {
        "folio": "BEN-000015",
        "nombre": "Ximena",
        "apellido_paterno": "Guajardo",
        "apellido_materno": "Tamez",
        "fecha_nacimiento": "2023-09-02",
        "genero": "Femenino",
        "curp": "GUTX230902MNLJMX02",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Nuevo León",
        "hospital_nacimiento": "Christus Muguerza",
        "nombre_tutor": "Sandra Tamez Longoria",
        "calle": "Av. Sendero",
        "numero": "780",
        "colonia": "Sendero",
        "ciudad": "Apodaca",
        "estado": "Nuevo León",
        "codigo_postal": "66600",
        "telefono_casa": None,
        "telefono_celular": "8119988776",
        "correo": "sandra.tamez@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2024-01-20",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Bebé, cirugía correctiva al nacer",
    },
    {
        "folio": "BEN-000016",
        "nombre": "Fernando",
        "apellido_paterno": "Peña",
        "apellido_materno": "Villarreal",
        "fecha_nacimiento": "2002-06-14",
        "genero": "Masculino",
        "curp": "PEVF020614HNLNLR08",
        "tipo_espina_bifida": "Mielomeningocele",
        "estado_nacimiento": "Chihuahua",
        "hospital_nacimiento": "Hospital Central de Chihuahua",
        "nombre_tutor": None,
        "calle": "Av. Fidel Velázquez",
        "numero": "1234",
        "colonia": "San Nicolás de los Garza",
        "ciudad": "San Nicolás de los Garza",
        "estado": "Nuevo León",
        "codigo_postal": "66450",
        "telefono_casa": None,
        "telefono_celular": "8114433221",
        "correo": "fernando.pena@email.com",
        "tipo_cuota": "mensual",
        "fecha_ingreso": "2022-09-15",
        "estado_membresia": "activo",
        "fotografia_url": None,
        "notas": "Foráneo de Chihuahua, estudia en Monterrey",
    },
]

_next_folio_counter = len(mock_beneficiarios) + 1


# ──────────────────────────── HELPERS ────────────────────────────


def _calculate_age(fecha_nac_str: str) -> int:
    try:
        fn = datetime.strptime(fecha_nac_str, "%Y-%m-%d").date()
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


@router.get("/stats/dashboard")
def dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Estadísticas generales para el dashboard."""
    total = len(mock_beneficiarios)
    activos = sum(1 for b in mock_beneficiarios if b["estado_membresia"] == "activo")
    inactivos = total - activos
    masculino = sum(1 for b in mock_beneficiarios if b["genero"] == "Masculino")
    femenino = sum(1 for b in mock_beneficiarios if b["genero"] == "Femenino")
    nuevo_leon = sum(1 for b in mock_beneficiarios if b["estado"] == "Nuevo León")
    foraneos = total - nuevo_leon

    edades = [_calculate_age(b["fecha_nacimiento"]) for b in mock_beneficiarios]
    etapas: dict[str, int] = {}
    for edad in edades:
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


@router.get("/")
def listar_beneficiarios(
    nombre: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    genero: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar beneficiarios con filtros opcionales."""
    resultados = list(mock_beneficiarios)

    if nombre:
        nombre_lower = nombre.lower()
        resultados = [
            b
            for b in resultados
            if nombre_lower in b["nombre"].lower()
            or nombre_lower in b["apellido_paterno"].lower()
            or nombre_lower in b["apellido_materno"].lower()
        ]

    if estado:
        resultados = [b for b in resultados if b["estado_membresia"] == estado]

    if genero:
        resultados = [b for b in resultados if b["genero"] == genero]

    if busqueda:
        q = busqueda.lower()
        resultados = [
            b
            for b in resultados
            if q in b["nombre"].lower()
            or q in b["apellido_paterno"].lower()
            or q in b["apellido_materno"].lower()
            or q in b["folio"].lower()
            or q in (b.get("curp") or "").lower()
            or q in (b.get("ciudad") or "").lower()
        ]

    return resultados


@router.get("/{folio}")
def obtener_beneficiario(folio: str, current_user: dict = Depends(get_current_user)):
    """Obtener beneficiario por folio."""
    beneficiario = next(
        (b for b in mock_beneficiarios if b["folio"] == folio), None
    )
    if beneficiario is None:
        raise HTTPException(status_code=404, detail="Beneficiario no encontrado")
    edad = _calculate_age(beneficiario["fecha_nacimiento"])
    return {**beneficiario, "edad": edad, "etapa_vida": _etapa_vida(edad)}


@router.post("/", status_code=201)
def crear_beneficiario(
    data: BeneficiarioCreate, current_user: dict = Depends(get_current_user)
):
    """Crear nuevo beneficiario con folio auto-generado."""
    global _next_folio_counter
    folio = f"BEN-{_next_folio_counter:06d}"
    _next_folio_counter += 1

    nuevo = data.model_dump()
    nuevo["folio"] = folio
    if not nuevo.get("fecha_ingreso"):
        nuevo["fecha_ingreso"] = date.today().isoformat()
    mock_beneficiarios.append(nuevo)
    return nuevo


@router.put("/{folio}")
def actualizar_beneficiario(
    folio: str,
    data: BeneficiarioCreate,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar beneficiario existente."""
    for i, b in enumerate(mock_beneficiarios):
        if b["folio"] == folio:
            updated = data.model_dump()
            updated["folio"] = folio
            mock_beneficiarios[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Beneficiario no encontrado")


@router.get("/{folio}/historial")
def historial_beneficiario(
    folio: str, current_user: dict = Depends(get_current_user)
):
    """Obtener historial de servicios, pagos y citas del beneficiario."""
    beneficiario = next(
        (b for b in mock_beneficiarios if b["folio"] == folio), None
    )
    if beneficiario is None:
        raise HTTPException(status_code=404, detail="Beneficiario no encontrado")

    nombre_completo = f"{beneficiario['nombre']} {beneficiario['apellido_paterno']} {beneficiario['apellido_materno']}"

    # Mock historial
    historial = {
        "folio": folio,
        "nombre": nombre_completo,
        "servicios": [
            {
                "tipo": "Consulta Urología",
                "fecha": "2025-11-15",
                "monto": 150.00,
                "notas": "Revisión rutinaria",
            },
            {
                "tipo": "Terapia Física",
                "fecha": "2025-10-20",
                "monto": 200.00,
                "notas": "Sesión de rehabilitación",
            },
        ],
        "pagos": [
            {
                "tipo": "Cuota mensual",
                "fecha": "2025-12-01",
                "monto": 100.00,
                "metodo": "Efectivo",
            },
            {
                "tipo": "Cuota mensual",
                "fecha": "2025-11-01",
                "monto": 100.00,
                "metodo": "Transferencia",
            },
        ],
        "citas": [
            {
                "fecha": "2026-01-15",
                "doctor": "Dr. Alejandro Cavazos",
                "especialidad": "Neurocirugía",
                "estatus": "PROGRAMADA",
            },
        ],
    }
    return historial
