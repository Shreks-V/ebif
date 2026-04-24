from pydantic import BaseModel
from typing import Optional, List


class DoctorBase(BaseModel):
    nombre: str
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    especialidad: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    activo: str = "S"


class DoctorCreate(DoctorBase):
    servicios: Optional[List[int]] = None


class DisponibilidadCreate(BaseModel):
    dia_semana: int
    hora_inicio: str
    hora_fin: str
