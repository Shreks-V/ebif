"""Dashboard — métricas avanzadas calculadas server-side."""
from __future__ import annotations

import statistics
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends

from app.application.beneficiarios import use_cases as ben_service
from app.presentation.api.security import get_current_user

router = APIRouter()


def _edad_anios(fecha_nacimiento: str | None) -> int | None:
    if not fecha_nacimiento:
        return None
    try:
        nac = date.fromisoformat(str(fecha_nacimiento)[:10])
        return (date.today() - nac).days // 365
    except Exception:
        return None


def _percentile(sorted_vals: list[float], p: int) -> float | None:
    if not sorted_vals:
        return None
    idx = max(0, int(len(sorted_vals) * p / 100) - 1)
    return float(sorted_vals[idx])


@router.get("")
def metricas_avanzadas(
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    """
    Métricas agregadas calculadas en el servidor:

    - **distribucion_edades**: percentiles p25/p50/p75, min, max, promedio
    - **concentracion_geografica**: top-5 municipios por número de beneficiarios
    - **tendencia_beneficiarios**: nuevos registros por semana (últimas 5 semanas)
    - **membresias**: activas, vencidas, tasa de retención
    """
    beneficiarios = ben_service.listar_beneficiarios(current_user=current_user, limit=5000)

    # ── Distribución de edades con percentiles ────────────────────────
    edades = sorted(
        e for b in beneficiarios
        if (e := _edad_anios(b.get("fecha_nacimiento"))) is not None
    )
    dist_edad: dict = {
        "total_con_fecha": len(edades),
        "p25": _percentile(edades, 25),
        "p50": _percentile(edades, 50),
        "p75": _percentile(edades, 75),
        "min": float(edades[0]) if edades else None,
        "max": float(edades[-1]) if edades else None,
        "promedio": round(statistics.mean(edades), 1) if edades else None,
        "desviacion_std": round(statistics.pstdev(edades), 1) if len(edades) > 1 else None,
    }

    # ── Top-5 municipios ──────────────────────────────────────────────
    municipios: dict[str, int] = {}
    for b in beneficiarios:
        m = (b.get("municipio") or "Sin municipio").strip()
        municipios[m] = municipios.get(m, 0) + 1
    geo_top5 = [
        {"municipio": k, "total": v, "pct": round(v / len(beneficiarios) * 100, 1) if beneficiarios else 0}
        for k, v in sorted(municipios.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # ── Tendencia semanal (últimas 5 semanas) ─────────────────────────
    hoy = date.today()
    semanas = []
    for i in range(4, -1, -1):
        inicio = hoy - timedelta(weeks=i + 1)
        fin = hoy - timedelta(weeks=i)
        count = sum(
            1 for b in beneficiarios
            if b.get("fecha_alta") and inicio.isoformat() <= str(b["fecha_alta"])[:10] < fin.isoformat()
        )
        semanas.append({
            "etiqueta": "actual" if i == 0 else f"hace {i}w",
            "inicio": inicio.isoformat(),
            "fin": fin.isoformat(),
            "nuevos": count,
        })

    # ── Membresías ────────────────────────────────────────────────────
    total = len(beneficiarios)
    activos = sum(1 for b in beneficiarios if b.get("membresia_estatus") == "ACTIVO")
    vencidos = sum(1 for b in beneficiarios if b.get("membresia_estatus") == "VENCIDO")
    membresias = {
        "activas": activos,
        "vencidas": vencidos,
        "sin_membresia": total - activos - vencidos,
        "tasa_retencion_pct": round(activos / total * 100, 1) if total else 0,
    }

    return {
        "total_beneficiarios": total,
        "distribucion_edades": dist_edad,
        "concentracion_geografica": geo_top5,
        "tendencia_semanal": semanas,
        "membresias": membresias,
    }
