"""Búsqueda global con ranking de relevancia."""
from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.application.beneficiarios import use_cases as ben_service
from app.presentation.api.security import get_current_user

router = APIRouter()

_STOP_WORDS = frozenset({"de", "del", "la", "el", "los", "las", "y", "o", "en", "a", "al"})


def _tokens(text: str) -> list[str]:
    return [w for w in re.split(r"\W+", text.lower()) if w and w not in _STOP_WORDS]


def _score_field(query: str, value: str | None, weight: int) -> int:
    if not value:
        return 0
    q, v = query.lower().strip(), str(value).lower().strip()
    if v == q:
        return weight * 4          # coincidencia exacta
    if v.startswith(q):
        return weight * 2          # prefijo
    if q in v:
        return weight              # contiene
    # todos los tokens del query aparecen como prefijo en el valor
    qtok = _tokens(q)
    vtok = _tokens(v)
    if qtok and all(any(vt.startswith(qt) for vt in vtok) for qt in qtok):
        return weight
    return 0


def _score(q: str, row: dict) -> int:
    nombre_completo = " ".join(filter(None, [row.get("nombre"), row.get("apellido_paterno"), row.get("apellido_materno")]))
    return sum([
        _score_field(q, row.get("folio"), 30),
        _score_field(q, row.get("curp"), 25),
        _score_field(q, nombre_completo, 20),
        _score_field(q, row.get("nombre"), 18),
        _score_field(q, row.get("apellido_paterno"), 15),
        _score_field(q, row.get("municipio"), 8),
        _score_field(q, row.get("estado"), 5),
    ])


@router.get("")
def buscar_global(
    q: str = Query(..., min_length=2, max_length=100, description="Texto a buscar"),
    limit: int = Query(20, ge=1, le=50),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[dict]:
    """
    Búsqueda global con ranking de relevancia.

    Scoring (mayor = más relevante):
    - Folio exacto: 120 pts  |  prefijo: 60  |  contiene: 30
    - CURP exacto: 100 pts   |  prefijo: 50  |  contiene: 25
    - Nombre completo exacto: 80 pts  …
    """
    raw = ben_service.listar_beneficiarios(busqueda=q, current_user=current_user, limit=500)
    scored = [
        {**row, "_score": s, "_tipo": "beneficiario"}
        for row in raw
        if (s := _score(q, row)) > 0
    ]
    scored.sort(key=lambda x: x["_score"], reverse=True)
    return scored[:limit]
