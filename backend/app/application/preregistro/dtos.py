import re
from pydantic import BaseModel, field_validator
from typing import Optional, List

from app.application.beneficiarios.dtos import _normalizar_correo, _normalizar_fecha_iso

__all__ = ["PreRegistroCreate", "AprobarPreRegistroData"]

_CURP_RE = re.compile(
    r'^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])'
    r'[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|'
    r'OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$'
)

_CUOTA_A = 'CUOTA A'
_CUOTA_B = 'CUOTA B'

_TIPO_CUOTA_MAP = {
    'A': _CUOTA_A,
    'B': _CUOTA_B,
    _CUOTA_A: _CUOTA_A,
    _CUOTA_B: _CUOTA_B,
}


def _validar_curp(v: str) -> str:
    v = v.strip().upper()
    if not _CURP_RE.match(v):
        raise ValueError('El CURP no tiene el formato oficial mexicano (18 caracteres).')
    return v


def _normalizar_tipo_cuota(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    normalized = v.strip().upper()
    if normalized not in _TIPO_CUOTA_MAP:
        raise ValueError('tipo_cuota debe ser CUOTA A o CUOTA B.')
    return _TIPO_CUOTA_MAP[normalized]


# ── DTOs ──────────────────────────────────────────────────────────────────────

class PreRegistroCreate(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    curp: str
    estado_nacimiento: Optional[str] = None
    hospital_nacimiento: Optional[str] = None
    nombre_padre_madre: Optional[str] = None
    direccion: Optional[str] = None
    colonia: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono_casa: Optional[str] = None
    telefono_celular: Optional[str] = None
    correo_electronico: Optional[str] = None
    en_emergencia_avisar_a: Optional[str] = None
    telefono_emergencia: Optional[str] = None
    tipo_sangre: Optional[str] = None
    usa_valvula: Optional[str] = "N"
    tipo_cuota: Optional[str] = None
    notas_adicionales: Optional[str] = None
    paso_actual: int = 1
    tipos_espina: Optional[List[int]] = None

    @field_validator('curp')
    @classmethod
    def _validar_curp(cls, v: str) -> str:
        return _validar_curp(v)

    @field_validator('tipo_cuota')
    @classmethod
    def _validar_tipo_cuota(cls, v: Optional[str]) -> Optional[str]:
        return _normalizar_tipo_cuota(v)

    @field_validator('correo_electronico', mode='before')
    @classmethod
    def _validar_correo(cls, v) -> str | None:
        return _normalizar_correo(v)

    @field_validator('fecha_nacimiento', mode='before')
    @classmethod
    def _validar_fecha_nacimiento(cls, v) -> str | None:
        return _normalizar_fecha_iso(v, 'fecha_nacimiento')


class AprobarPreRegistroData(BaseModel):
    tipo_cuota: Optional[str] = None

    @field_validator('tipo_cuota')
    @classmethod
    def _validar_tipo_cuota(cls, v: Optional[str]) -> Optional[str]:
        return _normalizar_tipo_cuota(v)


# kept for backward compat (test_preregistro_dtos imports it)
normalize_tipo_cuota = _normalizar_tipo_cuota
