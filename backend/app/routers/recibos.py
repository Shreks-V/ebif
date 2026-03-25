from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import date, datetime, timedelta
from app.core.security import get_current_user
from app.schemas.schemas import ReciboCreate, ReciboResponse

router = APIRouter()

# ──────────────────────────── MOCK DATA ────────────────────────────

mock_recibos = [
    {
        "id": 1,
        "folio": "REC-000001",
        "beneficiario": "María Fernanda García López",
        "fecha": "2026-03-20",
        "total": 100.00,
        "metodo_pago": "Efectivo",
        "tipo": "cuota",
        "detalle": "Cuota mensual marzo 2026",
    },
    {
        "id": 2,
        "folio": "REC-000002",
        "beneficiario": "Carlos Eduardo Martínez Hernández",
        "fecha": "2026-03-18",
        "total": 1200.00,
        "metodo_pago": "Transferencia",
        "tipo": "cuota",
        "detalle": "Cuota anual 2026",
    },
    {
        "id": 3,
        "folio": "REC-000003",
        "beneficiario": "Diego Alejandro Treviño Salazar",
        "fecha": "2026-03-15",
        "total": 150.00,
        "metodo_pago": "Efectivo",
        "tipo": "cuota",
        "detalle": "Cuota mensual marzo 2026 + cateterismo",
    },
    {
        "id": 4,
        "folio": "REC-000004",
        "beneficiario": "Sofía Rodríguez Garza",
        "fecha": "2026-03-14",
        "total": 200.00,
        "metodo_pago": "Tarjeta",
        "tipo": "cuota",
        "detalle": "Terapia física sesión marzo",
    },
    {
        "id": 5,
        "folio": "REC-000005",
        "beneficiario": "José Manuel Ramírez Ochoa",
        "fecha": "2026-03-12",
        "total": 0.00,
        "metodo_pago": "N/A",
        "tipo": "exento",
        "detalle": "Exento de cuota - caso especial",
    },
    {
        "id": 6,
        "folio": "REC-000006",
        "beneficiario": "Valentina Flores Cantú",
        "fecha": "2026-03-10",
        "total": 100.00,
        "metodo_pago": "Efectivo",
        "tipo": "cuota",
        "detalle": "Cuota mensual marzo 2026",
    },
    {
        "id": 7,
        "folio": "REC-000007",
        "beneficiario": "Ana Lucía Villarreal Mendoza",
        "fecha": "2026-03-08",
        "total": 1200.00,
        "metodo_pago": "Transferencia",
        "tipo": "cuota",
        "detalle": "Cuota anual 2026",
    },
    {
        "id": 8,
        "folio": "REC-000008",
        "beneficiario": "Luis Ángel Salinas Gutiérrez",
        "fecha": "2026-03-05",
        "total": 100.00,
        "metodo_pago": "Efectivo",
        "tipo": "cuota",
        "detalle": "Cuota mensual marzo 2026",
    },
    {
        "id": 9,
        "folio": "REC-000009",
        "beneficiario": "Isabella Lozano Pérez",
        "fecha": "2026-03-03",
        "total": 100.00,
        "metodo_pago": "Transferencia",
        "tipo": "cuota",
        "detalle": "Cuota mensual marzo 2026",
    },
    {
        "id": 10,
        "folio": "REC-000010",
        "beneficiario": "Emiliano Reyes Morales",
        "fecha": "2026-03-01",
        "total": 350.00,
        "metodo_pago": "Efectivo",
        "tipo": "cuota",
        "detalle": "Cuota mensual + estudios urodinámicos",
    },
    {
        "id": 11,
        "folio": "REC-000011",
        "beneficiario": "Ximena Guajardo Tamez",
        "fecha": "2026-02-28",
        "total": 100.00,
        "metodo_pago": "Efectivo",
        "tipo": "cuota",
        "detalle": "Cuota mensual febrero 2026",
    },
    {
        "id": 12,
        "folio": "REC-000012",
        "beneficiario": "Fernando Peña Villarreal",
        "fecha": "2026-02-25",
        "total": 100.00,
        "metodo_pago": "Transferencia",
        "tipo": "cuota",
        "detalle": "Cuota mensual febrero 2026",
    },
]

_next_id = len(mock_recibos) + 1


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.get("/stats/resumen")
def resumen_recibos(current_user: dict = Depends(get_current_user)):
    """Resumen semanal de recibos."""
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    fin_semana = inicio_semana + timedelta(days=6)

    recibos_semana = []
    for r in mock_recibos:
        try:
            fecha_r = datetime.strptime(r["fecha"], "%Y-%m-%d").date()
            if inicio_semana <= fecha_r <= fin_semana:
                recibos_semana.append(r)
        except ValueError:
            pass

    total_semana = sum(r["total"] for r in recibos_semana)
    total_mes = sum(
        r["total"]
        for r in mock_recibos
        if r["fecha"].startswith(hoy.strftime("%Y-%m"))
    )
    cuotas = sum(1 for r in recibos_semana if r["tipo"] == "cuota")
    exentos = sum(1 for r in recibos_semana if r["tipo"] == "exento")

    por_metodo: dict[str, float] = {}
    for r in mock_recibos:
        if r["fecha"].startswith(hoy.strftime("%Y-%m")):
            m = r["metodo_pago"]
            por_metodo[m] = por_metodo.get(m, 0) + r["total"]

    return {
        "semana": {
            "inicio": inicio_semana.isoformat(),
            "fin": fin_semana.isoformat(),
            "total": total_semana,
            "cantidad_recibos": len(recibos_semana),
            "cuotas": cuotas,
            "exentos": exentos,
        },
        "mes": {
            "total": total_mes,
            "cantidad_recibos": sum(
                1
                for r in mock_recibos
                if r["fecha"].startswith(hoy.strftime("%Y-%m"))
            ),
        },
        "por_metodo_pago": por_metodo,
    }


@router.get("/")
def listar_recibos(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Listar recibos con filtros opcionales."""
    resultados = list(mock_recibos)

    if fecha_inicio:
        resultados = [r for r in resultados if r["fecha"] >= fecha_inicio]

    if fecha_fin:
        resultados = [r for r in resultados if r["fecha"] <= fecha_fin]

    if tipo:
        resultados = [r for r in resultados if r["tipo"] == tipo]

    if busqueda:
        q = busqueda.lower()
        resultados = [
            r
            for r in resultados
            if q in r["beneficiario"].lower()
            or q in r["folio"].lower()
            or q in (r.get("detalle") or "").lower()
        ]

    return resultados


@router.post("/", status_code=201)
def crear_recibo(
    data: ReciboCreate, current_user: dict = Depends(get_current_user)
):
    """Crear nuevo recibo."""
    global _next_id
    nuevo = data.model_dump()
    nuevo["id"] = _next_id
    nuevo["folio"] = f"REC-{_next_id:06d}"
    _next_id += 1
    mock_recibos.append(nuevo)
    return nuevo


@router.get("/{id_recibo}")
def obtener_recibo(
    id_recibo: int, current_user: dict = Depends(get_current_user)
):
    """Obtener detalle de un recibo."""
    recibo = next((r for r in mock_recibos if r["id"] == id_recibo), None)
    if recibo is None:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")
    return recibo
