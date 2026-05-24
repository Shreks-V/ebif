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


# ── Private helpers — one per metric section ──────────────────────────────────

def _calc_dist_edades(beneficiarios: list[dict]) -> dict:
    edades = sorted(
        e for b in beneficiarios
        if (e := _edad_anios(b.get("fecha_nacimiento"))) is not None
    )
    return {
        "total_con_fecha": len(edades),
        "p25": _percentile(edades, 25),
        "p50": _percentile(edades, 50),
        "p75": _percentile(edades, 75),
        "min": float(edades[0]) if edades else None,
        "max": float(edades[-1]) if edades else None,
        "promedio": round(statistics.mean(edades), 1) if edades else None,
        "desviacion_std": round(statistics.pstdev(edades), 1) if len(edades) > 1 else None,
    }


def _calc_geo_top5(beneficiarios: list[dict]) -> list[dict]:
    total = len(beneficiarios)
    municipios: dict[str, int] = {}
    for b in beneficiarios:
        m = (b.get("municipio") or "Sin municipio").strip()
        municipios[m] = municipios.get(m, 0) + 1
    return [
        {"municipio": k, "total": v, "pct": round(v / total * 100, 1) if total else 0}
        for k, v in sorted(municipios.items(), key=lambda x: x[1], reverse=True)[:5]
    ]


def _calc_top_estados(beneficiarios: list[dict], total: int) -> list[dict]:
    estados_cnt: dict[str, int] = {}
    for b in beneficiarios:
        e = (b.get("estado") or "Sin estado").strip()
        estados_cnt[e] = estados_cnt.get(e, 0) + 1
    return [
        {"estado": k, "total": v, "pct": round(v / total * 100, 1) if total else 0}
        for k, v in sorted(estados_cnt.items(), key=lambda x: x[1], reverse=True)[:8]
    ]


def _calc_tendencia_semanal(beneficiarios: list[dict], hoy: date) -> list[dict]:
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
    return semanas


def _calc_tendencia_mensual(beneficiarios: list[dict], hoy: date) -> list[dict]:
    meses = []
    for i in range(5, -1, -1):
        primer_dia = (hoy.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if primer_dia.month == 12:
            ultimo_dia = primer_dia.replace(year=primer_dia.year + 1, month=1, day=1)
        else:
            ultimo_dia = primer_dia.replace(month=primer_dia.month + 1, day=1)
        count = sum(
            1 for b in beneficiarios
            if b.get("fecha_alta")
            and primer_dia.isoformat() <= str(b["fecha_alta"])[:10] < ultimo_dia.isoformat()
        )
        meses.append({
            "mes": primer_dia.strftime("%b %Y"),
            "inicio": primer_dia.isoformat(),
            "fin": ultimo_dia.isoformat(),
            "nuevos": count,
        })
    return meses


def _calc_membresias(beneficiarios: list[dict], total: int) -> dict:
    activos = sum(1 for b in beneficiarios if b.get("membresia_estatus") == "ACTIVO")
    vencidos = sum(1 for b in beneficiarios if b.get("membresia_estatus") == "VENCIDO")
    return {
        "activas": activos,
        "vencidas": vencidos,
        "sin_membresia": total - activos - vencidos,
        "tasa_retencion_pct": round(activos / total * 100, 1) if total else 0,
    }


def _calc_dist_genero(beneficiarios: list[dict], total: int) -> list[dict]:
    genero_cnt: dict[str, int] = {"Masculino": 0, "Femenino": 0, "No especificado": 0}
    for b in beneficiarios:
        g = (b.get("genero") or "").strip()
        if g in ("Masculino", "Hombre", "M"):
            genero_cnt["Masculino"] += 1
        elif g in ("Femenino", "Mujer", "F"):
            genero_cnt["Femenino"] += 1
        else:
            genero_cnt["No especificado"] += 1
    return [
        {"label": k, "total": v, "pct": round(v / total * 100, 1) if total else 0}
        for k, v in genero_cnt.items()
    ]


def _calc_uso_valvula(beneficiarios: list[dict], total: int) -> dict:
    con_valvula = sum(1 for b in beneficiarios if str(b.get("usa_valvula", "")).upper() == "S")
    return {
        "con_valvula": con_valvula,
        "sin_valvula": total - con_valvula,
        "pct_con_valvula": round(con_valvula / total * 100, 1) if total else 0,
    }


def _calc_dist_cuotas(beneficiarios: list[dict], total: int) -> list[dict]:
    cuotas: dict[str, int] = {}
    for b in beneficiarios:
        c = (b.get("tipo_cuota") or "Sin cuota").strip()
        cuotas[c] = cuotas.get(c, 0) + 1
    return [
        {"tipo_cuota": k, "total": v, "pct": round(v / total * 100, 1) if total else 0}
        for k, v in sorted(cuotas.items(), key=lambda x: x[1], reverse=True)
    ]


def _calc_dist_espinas(beneficiarios: list[dict]) -> list[dict]:
    espinas: dict[str, int] = {}
    for b in beneficiarios:
        for te in (b.get("tipos_espina") or []):
            nombre_espina = (te.get("nombre") or "Otro").strip()
            espinas[nombre_espina] = espinas.get(nombre_espina, 0) + 1
    total_espinas = sum(espinas.values()) or 1
    return [
        {"nombre": k, "total": v, "pct": round(v / total_espinas * 100, 1)}
        for k, v in sorted(espinas.items(), key=lambda x: x[1], reverse=True)
    ]


# ── Router endpoint ───────────────────────────────────────────────────────────

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
    total = len(beneficiarios)
    hoy = date.today()

    return {
        "total_beneficiarios": total,
        "distribucion_edades": _calc_dist_edades(beneficiarios),
        "concentracion_geografica": _calc_geo_top5(beneficiarios),
        "top_estados": _calc_top_estados(beneficiarios, total),
        "tendencia_semanal": _calc_tendencia_semanal(beneficiarios, hoy),
        "tendencia_mensual": _calc_tendencia_mensual(beneficiarios, hoy),
        "membresias": _calc_membresias(beneficiarios, total),
        "distribucion_genero": _calc_dist_genero(beneficiarios, total),
        "uso_valvula": _calc_uso_valvula(beneficiarios, total),
        "distribucion_cuotas": _calc_dist_cuotas(beneficiarios, total),
        "tipos_espina_prevalencia": _calc_dist_espinas(beneficiarios),
    }
