from __future__ import annotations

from typing import Protocol


class BitacoraRepository(Protocol):
    def listar_bitacora(
        self,
        tabla: str | None = None,
        tipo_operacion: str | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        busqueda: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def contar_bitacora(
        self,
        tabla: str | None = None,
        tipo_operacion: str | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        busqueda: str | None = None,
    ) -> int: ...
