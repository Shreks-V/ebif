from dataclasses import dataclass, field
from typing_extensions import TypedDict


class HistorialReporte(TypedDict, total=False):
    id_reporte: int
    id_usuario: int
    tipo_reporte: str
    fecha_generacion: str | None
    fecha_inicio: str | None
    fecha_fin: str | None
    formato: str | None


@dataclass
class ReporteFilter:
    genero: str | None = field(default=None)
    estado: str | None = field(default=None)
    tipo_espina: int | None = field(default=None)
    fecha_inicio: str | None = field(default=None)
    fecha_fin: str | None = field(default=None)
