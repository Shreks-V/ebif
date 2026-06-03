from __future__ import annotations

import logging

from app.domain.bitacora.ports import BitacoraRepository

logger = logging.getLogger(__name__)

_service: "BitacoraService | None" = None


class BitacoraService:
    def __init__(self, repository: BitacoraRepository) -> None:
        self._repository = repository

    def listar(
        self,
        tabla: str | None = None,
        tipo_operacion: str | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        busqueda: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        items = self._repository.listar_bitacora(
            tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda, limit, offset
        )
        total = self._repository.contar_bitacora(
            tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda
        )
        return {"items": items, "total": total, "limit": limit, "offset": offset}


def configure_service(service: BitacoraService) -> None:
    global _service
    _service = service


def _svc() -> BitacoraService:
    if _service is None:
        raise RuntimeError("bitacora service is not configured")
    return _service


def listar(
    tabla: str | None = None,
    tipo_operacion: str | None = None,
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
    busqueda: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    return _svc().listar(tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda, limit, offset)
