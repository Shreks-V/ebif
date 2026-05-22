"""Tests para el endpoint OCR (/api/ocr/extraer-documento) y GeminiOcrService."""
from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.infrastructure.ai.gemini_service import GeminiOcrService
from app.presentation.api.routers import ocr as ocr_router

# ── App mínima ─────────────────────────────────────────────────────────────────

def _build_ocr_app() -> FastAPI:
    app = FastAPI()
    app.include_router(ocr_router.router, prefix="/api/ocr")
    return app


@pytest.fixture()
def client():
    return TestClient(_build_ocr_app())


# ── Datos de prueba ────────────────────────────────────────────────────────────

_FULL_OCR_RESPONSE = {
    "tipo_documento": "INE",
    "nombre": "Juan",
    "apellido_paterno": "García",
    "apellido_materno": "López",
    "fecha_nacimiento": "1990-01-15",
    "sexo": "Masculino",
    "curp": "GALJ900115HNLRPN01",
    "estado_nacimiento": "Nuevo León",
    "calle": "Av. Constitución",
    "numero_exterior": "100",
    "numero_interior": None,
    "colonia": "Centro",
    "municipio": "Monterrey",
    "estado_residencia": "Nuevo León",
    "codigo_postal": "64000",
    "nombre_padre": None,
    "nombre_madre": None,
    "confianza": "alta",
    "campos_detectados": ["nombre", "apellido_paterno", "curp"],
}


def _fake_jpeg(size: int = 200) -> bytes:
    return b"\xff\xd8\xff" + b"X" * size


def _fake_png(size: int = 200) -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"X" * size


def _fake_pdf(size: int = 200) -> bytes:
    return b"%PDF-1.4\n" + b"X" * size


# ── Helper de mock ─────────────────────────────────────────────────────────────

@contextmanager
def _gemini_mock(result: dict | None = None, error: Exception | None = None):
    """Parchea settings y get_gemini_service para evitar llamadas reales a la API."""
    svc = MagicMock(spec=GeminiOcrService)
    if error:
        svc.extraer.side_effect = error
    else:
        svc.extraer.return_value = result or _FULL_OCR_RESPONSE

    with patch("app.presentation.api.routers.ocr.settings") as mock_s:
        mock_s.GEMINI_KEY_1 = "test-key-1"
        mock_s.GEMINI_KEY_2 = "test-key-2"
        with patch("app.presentation.api.routers.ocr.get_gemini_service", return_value=svc):
            yield svc


# ── Tests: validación de entrada ───────────────────────────────────────────────

class TestOcrValidacionEntrada:
    def test_tipo_texto_plano_devuelve_415(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("doc.txt", b"texto plano", "text/plain")},
            )
        assert r.status_code == 415

    def test_gif_no_soportado_devuelve_415(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("img.gif", b"GIF89a", "image/gif")},
            )
        assert r.status_code == 415

    def test_mensaje_error_415_menciona_formatos(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("doc.txt", b"texto", "text/plain")},
            )
        detail = r.json()["detail"].lower()
        assert any(fmt in detail for fmt in ["jpg", "png", "webp", "pdf"])

    def test_archivo_mayor_10mb_devuelve_413(self, client):
        big_file = b"X" * (10 * 1024 * 1024 + 1)
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("grande.jpg", big_file, "image/jpeg")},
            )
        assert r.status_code == 413

    def test_sin_campo_archivo_devuelve_422(self, client):
        r = client.post("/api/ocr/extraer-documento")
        assert r.status_code == 422


# ── Tests: extracción exitosa ──────────────────────────────────────────────────

class TestOcrExtraccionExitosa:
    def test_jpeg_devuelve_200(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("ine.jpg", _fake_jpeg(), "image/jpeg")},
            )
        assert r.status_code == 200

    def test_png_aceptado(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("curp.png", _fake_png(), "image/png")},
            )
        assert r.status_code == 200

    def test_pdf_aceptado(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("acta.pdf", _fake_pdf(), "application/pdf")},
            )
        assert r.status_code == 200

    def test_webp_aceptado(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("doc.webp", _fake_jpeg(), "image/webp")},
            )
        assert r.status_code == 200

    def test_respuesta_contiene_datos_personales(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("ine.jpg", _fake_jpeg(), "image/jpeg")},
            )
        data = r.json()
        assert data["nombre"] == "Juan"
        assert data["apellido_paterno"] == "García"
        assert data["curp"] == "GALJ900115HNLRPN01"
        assert data["confianza"] == "alta"

    def test_respuesta_contiene_tipo_documento(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("ine.jpg", _fake_jpeg(), "image/jpeg")},
            )
        assert r.json()["tipo_documento"] == "INE"

    def test_respuesta_contiene_campos_domicilio(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("comprobante.jpg", _fake_jpeg(), "image/jpeg")},
            )
        data = r.json()
        assert data["calle"] == "Av. Constitución"
        assert data["municipio"] == "Monterrey"
        assert data["codigo_postal"] == "64000"
        assert data["estado_residencia"] == "Nuevo León"

    def test_campos_null_se_incluyen_en_respuesta(self, client):
        with _gemini_mock():
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("ine.jpg", _fake_jpeg(), "image/jpeg")},
            )
        data = r.json()
        assert "numero_interior" in data
        assert data["numero_interior"] is None


# ── Tests: errores del servicio ────────────────────────────────────────────────

class TestOcrErroresServicio:
    def test_sin_llaves_gemini_devuelve_503(self, client):
        with patch("app.presentation.api.routers.ocr.settings") as mock_s:
            mock_s.GEMINI_KEY_1 = ""
            mock_s.GEMINI_KEY_2 = ""
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("ine.jpg", _fake_jpeg(), "image/jpeg")},
            )
        assert r.status_code == 503

    def test_gemini_falla_devuelve_502(self, client):
        with _gemini_mock(error=RuntimeError("Todos los intentos con Gemini fallaron")):
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("ine.jpg", _fake_jpeg(), "image/jpeg")},
            )
        assert r.status_code == 502

    def test_mensaje_error_502_es_amigable(self, client):
        with _gemini_mock(error=RuntimeError("quota exceeded")):
            r = client.post(
                "/api/ocr/extraer-documento",
                files={"archivo": ("ine.jpg", _fake_jpeg(), "image/jpeg")},
            )
        detail = r.json()["detail"].lower()
        assert "procesar" in detail or "documento" in detail


# ── Tests unitarios: GeminiOcrService ─────────────────────────────────────────

def _mock_genai_client(json_text: str) -> MagicMock:
    response = MagicMock()
    response.text = json_text
    client_instance = MagicMock()
    client_instance.models.generate_content.return_value = response
    return client_instance


class TestGeminiOcrService:
    def test_extrae_datos_y_devuelve_dict(self):
        svc = GeminiOcrService("key1", "key2")
        with patch("app.infrastructure.ai.gemini_service.genai.Client") as MockClient:
            MockClient.return_value = _mock_genai_client('{"nombre": "Ana", "confianza": "alta"}')
            result = svc.extraer(b"fake-image-bytes", "image/jpeg")
        assert result["nombre"] == "Ana"
        assert result["confianza"] == "alta"

    def test_round_robin_alterna_entre_dos_llaves(self):
        svc = GeminiOcrService("key-a", "key-b")
        used_keys: list[str] = []

        def _make_client(api_key: str) -> MagicMock:
            used_keys.append(api_key)
            return _mock_genai_client('{"ok": true}')

        with patch("app.infrastructure.ai.gemini_service.genai.Client", side_effect=_make_client):
            svc.extraer(b"img", "image/jpeg")
            svc.extraer(b"img", "image/jpeg")

        assert used_keys == ["key-a", "key-b"]

    def test_fallback_usa_segunda_llave_si_primera_falla(self):
        svc = GeminiOcrService("bad-key", "good-key")

        def _make_client(api_key: str) -> MagicMock:
            c = MagicMock()
            if api_key == "bad-key":
                c.models.generate_content.side_effect = Exception("quota exceeded")
            else:
                r = MagicMock()
                r.text = '{"nombre": "Fallback OK"}'
                c.models.generate_content.return_value = r
            return c

        with patch("app.infrastructure.ai.gemini_service.genai.Client", side_effect=_make_client):
            result = svc.extraer(b"img", "image/jpeg")

        assert result["nombre"] == "Fallback OK"

    def test_todas_las_llaves_fallan_lanza_runtime_error(self):
        svc = GeminiOcrService("bad1", "bad2")

        def _fail(api_key: str) -> MagicMock:
            c = MagicMock()
            c.models.generate_content.side_effect = Exception("quota exceeded")
            return c

        with patch("app.infrastructure.ai.gemini_service.genai.Client", side_effect=_fail):
            with pytest.raises(RuntimeError, match="Todos los intentos"):
                svc.extraer(b"img", "image/jpeg")

    def test_una_sola_llave_es_suficiente(self):
        svc = GeminiOcrService("only-key", "")
        assert len(svc._keys) == 1
        with patch("app.infrastructure.ai.gemini_service.genai.Client") as MockClient:
            MockClient.return_value = _mock_genai_client('{"curp": "XXXX18CHARS000000"}')
            result = svc.extraer(b"img", "image/jpeg")
        assert result["curp"] == "XXXX18CHARS000000"

    def test_sin_ninguna_llave_lanza_value_error(self):
        with pytest.raises(ValueError, match="al menos una"):
            GeminiOcrService("", "")
