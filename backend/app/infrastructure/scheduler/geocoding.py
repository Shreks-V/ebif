from __future__ import annotations

import logging
import threading
import time

logger = logging.getLogger(__name__)

_BATCH_SIZE = 30
_INTERVAL_SECONDS = 60
_STARTUP_DELAY = 5


def _geocode_pending() -> None:
    try:
        from app.application.geocoding import use_cases as geocoding_svc
        geocoding_svc.geocodificar_lote(_BATCH_SIZE)
    except Exception:
        logger.exception("Scheduler: error en lote de geocodificación")


def _run() -> None:
    time.sleep(_STARTUP_DELAY)
    while True:
        _geocode_pending()
        time.sleep(_INTERVAL_SECONDS)


def start_geocoding_scheduler() -> None:
    t = threading.Thread(target=_run, daemon=True, name="geocoding-scheduler")
    t.start()
    logger.info("Scheduler de geocodificación iniciado")
