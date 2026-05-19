from __future__ import annotations

import json
import logging
import time
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

_DELAY_SECONDS = 1.1  # Nominatim usage policy: max 1 request/second


class NominatimGeocoder:
    """Geocoding adapter backed by the public Nominatim / OpenStreetMap API."""

    def geocodificar(self, query: str) -> tuple[float, float] | None:
        try:
            params = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1})
            req = urllib.request.Request(
                f"https://nominatim.openstreetmap.org/search?{params}",
                headers={"User-Agent": "EBIF-Espina-Bifida/1.0", "Accept-Language": "es"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                results = json.loads(resp.read().decode())
            if results:
                return float(results[0]["lat"]), float(results[0]["lon"])
            return None
        except Exception:
            logger.exception("NominatimGeocoder: error geocoding '%s'", query)
            return None
        finally:
            time.sleep(_DELAY_SECONDS)
