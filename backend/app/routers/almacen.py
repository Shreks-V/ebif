from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import date, datetime, timedelta
from app.core.security import get_current_user
from app.schemas.schemas import ProductoCreate, ServicioOtorgado, Comodato

router = APIRouter()

# ──────────────────────────── MOCK DATA – PRODUCTOS ────────────────────────────

mock_productos = [
    {
        "id_producto": 1,
        "clave": "MED-001",
        "nombre": "Oxibutinina 5mg",
        "descripcion": "Anticolinérgico para vejiga neurogénica",
        "categoria": "Medicamento",
        "unidad": "Caja (30 tabletas)",
        "cuota_recuperacion": 85.00,
        "cantidad_disponible": 45,
        "stock_minimo": 10,
        "fecha_caducidad": "2027-06-15",
        "estatus": "Disponible",
    },
    {
        "id_producto": 2,
        "clave": "MED-002",
        "nombre": "Baclofeno 10mg",
        "descripcion": "Relajante muscular para espasticidad",
        "categoria": "Medicamento",
        "unidad": "Caja (30 tabletas)",
        "cuota_recuperacion": 120.00,
        "cantidad_disponible": 30,
        "stock_minimo": 10,
        "fecha_caducidad": "2027-03-20",
        "estatus": "Disponible",
    },
    {
        "id_producto": 3,
        "clave": "MED-003",
        "nombre": "Gabapentina 300mg",
        "descripcion": "Para dolor neuropático",
        "categoria": "Medicamento",
        "unidad": "Caja (30 cápsulas)",
        "cuota_recuperacion": 95.00,
        "cantidad_disponible": 25,
        "stock_minimo": 8,
        "fecha_caducidad": "2026-12-10",
        "estatus": "Disponible",
    },
    {
        "id_producto": 4,
        "clave": "MED-004",
        "nombre": "Trimetoprima/Sulfametoxazol",
        "descripcion": "Antibiótico para infecciones urinarias",
        "categoria": "Medicamento",
        "unidad": "Caja (20 tabletas)",
        "cuota_recuperacion": 65.00,
        "cantidad_disponible": 50,
        "stock_minimo": 15,
        "fecha_caducidad": "2027-01-30",
        "estatus": "Disponible",
    },
    {
        "id_producto": 5,
        "clave": "MED-005",
        "nombre": "Nitrofurantoína 100mg",
        "descripcion": "Antiséptico urinario",
        "categoria": "Medicamento",
        "unidad": "Caja (40 cápsulas)",
        "cuota_recuperacion": 75.00,
        "cantidad_disponible": 3,
        "stock_minimo": 10,
        "fecha_caducidad": "2026-08-15",
        "estatus": "Disponible",
    },
    {
        "id_producto": 6,
        "clave": "MAT-001",
        "nombre": "Sonda Nelaton No. 8",
        "descripcion": "Sonda para cateterismo intermitente pediátrico",
        "categoria": "Material",
        "unidad": "Pieza",
        "cuota_recuperacion": 15.00,
        "cantidad_disponible": 200,
        "stock_minimo": 50,
        "fecha_caducidad": "2028-01-01",
        "estatus": "Disponible",
    },
    {
        "id_producto": 7,
        "clave": "MAT-002",
        "nombre": "Sonda Nelaton No. 12",
        "descripcion": "Sonda para cateterismo intermitente adulto",
        "categoria": "Material",
        "unidad": "Pieza",
        "cuota_recuperacion": 18.00,
        "cantidad_disponible": 150,
        "stock_minimo": 40,
        "fecha_caducidad": "2028-01-01",
        "estatus": "Disponible",
    },
    {
        "id_producto": 8,
        "clave": "MAT-003",
        "nombre": "Gel lubricante estéril",
        "descripcion": "Lubricante para cateterismo",
        "categoria": "Material",
        "unidad": "Tubo 100ml",
        "cuota_recuperacion": 35.00,
        "cantidad_disponible": 80,
        "stock_minimo": 20,
        "fecha_caducidad": "2027-09-01",
        "estatus": "Disponible",
    },
    {
        "id_producto": 9,
        "clave": "MAT-004",
        "nombre": "Pañales adulto talla M",
        "descripcion": "Pañal desechable para adulto",
        "categoria": "Material",
        "unidad": "Paquete (10 piezas)",
        "cuota_recuperacion": 55.00,
        "cantidad_disponible": 60,
        "stock_minimo": 20,
        "fecha_caducidad": None,
        "estatus": "Disponible",
    },
    {
        "id_producto": 10,
        "clave": "MAT-005",
        "nombre": "Guantes de látex talla M",
        "descripcion": "Guantes desechables para procedimientos",
        "categoria": "Material",
        "unidad": "Caja (100 piezas)",
        "cuota_recuperacion": 45.00,
        "cantidad_disponible": 4,
        "stock_minimo": 10,
        "fecha_caducidad": "2027-06-01",
        "estatus": "Disponible",
    },
    {
        "id_producto": 11,
        "clave": "EQU-001",
        "nombre": "Silla de ruedas estándar",
        "descripcion": "Silla de ruedas plegable para adulto",
        "categoria": "Equipo",
        "unidad": "Pieza",
        "cuota_recuperacion": 0.00,
        "cantidad_disponible": 8,
        "stock_minimo": 3,
        "fecha_caducidad": None,
        "estatus": "Disponible",
    },
    {
        "id_producto": 12,
        "clave": "EQU-002",
        "nombre": "Silla de ruedas pediátrica",
        "descripcion": "Silla de ruedas plegable para niño",
        "categoria": "Equipo",
        "unidad": "Pieza",
        "cuota_recuperacion": 0.00,
        "cantidad_disponible": 5,
        "stock_minimo": 2,
        "fecha_caducidad": None,
        "estatus": "Disponible",
    },
    {
        "id_producto": 13,
        "clave": "EQU-003",
        "nombre": "Muletas axilares aluminio",
        "descripcion": "Par de muletas ajustables",
        "categoria": "Equipo",
        "unidad": "Par",
        "cuota_recuperacion": 0.00,
        "cantidad_disponible": 12,
        "stock_minimo": 5,
        "fecha_caducidad": None,
        "estatus": "Disponible",
    },
    {
        "id_producto": 14,
        "clave": "EQU-004",
        "nombre": "Andadera plegable",
        "descripcion": "Andadera de aluminio con ruedas frontales",
        "categoria": "Equipo",
        "unidad": "Pieza",
        "cuota_recuperacion": 0.00,
        "cantidad_disponible": 6,
        "stock_minimo": 3,
        "fecha_caducidad": None,
        "estatus": "Disponible",
    },
    {
        "id_producto": 15,
        "clave": "EQU-005",
        "nombre": "Órtesis tobillo-pie (AFO)",
        "descripcion": "Férula ortopédica para pie y tobillo",
        "categoria": "Equipo",
        "unidad": "Pieza",
        "cuota_recuperacion": 0.00,
        "cantidad_disponible": 2,
        "stock_minimo": 3,
        "fecha_caducidad": None,
        "estatus": "Disponible",
    },
    {
        "id_producto": 16,
        "clave": "MAT-006",
        "nombre": "Bolsa colectora de orina",
        "descripcion": "Bolsa recolectora de pierna 750ml",
        "categoria": "Material",
        "unidad": "Pieza",
        "cuota_recuperacion": 25.00,
        "cantidad_disponible": 40,
        "stock_minimo": 15,
        "fecha_caducidad": "2027-12-01",
        "estatus": "Disponible",
    },
]

# ──────────────────────────── MOCK DATA – SERVICIOS OTORGADOS ────────────────────────────

mock_servicios = [
    {
        "id": 1,
        "folio_beneficiario": "BEN-000001",
        "nombre_beneficiario": "María Fernanda García López",
        "tipo_servicio": "Consulta Neurocirugía",
        "fecha": "2026-03-15",
        "monto_pagado": 150.00,
        "notas": "Revisión postquirúrgica satisfactoria",
    },
    {
        "id": 2,
        "folio_beneficiario": "BEN-000004",
        "nombre_beneficiario": "Diego Alejandro Treviño Salazar",
        "tipo_servicio": "Consulta Urología",
        "fecha": "2026-03-14",
        "monto_pagado": 150.00,
        "notas": "Estudios urodinámicos normales",
    },
    {
        "id": 3,
        "folio_beneficiario": "BEN-000002",
        "nombre_beneficiario": "Carlos Eduardo Martínez Hernández",
        "tipo_servicio": "Terapia Física",
        "fecha": "2026-03-13",
        "monto_pagado": 200.00,
        "notas": "Sesión de rehabilitación",
    },
    {
        "id": 4,
        "folio_beneficiario": "BEN-000009",
        "nombre_beneficiario": "Isabella Lozano Pérez",
        "tipo_servicio": "Consulta Pediatría",
        "fecha": "2026-03-12",
        "monto_pagado": 100.00,
        "notas": "Control de peso y talla",
    },
    {
        "id": 5,
        "folio_beneficiario": "BEN-000006",
        "nombre_beneficiario": "José Manuel Ramírez Ochoa",
        "tipo_servicio": "Consulta Ortopedia",
        "fecha": "2026-03-10",
        "monto_pagado": 150.00,
        "notas": "Evaluación de equipo ortopédico",
    },
    {
        "id": 6,
        "folio_beneficiario": "BEN-000005",
        "nombre_beneficiario": "Valentina Flores Cantú",
        "tipo_servicio": "Consulta Neurología",
        "fecha": "2026-03-08",
        "monto_pagado": 180.00,
        "notas": "Seguimiento trimestral",
    },
    {
        "id": 7,
        "folio_beneficiario": "BEN-000012",
        "nombre_beneficiario": "Emiliano Reyes Morales",
        "tipo_servicio": "Estudios Urodinámicos",
        "fecha": "2026-03-05",
        "monto_pagado": 350.00,
        "notas": "Estudio completo",
    },
    {
        "id": 8,
        "folio_beneficiario": "BEN-000003",
        "nombre_beneficiario": "Sofía Rodríguez Garza",
        "tipo_servicio": "Terapia Física",
        "fecha": "2026-03-03",
        "monto_pagado": 200.00,
        "notas": "Terapia de fortalecimiento",
    },
    {
        "id": 9,
        "folio_beneficiario": "BEN-000008",
        "nombre_beneficiario": "Luis Ángel Salinas Gutiérrez",
        "tipo_servicio": "Consulta Urología",
        "fecha": "2026-02-28",
        "monto_pagado": 150.00,
        "notas": "Revisión semestral",
    },
    {
        "id": 10,
        "folio_beneficiario": "BEN-000015",
        "nombre_beneficiario": "Ximena Guajardo Tamez",
        "tipo_servicio": "Consulta Pediatría",
        "fecha": "2026-02-25",
        "monto_pagado": 100.00,
        "notas": "Control de desarrollo",
    },
]

# ──────────────────────────── MOCK DATA – COMODATOS ────────────────────────────

mock_comodatos = [
    {
        "id": 1,
        "folio_comodato": "COM-000001",
        "folio_beneficiario": "BEN-000006",
        "nombre_beneficiario": "José Manuel Ramírez Ochoa",
        "equipo": "Silla de ruedas estándar",
        "fecha_inicio": "2025-06-15",
        "fecha_devolucion": None,
        "monto_total": 0.00,
        "monto_pagado": 0.00,
        "saldo_pendiente": 0.00,
        "estatus": "PRESTADO",
    },
    {
        "id": 2,
        "folio_comodato": "COM-000002",
        "folio_beneficiario": "BEN-000001",
        "nombre_beneficiario": "María Fernanda García López",
        "equipo": "Silla de ruedas pediátrica",
        "fecha_inicio": "2025-08-20",
        "fecha_devolucion": None,
        "monto_total": 0.00,
        "monto_pagado": 0.00,
        "saldo_pendiente": 0.00,
        "estatus": "PRESTADO",
    },
    {
        "id": 3,
        "folio_comodato": "COM-000003",
        "folio_beneficiario": "BEN-000012",
        "nombre_beneficiario": "Emiliano Reyes Morales",
        "equipo": "Muletas axilares aluminio",
        "fecha_inicio": "2025-09-10",
        "fecha_devolucion": "2026-01-15",
        "monto_total": 0.00,
        "monto_pagado": 0.00,
        "saldo_pendiente": 0.00,
        "estatus": "DEVUELTO",
    },
    {
        "id": 4,
        "folio_comodato": "COM-000004",
        "folio_beneficiario": "BEN-000010",
        "nombre_beneficiario": "Andrés De la Garza Ríos",
        "equipo": "Silla de ruedas estándar",
        "fecha_inicio": "2025-04-01",
        "fecha_devolucion": None,
        "monto_total": 0.00,
        "monto_pagado": 0.00,
        "saldo_pendiente": 0.00,
        "estatus": "PRESTADO",
    },
    {
        "id": 5,
        "folio_comodato": "COM-000005",
        "folio_beneficiario": "BEN-000004",
        "nombre_beneficiario": "Diego Alejandro Treviño Salazar",
        "equipo": "Órtesis tobillo-pie (AFO)",
        "fecha_inicio": "2025-11-20",
        "fecha_devolucion": None,
        "monto_total": 0.00,
        "monto_pagado": 0.00,
        "saldo_pendiente": 0.00,
        "estatus": "PRESTADO",
    },
    {
        "id": 6,
        "folio_comodato": "COM-000006",
        "folio_beneficiario": "BEN-000014",
        "nombre_beneficiario": "Roberto Chávez Banda",
        "equipo": "Andadera plegable",
        "fecha_inicio": "2025-07-05",
        "fecha_devolucion": "2025-12-20",
        "monto_total": 0.00,
        "monto_pagado": 0.00,
        "saldo_pendiente": 0.00,
        "estatus": "CANCELADO",
    },
]

_next_producto_id = len(mock_productos) + 1
_next_servicio_id = len(mock_servicios) + 1
_next_comodato_id = len(mock_comodatos) + 1


# ──────────────────────────── ENDPOINTS – PRODUCTOS ────────────────────────────


@router.get("/productos")
def listar_productos(
    categoria: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar productos del almacén con filtros opcionales."""
    resultados = list(mock_productos)

    if categoria:
        resultados = [p for p in resultados if p["categoria"] == categoria]

    if estatus:
        resultados = [p for p in resultados if p["estatus"] == estatus]

    if busqueda:
        q = busqueda.lower()
        resultados = [
            p
            for p in resultados
            if q in p["nombre"].lower()
            or q in (p.get("descripcion") or "").lower()
            or q in p["clave"].lower()
        ]

    return resultados


@router.post("/productos", status_code=201)
def crear_producto(
    data: ProductoCreate, current_user: dict = Depends(get_current_user)
):
    """Agregar nuevo producto al almacén."""
    global _next_producto_id
    nuevo = data.model_dump()
    nuevo["id_producto"] = _next_producto_id
    _next_producto_id += 1
    mock_productos.append(nuevo)
    return nuevo


@router.put("/productos/{id_producto}")
def actualizar_producto(
    id_producto: int,
    data: ProductoCreate,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar producto existente."""
    for i, p in enumerate(mock_productos):
        if p["id_producto"] == id_producto:
            updated = data.model_dump()
            updated["id_producto"] = id_producto
            mock_productos[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Producto no encontrado")


# ──────────────────────────── ENDPOINTS – SERVICIOS ────────────────────────────


@router.get("/servicios")
def listar_servicios(
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar servicios otorgados."""
    resultados = list(mock_servicios)
    if busqueda:
        q = busqueda.lower()
        resultados = [
            s
            for s in resultados
            if q in s["nombre_beneficiario"].lower()
            or q in s["tipo_servicio"].lower()
            or q in s["folio_beneficiario"].lower()
        ]
    return resultados


@router.post("/servicios", status_code=201)
def registrar_servicio(
    data: ServicioOtorgado, current_user: dict = Depends(get_current_user)
):
    """Registrar nuevo servicio otorgado."""
    global _next_servicio_id
    nuevo = data.model_dump()
    nuevo["id"] = _next_servicio_id
    _next_servicio_id += 1
    mock_servicios.append(nuevo)
    return nuevo


# ──────────────────────────── ENDPOINTS – COMODATOS ────────────────────────────


@router.get("/comodatos")
def listar_comodatos(
    estatus: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar comodatos (préstamos de equipo)."""
    resultados = list(mock_comodatos)
    if estatus:
        resultados = [c for c in resultados if c["estatus"] == estatus]
    if busqueda:
        q = busqueda.lower()
        resultados = [
            c
            for c in resultados
            if q in c["nombre_beneficiario"].lower()
            or q in c["equipo"].lower()
            or q in c["folio_beneficiario"].lower()
        ]
    return resultados


@router.post("/comodatos", status_code=201)
def registrar_comodato(
    data: Comodato, current_user: dict = Depends(get_current_user)
):
    """Registrar nuevo comodato."""
    global _next_comodato_id
    nuevo = data.model_dump()
    nuevo["id"] = _next_comodato_id
    nuevo["folio_comodato"] = f"COM-{_next_comodato_id:06d}"
    _next_comodato_id += 1
    mock_comodatos.append(nuevo)
    return nuevo


@router.put("/comodatos/{id_comodato}")
def actualizar_comodato(
    id_comodato: int,
    data: Comodato,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar estatus de comodato."""
    for i, c in enumerate(mock_comodatos):
        if c["id"] == id_comodato:
            updated = data.model_dump()
            updated["id"] = id_comodato
            updated["folio_comodato"] = c["folio_comodato"]
            mock_comodatos[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Comodato no encontrado")


# ──────────────────────────── ENDPOINTS – STATS ────────────────────────────


@router.get("/stats")
def almacen_stats(current_user: dict = Depends(get_current_user)):
    """Estadísticas del almacén para dashboard."""
    total_productos = len(mock_productos)
    total_unidades = sum(p["cantidad_disponible"] for p in mock_productos)

    # Alerta de stock bajo
    stock_bajo = [
        {
            "id_producto": p["id_producto"],
            "clave": p["clave"],
            "nombre": p["nombre"],
            "cantidad_disponible": p["cantidad_disponible"],
            "stock_minimo": p["stock_minimo"],
        }
        for p in mock_productos
        if p["cantidad_disponible"] < p["stock_minimo"]
    ]

    # Próximos a caducar (dentro de 6 meses)
    hoy = date.today()
    limite = hoy + timedelta(days=180)
    proximos_caducar = []
    for p in mock_productos:
        if p["fecha_caducidad"]:
            try:
                fc = datetime.strptime(p["fecha_caducidad"], "%Y-%m-%d").date()
                if fc <= limite:
                    proximos_caducar.append(
                        {
                            "id_producto": p["id_producto"],
                            "clave": p["clave"],
                            "nombre": p["nombre"],
                            "fecha_caducidad": p["fecha_caducidad"],
                            "dias_restantes": (fc - hoy).days,
                        }
                    )
            except ValueError:
                pass

    por_categoria = {}
    for p in mock_productos:
        cat = p["categoria"]
        por_categoria[cat] = por_categoria.get(cat, 0) + 1

    comodatos_activos = sum(
        1 for c in mock_comodatos if c["estatus"] == "PRESTADO"
    )

    return {
        "total_productos": total_productos,
        "total_unidades": total_unidades,
        "stock_bajo": stock_bajo,
        "alertas_stock_bajo": len(stock_bajo),
        "proximos_caducar": proximos_caducar,
        "alertas_caducidad": len(proximos_caducar),
        "por_categoria": por_categoria,
        "comodatos_activos": comodatos_activos,
        "total_servicios_mes": len(
            [
                s
                for s in mock_servicios
                if s["fecha"].startswith(hoy.strftime("%Y-%m"))
            ]
        ),
    }
