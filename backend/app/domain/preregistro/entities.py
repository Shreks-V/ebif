from dataclasses import dataclass
from typing import Protocol
from typing_extensions import TypedDict


class PreRegistroInput(Protocol):
    """Contrato de dominio para datos de entrada de un pre-registro.
    Satisfecho estructuralmente por PreRegistroCreate (capa application)."""
    nombre: str
    apellido_paterno: str
    apellido_materno: str | None
    curp: str
    genero: str | None
    fecha_nacimiento: str | None
    estado_nacimiento: str | None
    hospital_nacimiento: str | None
    nombre_padre_madre: str | None
    direccion: str | None
    colonia: str | None
    ciudad: str | None
    estado: str | None
    codigo_postal: str | None
    telefono_casa: str | None
    telefono_celular: str | None
    correo_electronico: str | None
    en_emergencia_avisar_a: str | None
    telefono_emergencia: str | None
    tipo_sangre: str | None
    usa_valvula: str | None
    tipo_cuota: str | None
    notas_adicionales: str | None
    paso_actual: int
    tipos_espina: list[int] | None


@dataclass(frozen=True)
class UploadedFile:
    filename: str
    content: bytes
    content_type: str


class Preregistro(TypedDict, total=False):
    id_paciente: int
    folio: str | None
    nombre: str
    apellido_paterno: str
    apellido_materno: str | None
    fecha_nacimiento: str | None
    genero: str | None
    curp: str
    estado_nacimiento: str | None
    hospital_nacimiento: str | None
    nombre_padre_madre: str | None
    direccion: str | None
    colonia: str | None
    ciudad: str | None
    estado: str | None
    codigo_postal: str | None
    telefono_casa: str | None
    telefono_celular: str | None
    correo_electronico: str | None
    en_emergencia_avisar_a: str | None
    telefono_emergencia: str | None
    tipo_sangre: str | None
    usa_valvula: str | None
    tipo_cuota: str | None
    notas_adicionales: str | None
    paso_actual: int
    estatus_registro: str
    tipos_espina: list[int] | None


class DocumentoPaciente(TypedDict, total=False):
    id_documento: int
    id_paciente: int
    id_tipo_documento: int
    nombre_archivo: str
    ruta_archivo: str
    formato_archivo: str | None
    activo: str
    fecha_carga: str | None
