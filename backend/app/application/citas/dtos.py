from pydantic import BaseModel


class CitaBase(BaseModel):
    id_paciente: int
    id_usuario_registro: int | None = None
    fecha_hora: str
    estatus: str = "PROGRAMADA"
    notas: str | None = None


class CitaCreate(CitaBase):
    servicios: list[dict] | None = None
