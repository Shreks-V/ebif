from pydantic import BaseModel, field_validator
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
    apellido_materno: str | None = None
    genero: str | None = None
    fecha_nacimiento: str | None = None
    curp: str
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
    municipio_nacimiento: str | None = None
    estado_nacimiento: str | None = None
    hospital_nacimiento: str | None = None
    tipo_sangre: str | None = None
    usa_valvula: str = "N"
    notas_adicionales: str | None = None
    membresia_estatus: str = "ACTIVO"
    tipo_cuota: str | None = None
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
    tipos_espina: list[int] | None = None


class RenovarMembresiaCreate(BaseModel):
    monto_total: float
    exento_pago: str = "N"
    metodos_pago: list[dict] = []
