from pydantic import BaseModel
from typing import Optional


class ReporteFilter(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    genero: Optional[str] = None
    estado: Optional[str] = None
    tipo_espina: Optional[int] = None
