"""Domain-layer calculators and normalizers for beneficiary data.

Pure functions — no I/O, no infrastructure dependencies.
These live in the domain layer because they encode association business rules
(life-stage boundaries, gender codes, geographic checks) that must not bleed
into the infrastructure or presentation layers.
"""
from __future__ import annotations

from datetime import date, datetime


def calculate_age(fecha_nac) -> int:
    """Return the beneficiary's age in completed years, or 0 if unresolvable."""
    if not fecha_nac:
        return 0
    try:
        if isinstance(fecha_nac, str):
            fn = datetime.strptime(fecha_nac, '%Y-%m-%d').date()
        elif isinstance(fecha_nac, datetime):
            fn = fecha_nac.date()
        elif isinstance(fecha_nac, date):
            fn = fecha_nac
        else:
            return 0
        today = date.today()
        return today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))
    except Exception:
        return 0


def etapa_vida(edad: int) -> str:
    """Map an age to the association's life-stage categories."""
    if edad <= 5:
        return 'Primera Infancia (0-5)'
    if edad <= 11:
        return 'Infancia (6-11)'
    if edad <= 17:
        return 'Adolescencia (12-17)'
    if edad <= 29:
        return 'Juventud (18-29)'
    if edad <= 59:
        return 'Adultez (30-59)'
    return 'Adulto Mayor (60+)'


def normalize_genero(value: str | None) -> str | None:
    """Normalize raw gender codes/names to 'Hombre' or 'Mujer'. Returns None for unknown."""
    code = (value or '').strip().upper()
    if code in {'H', 'HOMBRE', 'MASCULINO'}:
        return 'Hombre'
    if code in {'M', 'MUJER', 'F', 'FEMENINO'}:
        return 'Mujer'
    return None


def is_nuevo_leon(value: str | None) -> bool:
    """Return True when the state string refers to Nuevo León (tolerates missing accents)."""
    normalized = (
        (value or '')
        .strip()
        .upper()
        .translate(str.maketrans('ÁÉÍÓÚÜ', 'AEIOUU'))
    )
    return 'NUEVO' in normalized and 'LEON' in normalized
