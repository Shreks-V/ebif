from pydantic import BaseModel
from typing import Optional, List

__all__ = ["PreRegistroCreate", "AprobarPreRegistroData"]


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


class AprobarPreRegistroData(BaseModel):
    tipo_cuota: Optional[str] = None
