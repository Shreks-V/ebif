import re
from pydantic import BaseModel, field_validator

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


def _normalizar_tipo_cuota(v: str | None) -> str | None:
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
    apellido_materno: str | None = None
    fecha_nacimiento: str | None = None
    genero: str | None = None
    curp: str
    estado_nacimiento: str | None = None
    hospital_nacimiento: str | None = None
    nombre_padre_madre: str | None = None
    direccion: str | None = None
    colonia: str | None = None
    ciudad: str | None = None
    estado: str | None = None
    codigo_postal: str | None = None
    telefono_casa: str | None = None
    telefono_celular: str | None = None
    correo_electronico: str | None = None
    en_emergencia_avisar_a: str | None = None
    telefono_emergencia: str | None = None
    tipo_sangre: str | None = None
    usa_valvula: str | None = "N"
    tipo_cuota: str | None = None
    notas_adicionales: str | None = None
    paso_actual: int = 1
    tipos_espina: list[int] | None = None

    @field_validator('curp')
    @classmethod
    def _validar_curp(cls, v: str) -> str:
        return _validar_curp(v)

    @field_validator('tipo_cuota')
    @classmethod
    def _validar_tipo_cuota(cls, v: str | None) -> str | None:
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
    tipo_cuota: str | None = None

    @field_validator('tipo_cuota')
    @classmethod
    def _validar_tipo_cuota(cls, v: str | None) -> str | None:
        return _normalizar_tipo_cuota(v)


# kept for backward compat (test_preregistro_dtos imports it)
normalize_tipo_cuota = _normalizar_tipo_cuota
