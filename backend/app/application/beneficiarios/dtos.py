from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date


def _normalizar_correo(v) -> str | None:
    """Returns None for blank/None, raises ValueError for invalid format."""
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    if "@" not in s or "." not in s.rsplit("@", 1)[-1]:
        raise ValueError("correo_electronico no tiene un formato válido")
    return s


def _normalizar_fecha_iso(v, campo: str) -> str | None:
    """Returns None for blank/None, truncates to YYYY-MM-DD, raises ValueError for invalid."""
    if v is None or v == "":
        return None
    if not isinstance(v, str):
        return v
    s = v.strip()
    if len(s) < 10:
        raise ValueError(f"{campo} debe ser YYYY-MM-DD")
    head = s[:10]
    try:
        date.fromisoformat(head)
    except ValueError as exc:
        raise ValueError(f"{campo} debe ser YYYY-MM-DD") from exc
    return head


class BeneficiarioBase(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    genero: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    curp: str
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
    municipio_nacimiento: Optional[str] = None
    estado_nacimiento: Optional[str] = None
    hospital_nacimiento: Optional[str] = None
    tipo_sangre: Optional[str] = None
    usa_valvula: str = "N"
    notas_adicionales: Optional[str] = None
    membresia_estatus: str = "ACTIVO"
    tipo_cuota: Optional[str] = None
    activo: str = "S"

    @field_validator("correo_electronico", mode="before")
    @classmethod
    def _validar_correo(cls, v) -> str | None:
        return _normalizar_correo(v)

    @field_validator("fecha_nacimiento", mode="before")
    @classmethod
    def _validar_fecha_nacimiento(cls, v) -> str | None:
        return _normalizar_fecha_iso(v, "fecha_nacimiento")


class BeneficiarioCreate(BeneficiarioBase):
    tipos_espina: Optional[List[int]] = None


class RenovarMembresiaCreate(BaseModel):
    monto_total: float
    exento_pago: str = "N"
    metodos_pago: List[dict] = []
