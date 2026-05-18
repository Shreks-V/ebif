from __future__ import annotations

import logging
import threading
import time

logger = logging.getLogger(__name__)

_INTERVAL_SECONDS = 86400  # 24 hours


def _expire_membresias() -> None:
    try:
        from app.application.beneficiarios import use_cases as beneficiarios_svc
        rows = beneficiarios_svc.expirar_membresias_vencidas()
        if rows:
            logger.info("Scheduler: %d membresías marcadas como VENCIDO por vencimiento", rows)
    except Exception:
        logger.exception("Scheduler: error al expirar membresías vencidas")


def _run() -> None:
    while True:
        _expire_membresias()
        time.sleep(_INTERVAL_SECONDS)


def start_expiry_scheduler() -> None:
    t = threading.Thread(target=_run, daemon=True, name="membresia-expiry")
    t.start()
    logger.info("Scheduler de expiración de membresías iniciado")
