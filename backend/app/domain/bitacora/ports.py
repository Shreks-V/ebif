from __future__ import annotations

from typing import Optional, Protocol


class BitacoraRepository(Protocol):
    def listar_bitacora(
        self,
        tabla: Optional[str] = None,
        tipo_operacion: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        busqueda: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def contar_bitacora(
        self,
        tabla: Optional[str] = None,
        tipo_operacion: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        busqueda: Optional[str] = None,
    ) -> int: ...
