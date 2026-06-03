from __future__ import annotations

import logging
from typing import Protocol

from app.domain.beneficiarios.ports import BeneficiariosRepository

logger = logging.getLogger(__name__)

_service: "GeocodingService | None" = None


class GeocoderPort(Protocol):
    """Adapter contract for any geocoding provider."""
    def geocodificar(self, query: str) -> tuple[float, float] | None: ...


class GeocodingService:
    def __init__(self, repository: BeneficiariosRepository, geocoder: GeocoderPort) -> None:
        self._repository = repository
        self._geocoder = geocoder

    def geocodificar_lote(self, batch_size: int = 30) -> int:
        pending = self._repository.get_sin_geocodificar(batch_size)
        if not pending:
            return 0
        logger.info("Geocoding: %d beneficiarios pendientes", len(pending))
        geocoded = 0
        for row in pending:
            ciudad = (row.get("ciudad") or "").strip()
            estado = (row.get("estado") or "").strip()
            query = ", ".join(filter(None, [ciudad, estado, "Mexico"]))
            coords = self._geocoder.geocodificar(query)
            if coords:
                lat, lon = coords
                self._repository.guardar_geocodificacion(row["id"], lat, lon)
                logger.debug("Geocoded %s → %.5f, %.5f", query, lat, lon)
                geocoded += 1
            else:
                self._repository.marcar_geocodificacion_fallida(row["id"])
        return geocoded


def configure_service(service: GeocodingService) -> None:
    global _service
    _service = service


def _svc() -> GeocodingService:
    if _service is None:
        raise RuntimeError("geocoding service is not configured")
    return _service


def geocodificar_lote(batch_size: int = 30) -> int:
    return _svc().geocodificar_lote(batch_size)
