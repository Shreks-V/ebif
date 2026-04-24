from typing import Optional
from typing_extensions import TypedDict


class HistorialReporte(TypedDict, total=False):
    id_reporte: int
    id_usuario: int
    tipo_reporte: str
    fecha_generacion: Optional[str]
    fecha_inicio: Optional[str]
    fecha_fin: Optional[str]
    formato: Optional[str]
