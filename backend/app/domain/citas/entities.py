from typing_extensions import TypedDict


class Cita(TypedDict, total=False):
    id_cita: int
    id_paciente: int
    id_usuario_registro: int | None
    fecha_hora: str
    estatus: str
    notas: str | None
    fecha_registro: str | None
    nombre_paciente: str | None
    folio_paciente: str | None
    servicios: list[dict] | None
