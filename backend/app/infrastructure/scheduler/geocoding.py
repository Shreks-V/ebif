import json
import logging
import ssl
import threading
import time
import urllib.parse
import urllib.request

# Nominatim is a public read-only service; skip SSL verification to handle
# macOS environments where the Python install lacks system CA bundles.
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

logger = logging.getLogger(__name__)

_BATCH_SIZE = 30
_DELAY_SECONDS = 1.1
_INTERVAL_SECONDS = 60
_STARTUP_DELAY = 5


def _geocode_pending() -> None:
    try:
        from app.infrastructure.persistence.oracle import get_db

        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT ID_PACIENTE, CIUDAD, ESTADO
                  FROM PACIENTE
                 WHERE (GEOCODIFICADO = 'N' OR GEOCODIFICADO IS NULL)
                   AND (CIUDAD IS NOT NULL OR ESTADO IS NOT NULL)
                   AND ROWNUM <= :batch_size
                """,
                {"batch_size": _BATCH_SIZE},
            )
            pending = [{"id": r[0], "ciudad": r[1], "estado": r[2]} for r in cur.fetchall()]

        if not pending:
            return

        logger.info("Geocoding scheduler: %d beneficiarios pendientes", len(pending))

        for row in pending:
            ciudad = (row["ciudad"] or "").strip()
            estado = (row["estado"] or "").strip()
            query = ", ".join(filter(None, [ciudad, estado, "Mexico"]))
            geocoded = False
            try:
                params = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1})
                req = urllib.request.Request(
                    f"https://nominatim.openstreetmap.org/search?{params}",
                    headers={
                        "User-Agent": "EBIF-Espina-Bifida/1.0",
                        "Accept-Language": "es",
                    },
                )
                with urllib.request.urlopen(req, timeout=10, context=_SSL_CTX) as resp:
                    results = json.loads(resp.read().decode())

                if results:
                    lat = float(results[0]["lat"])
                    lon = float(results[0]["lon"])
                    with get_db() as conn:
                        cur = conn.cursor()
                        cur.execute(
                            """
                            UPDATE PACIENTE
                               SET LATITUD = :lat,
                                   LONGITUD = :lon,
                                   GEOCODIFICADO = 'S'
                             WHERE ID_PACIENTE = :id
                            """,
                            {"lat": lat, "lon": lon, "id": row["id"]},
                        )
                        conn.commit()
                    logger.debug("Geocoded %s → %.5f, %.5f", query, lat, lon)
                    geocoded = True

            except Exception:
                logger.exception("Error geocoding beneficiario %s (%s)", row["id"], query)

            if not geocoded:
                try:
                    with get_db() as conn:
                        cur = conn.cursor()
                        cur.execute(
                            "UPDATE PACIENTE SET GEOCODIFICADO = 'F' WHERE ID_PACIENTE = :id",
                            {"id": row["id"]},
                        )
                        conn.commit()
                except Exception:
                    logger.exception("Error marking geocode failed for %s", row["id"])

            time.sleep(_DELAY_SECONDS)

    except Exception:
        logger.exception("Error in geocoding batch run")


def _run() -> None:
    time.sleep(_STARTUP_DELAY)
    while True:
        _geocode_pending()
        time.sleep(_INTERVAL_SECONDS)


def start_geocoding_scheduler() -> None:
    t = threading.Thread(target=_run, daemon=True, name="geocoding-scheduler")
    t.start()
    logger.info("Scheduler de geocodificación iniciado")
