from pydantic import BaseModel


class DoctorBase(BaseModel):
    nombre: str
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    especialidad: str | None = None
    telefono: str | None = None
    correo: str | None = None
    activo: str = "S"


class DoctorCreate(DoctorBase):
    servicios: list[int] | None = None


class DisponibilidadCreate(BaseModel):
    dia_semana: int
    hora_inicio: str
    hora_fin: str


class DisponibilidadEspecialCreate(BaseModel):
    fecha_inicio: str          # YYYY-MM-DD
    hora_inicio: str           # HH:MM
    hora_fin: str              # HH:MM
    tipo_recurrencia: str = "UNICA"   # UNICA | QUINCENAL | CADA_3_SEMANAS | MENSUAL
    descripcion: str | None = None
