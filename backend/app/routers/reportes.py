from fastapi import APIRouter, Query, Depends
from typing import Optional
from datetime import date, datetime
from app.core.security import get_current_user

router = APIRouter()

# ──────────────────────────── SHARED MOCK REFERENCES ────────────────────────────
# We replicate some data here for the reports module to be self-contained.
# In production these would come from a shared database.

_mock_beneficiarios = [
    {"nombre": "María Fernanda García López", "fecha_nacimiento": "2018-03-15", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2019-06-01", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
    {"nombre": "Carlos Eduardo Martínez Hernández", "fecha_nacimiento": "2010-07-22", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "San Pedro Garza García", "fecha_ingreso": "2015-01-15", "estado_membresia": "activo", "tipo_espina_bifida": "Espina bífida oculta"},
    {"nombre": "Sofía Rodríguez Garza", "fecha_nacimiento": "2015-11-03", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "San Pedro Garza García", "fecha_ingreso": "2020-03-10", "estado_membresia": "activo", "tipo_espina_bifida": "Meningocele"},
    {"nombre": "Diego Alejandro Treviño Salazar", "fecha_nacimiento": "2005-01-28", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2010-08-20", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
    {"nombre": "Valentina Flores Cantú", "fecha_nacimiento": "2020-06-12", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2021-02-14", "estado_membresia": "activo", "tipo_espina_bifida": "Lipomeningocele"},
    {"nombre": "José Manuel Ramírez Ochoa", "fecha_nacimiento": "1995-09-08", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "Guadalupe", "fecha_ingreso": "2018-05-22", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
    {"nombre": "Ana Lucía Villarreal Mendoza", "fecha_nacimiento": "2012-04-17", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2017-09-03", "estado_membresia": "activo", "tipo_espina_bifida": "Espina bífida oculta"},
    {"nombre": "Luis Ángel Salinas Gutiérrez", "fecha_nacimiento": "2000-12-05", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2016-11-28", "estado_membresia": "activo", "tipo_espina_bifida": "Meningocele"},
    {"nombre": "Isabella Lozano Pérez", "fecha_nacimiento": "2022-02-14", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2022-08-05", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
    {"nombre": "Andrés De la Garza Ríos", "fecha_nacimiento": "1988-05-30", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2012-04-18", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
    {"nombre": "Regina Cavazos Luna", "fecha_nacimiento": "2016-08-21", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2019-10-12", "estado_membresia": "activo", "tipo_espina_bifida": "Lipomeningocele"},
    {"nombre": "Emiliano Reyes Morales", "fecha_nacimiento": "2008-03-10", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "García", "fecha_ingreso": "2014-07-20", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
    {"nombre": "Camila Soto Elizondo", "fecha_nacimiento": "2019-01-25", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "Santa Catarina", "fecha_ingreso": "2020-06-30", "estado_membresia": "activo", "tipo_espina_bifida": "Meningocele"},
    {"nombre": "Roberto Chávez Banda", "fecha_nacimiento": "1970-11-18", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "Monterrey", "fecha_ingreso": "2005-02-10", "estado_membresia": "inactivo", "tipo_espina_bifida": "Espina bífida oculta"},
    {"nombre": "Ximena Guajardo Tamez", "fecha_nacimiento": "2023-09-02", "genero": "Femenino", "estado": "Nuevo León", "ciudad": "Apodaca", "fecha_ingreso": "2024-01-20", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
    {"nombre": "Fernando Peña Villarreal", "fecha_nacimiento": "2002-06-14", "genero": "Masculino", "estado": "Nuevo León", "ciudad": "San Nicolás de los Garza", "fecha_ingreso": "2022-09-15", "estado_membresia": "activo", "tipo_espina_bifida": "Mielomeningocele"},
]

_mock_servicios = [
    {"tipo_servicio": "Consulta Neurocirugía", "fecha": "2026-03-15", "monto": 150.00},
    {"tipo_servicio": "Consulta Urología", "fecha": "2026-03-14", "monto": 150.00},
    {"tipo_servicio": "Terapia Física", "fecha": "2026-03-13", "monto": 200.00},
    {"tipo_servicio": "Consulta Pediatría", "fecha": "2026-03-12", "monto": 100.00},
    {"tipo_servicio": "Consulta Ortopedia", "fecha": "2026-03-10", "monto": 150.00},
    {"tipo_servicio": "Consulta Neurología", "fecha": "2026-03-08", "monto": 180.00},
    {"tipo_servicio": "Estudios Urodinámicos", "fecha": "2026-03-05", "monto": 350.00},
    {"tipo_servicio": "Terapia Física", "fecha": "2026-03-03", "monto": 200.00},
    {"tipo_servicio": "Consulta Urología", "fecha": "2026-02-28", "monto": 150.00},
    {"tipo_servicio": "Consulta Pediatría", "fecha": "2026-02-25", "monto": 100.00},
    {"tipo_servicio": "Terapia Física", "fecha": "2026-02-20", "monto": 200.00},
    {"tipo_servicio": "Consulta Neurocirugía", "fecha": "2026-02-15", "monto": 150.00},
    {"tipo_servicio": "Consulta Ortopedia", "fecha": "2026-02-10", "monto": 150.00},
    {"tipo_servicio": "Consulta Urología", "fecha": "2026-01-22", "monto": 150.00},
    {"tipo_servicio": "Terapia Física", "fecha": "2026-01-15", "monto": 200.00},
    {"tipo_servicio": "Consulta Pediatría", "fecha": "2026-01-10", "monto": 100.00},
    {"tipo_servicio": "Consulta Neurocirugía", "fecha": "2025-12-18", "monto": 150.00},
    {"tipo_servicio": "Terapia Física", "fecha": "2025-12-12", "monto": 200.00},
    {"tipo_servicio": "Consulta Neurología", "fecha": "2025-12-05", "monto": 180.00},
    {"tipo_servicio": "Estudios Urodinámicos", "fecha": "2025-11-28", "monto": 350.00},
]


# ──────────────────────────── HELPERS ────────────────────────────


def _age(fecha_nac_str: str) -> int:
    try:
        fn = datetime.strptime(fecha_nac_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))
    except Exception:
        return 0


def _etapa_vida(edad: int) -> str:
    if edad <= 5:
        return "Primera Infancia (0-5)"
    elif edad <= 11:
        return "Infancia (6-11)"
    elif edad <= 17:
        return "Adolescencia (12-17)"
    elif edad <= 29:
        return "Juventud (18-29)"
    elif edad <= 59:
        return "Adultez (30-59)"
    else:
        return "Adulto Mayor (60+)"


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/personas-atendidas")
def personas_atendidas(
    periodo: Optional[str] = Query("mes", description="dia, mes o anio"),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Personas atendidas agrupadas por día, mes o año."""
    servicios = list(_mock_servicios)

    if fecha_inicio:
        servicios = [s for s in servicios if s["fecha"] >= fecha_inicio]
    if fecha_fin:
        servicios = [s for s in servicios if s["fecha"] <= fecha_fin]

    agrupado: dict[str, int] = {}
    for s in servicios:
        if periodo == "dia":
            key = s["fecha"]
        elif periodo == "anio":
            key = s["fecha"][:4]
        else:  # mes
            key = s["fecha"][:7]
        agrupado[key] = agrupado.get(key, 0) + 1

    sorted_keys = sorted(agrupado.keys())
    return {
        "periodo": periodo,
        "labels": sorted_keys,
        "values": [agrupado[k] for k in sorted_keys],
        "total": sum(agrupado.values()),
    }


@router.get("/por-genero")
def reporte_por_genero(current_user: dict = Depends(get_current_user)):
    """Distribución de beneficiarios por género."""
    conteo: dict[str, int] = {}
    for b in _mock_beneficiarios:
        g = b["genero"]
        conteo[g] = conteo.get(g, 0) + 1

    labels = list(conteo.keys())
    values = [conteo[k] for k in labels]

    return {
        "labels": labels,
        "values": values,
        "total": sum(values),
    }


@router.get("/por-procedencia")
def reporte_por_procedencia(current_user: dict = Depends(get_current_user)):
    """Distribución Nuevo León vs foráneos."""
    nl = sum(1 for b in _mock_beneficiarios if b["estado"] == "Nuevo León")
    foraneos = len(_mock_beneficiarios) - nl

    # Desglose por ciudad para NL
    ciudades: dict[str, int] = {}
    for b in _mock_beneficiarios:
        if b["estado"] == "Nuevo León":
            c = b["ciudad"]
            ciudades[c] = ciudades.get(c, 0) + 1

    ciudades_labels = sorted(ciudades.keys(), key=lambda x: ciudades[x], reverse=True)

    return {
        "labels": ["Nuevo León", "Foráneos"],
        "values": [nl, foraneos],
        "total": len(_mock_beneficiarios),
        "desglose_nl": {
            "labels": ciudades_labels,
            "values": [ciudades[c] for c in ciudades_labels],
        },
    }


@router.get("/por-etapa-vida")
def reporte_por_etapa_vida(current_user: dict = Depends(get_current_user)):
    """Distribución por grupo de edad / etapa de vida."""
    etapas_orden = [
        "Primera Infancia (0-5)",
        "Infancia (6-11)",
        "Adolescencia (12-17)",
        "Juventud (18-29)",
        "Adultez (30-59)",
        "Adulto Mayor (60+)",
    ]
    conteo: dict[str, int] = {e: 0 for e in etapas_orden}

    for b in _mock_beneficiarios:
        edad = _age(b["fecha_nacimiento"])
        etapa = _etapa_vida(edad)
        conteo[etapa] = conteo.get(etapa, 0) + 1

    return {
        "labels": etapas_orden,
        "values": [conteo[e] for e in etapas_orden],
        "total": len(_mock_beneficiarios),
    }


@router.get("/servicios-top")
def servicios_top(
    limite: int = Query(10),
    current_user: dict = Depends(get_current_user),
):
    """Servicios más utilizados."""
    conteo: dict[str, int] = {}
    ingresos: dict[str, float] = {}
    for s in _mock_servicios:
        t = s["tipo_servicio"]
        conteo[t] = conteo.get(t, 0) + 1
        ingresos[t] = ingresos.get(t, 0.0) + s["monto"]

    sorted_servicios = sorted(conteo.keys(), key=lambda x: conteo[x], reverse=True)[
        :limite
    ]

    return {
        "labels": sorted_servicios,
        "values": [conteo[s] for s in sorted_servicios],
        "ingresos": [ingresos[s] for s in sorted_servicios],
        "total_servicios": sum(conteo.values()),
        "total_ingresos": sum(ingresos.values()),
    }


@router.get("/resumen-mensual")
def resumen_mensual(
    mes: Optional[str] = Query(None, description="Formato YYYY-MM"),
    current_user: dict = Depends(get_current_user),
):
    """Reporte mensual consolidado."""
    if not mes:
        mes = date.today().strftime("%Y-%m")

    servicios_mes = [s for s in _mock_servicios if s["fecha"].startswith(mes)]
    total_servicios = len(servicios_mes)
    total_ingresos = sum(s["monto"] for s in servicios_mes)

    # Conteo por tipo
    por_tipo: dict[str, int] = {}
    for s in servicios_mes:
        t = s["tipo_servicio"]
        por_tipo[t] = por_tipo.get(t, 0) + 1

    activos = sum(
        1 for b in _mock_beneficiarios if b["estado_membresia"] == "activo"
    )

    # Nuevos ingresos del mes
    nuevos = sum(
        1
        for b in _mock_beneficiarios
        if b["fecha_ingreso"].startswith(mes)
    )

    return {
        "mes": mes,
        "beneficiarios_activos": activos,
        "nuevos_ingresos": nuevos,
        "total_servicios": total_servicios,
        "total_ingresos": total_ingresos,
        "servicios_por_tipo": {
            "labels": list(por_tipo.keys()),
            "values": list(por_tipo.values()),
        },
    }


@router.get("/fundacion")
def reporte_fundacion(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Reporte ejecutivo para fundaciones donantes."""
    total_beneficiarios = len(_mock_beneficiarios)
    activos = sum(
        1 for b in _mock_beneficiarios if b["estado_membresia"] == "activo"
    )

    # Género
    masculino = sum(1 for b in _mock_beneficiarios if b["genero"] == "Masculino")
    femenino = sum(1 for b in _mock_beneficiarios if b["genero"] == "Femenino")

    # Etapa de vida
    etapas: dict[str, int] = {}
    for b in _mock_beneficiarios:
        edad = _age(b["fecha_nacimiento"])
        etapa = _etapa_vida(edad)
        etapas[etapa] = etapas.get(etapa, 0) + 1

    # Tipos de espina bífida
    tipos: dict[str, int] = {}
    for b in _mock_beneficiarios:
        t = b["tipo_espina_bifida"]
        tipos[t] = tipos.get(t, 0) + 1

    # Servicios en rango
    servicios = list(_mock_servicios)
    if fecha_inicio:
        servicios = [s for s in servicios if s["fecha"] >= fecha_inicio]
    if fecha_fin:
        servicios = [s for s in servicios if s["fecha"] <= fecha_fin]

    total_servicios = len(servicios)
    total_inversion = sum(s["monto"] for s in servicios)

    return {
        "titulo": "Reporte para Fundaciones Donantes",
        "fecha_generacion": date.today().isoformat(),
        "rango": {
            "inicio": fecha_inicio or "Sin filtro",
            "fin": fecha_fin or "Sin filtro",
        },
        "poblacion": {
            "total_beneficiarios": total_beneficiarios,
            "activos": activos,
            "por_genero": {"labels": ["Masculino", "Femenino"], "values": [masculino, femenino]},
            "por_etapa_vida": {"labels": list(etapas.keys()), "values": list(etapas.values())},
            "por_tipo_espina_bifida": {"labels": list(tipos.keys()), "values": list(tipos.values())},
        },
        "impacto": {
            "total_servicios_otorgados": total_servicios,
            "inversion_total": total_inversion,
            "promedio_por_servicio": round(total_inversion / total_servicios, 2) if total_servicios else 0,
        },
        "mensaje": "Gracias a su apoyo, la Asociación de Espina Bífida continúa brindando atención integral a personas con esta condición en el noreste de México.",
    }
