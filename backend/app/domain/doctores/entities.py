from typing_extensions import TypedDict


class Doctor(TypedDict, total=False):
    id_doctor: int
    nombre: str
    apellido_paterno: str | None
    apellido_materno: str | None
    especialidad: str | None
    telefono: str | None
    correo: str | None
    activo: str
    fecha_registro: str | None
    servicios: list[dict] | None


class Disponibilidad(TypedDict, total=False):
    id_disponibilidad: int
    id_doctor: int
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    disponible: str
    fecha_registro: str | None


class DisponibilidadEspecial(TypedDict, total=False):
    id_disp_especial: int
    id_doctor: int
    fecha_inicio: str
    hora_inicio: str
    hora_fin: str
    tipo_recurrencia: str
    descripcion: str | None
    activo: str
    fecha_registro: str | None
