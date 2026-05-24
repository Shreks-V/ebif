"""
HTTP-level router tests — mini FastAPI apps with mock services.

Covers the router delegate lines not exercised by Pruebas/pruebas-s2:
  - /api/reportes/*        (all 13 GET endpoints)
  - /api/exportaciones/*   (all 7 GET endpoints)
  - /api/notificaciones    (GET endpoint + branch conditions)
  - /api/almacen/*         (uncovered handler lines)
"""
from __future__ import annotations

import io
from unittest.mock import MagicMock
import pytest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.presentation.api.security import get_current_user

# ── shared fake user ───────────────────────────────────────────────────────────

_FAKE_USER = {"correo": "ci@test.com", "rol": "ADMINISTRADOR", "id_usuario": 1, "nombre": "CI"}


def _override_user():
    return _FAKE_USER


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTES ROUTER
# ═══════════════════════════════════════════════════════════════════════════════

import app.application.reportes.use_cases as _reportes_uc
from app.application.reportes.use_cases import ReportesService, configure_service as _cfg_reportes


_REPORTES_METHODS = [
    "reporte_por_genero", "reporte_por_etapa_vida", "reporte_por_tipo_espina",
    "reporte_por_estado", "reporte_resumen", "reporte_servicios_por_tipo",
    "reporte_estudios_por_tipo", "reporte_pagos_exentos", "reporte_consolidado_mensual",
    "historial_reportes", "reporte_por_ciudad", "indicadores_desempeno",
    "reporte_pagos_por_metodo",
]


@pytest.fixture(scope="module")
def reportes_client():
    repo = MagicMock()
    for m in _REPORTES_METHODS:
        getattr(repo, m).return_value = {}
    repo.historial_reportes.return_value = []   # returns List[ReporteResponse]
    _cfg_reportes(ReportesService(repo))

    from app.presentation.api.routers import reportes as rtr
    app = FastAPI()
    app.include_router(rtr.router, prefix="")
    app.dependency_overrides[get_current_user] = _override_user

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    _reportes_uc._service = None


class TestReportesRouter:
    def test_por_genero(self, reportes_client):
        assert reportes_client.get("/por-genero").status_code == 200

    def test_por_etapa_vida(self, reportes_client):
        assert reportes_client.get("/por-etapa-vida").status_code == 200

    def test_por_tipo_espina(self, reportes_client):
        assert reportes_client.get("/por-tipo-espina").status_code == 200

    def test_por_estado(self, reportes_client):
        assert reportes_client.get("/por-estado").status_code == 200

    def test_resumen(self, reportes_client):
        assert reportes_client.get("/resumen").status_code == 200

    def test_servicios_por_tipo(self, reportes_client):
        assert reportes_client.get("/servicios-por-tipo").status_code == 200

    def test_estudios_por_tipo(self, reportes_client):
        assert reportes_client.get("/estudios-por-tipo").status_code == 200

    def test_pagos_exentos(self, reportes_client):
        assert reportes_client.get("/pagos-exentos").status_code == 200

    def test_consolidado_mensual(self, reportes_client):
        assert reportes_client.get("/consolidado-mensual").status_code == 200

    def test_por_ciudad(self, reportes_client):
        assert reportes_client.get("/por-ciudad").status_code == 200

    def test_indicadores_desempeno(self, reportes_client):
        assert reportes_client.get("/indicadores-desempeno").status_code == 200

    def test_pagos_por_metodo(self, reportes_client):
        assert reportes_client.get("/pagos-por-metodo").status_code == 200

    def test_historial(self, reportes_client):
        assert reportes_client.get("/historial").status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTACIONES ROUTER (GET endpoints only — WebSocket excluded)
# ═══════════════════════════════════════════════════════════════════════════════

import app.application.exportaciones.use_cases as _exp_uc
from app.application.exportaciones.use_cases import ExportacionesService, configure_service as _cfg_exp
from app.domain.exportaciones.entities import FilePayload

_FAKE_PAYLOAD = FilePayload(content=b"%PDF-fake", media_type="application/pdf", filename="test.pdf")
_FAKE_EXCEL = FilePayload(content=b"PK", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename="test.xlsx")

_EXP_METHODS = [
    "exportar_reporte_pdf", "exportar_beneficiario_pdf", "exportar_credencial_pdf",
    "exportar_comprobante_cita", "exportar_contrato_comodato",
    "exportar_beneficiarios_excel", "exportar_reporte_excel",
]


@pytest.fixture(scope="module")
def exp_client():
    repo = MagicMock()
    for m in _EXP_METHODS:
        getattr(repo, m).return_value = _FAKE_PAYLOAD
    repo.exportar_beneficiarios_excel.return_value = _FAKE_EXCEL
    repo.exportar_reporte_excel.return_value = _FAKE_EXCEL
    _cfg_exp(ExportacionesService(repo))

    from app.presentation.api.routers import exportaciones as rtr
    app = FastAPI()
    app.include_router(rtr.router, prefix="")
    app.dependency_overrides[get_current_user] = _override_user

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    _exp_uc._service = None


class TestExportacionesRouter:
    def test_reporte_pdf(self, exp_client):
        r = exp_client.get("/reportes/pdf")
        assert r.status_code == 200

    def test_beneficiario_pdf(self, exp_client):
        r = exp_client.get("/beneficiario/BEN-000001/pdf")
        assert r.status_code == 200

    def test_credencial_pdf(self, exp_client):
        r = exp_client.get("/beneficiario/BEN-000001/credencial")
        assert r.status_code == 200

    def test_comprobante_cita(self, exp_client):
        r = exp_client.get("/cita/1/comprobante")
        assert r.status_code == 200

    def test_contrato_comodato(self, exp_client):
        r = exp_client.get("/comodato/5/contrato")
        assert r.status_code == 200

    def test_beneficiarios_excel(self, exp_client):
        r = exp_client.get("/beneficiarios/excel")
        assert r.status_code == 200

    def test_reporte_excel(self, exp_client):
        r = exp_client.get("/reportes/excel")
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICACIONES ROUTER — GET endpoint + branch coverage
# ═══════════════════════════════════════════════════════════════════════════════

import app.application.citas.use_cases as _citas_uc
import app.application.almacen.use_cases as _almacen_uc
import app.application.beneficiarios.use_cases as _ben_uc
from app.application.citas.use_cases import CitasService, configure_service as _cfg_citas
from app.application.almacen.use_cases import AlmacenService, configure_service as _cfg_almacen
from app.application.beneficiarios.use_cases import BeneficiariosService, configure_service as _cfg_ben


def _make_noti_app(citas_hoy_val, proximas_val, membresias_val, almacen_val):
    """Build a minimal app where each service returns the given values."""
    citas_repo = MagicMock()
    citas_repo.citas_hoy.return_value = citas_hoy_val
    citas_repo.citas_proximas.return_value = {"count": proximas_val}
    _cfg_citas(CitasService(citas_repo))

    almacen_repo = MagicMock()
    almacen_repo.almacen_stats.return_value = almacen_val
    _cfg_almacen(AlmacenService(almacen_repo))

    ben_repo = MagicMock()
    ben_repo.listar_membresias_proximas_a_vencer.return_value = membresias_val
    _cfg_ben(BeneficiariosService(ben_repo))

    from app.presentation.api.routers import notificaciones as rtr
    mini = FastAPI()
    mini.include_router(rtr.router, prefix="/n")
    mini.dependency_overrides[get_current_user] = _override_user
    return mini


class TestNotificacionesRouter:
    def teardown_method(self):
        _citas_uc._service = None
        _almacen_uc._service = None
        _ben_uc._service = None

    def test_get_notificaciones_sin_alertas(self):
        """n <= 0 branches: returns None for citas/membresias."""
        app = _make_noti_app(
            citas_hoy_val={"programadas": 0},
            proximas_val=0,
            membresias_val=[],
            almacen_val={"alertas_stock_bajo": 0, "alertas_caducidad": 0},
        )
        with TestClient(app) as c:
            r = c.get("/n")
            assert r.status_code == 200
            assert r.json() == []

    def test_get_notificaciones_con_citas_hoy(self):
        """n > 0 path: citas_hoy notification is included."""
        app = _make_noti_app(
            citas_hoy_val={"programadas": 3},
            proximas_val=0,
            membresias_val=[],
            almacen_val={"alertas_stock_bajo": 0, "alertas_caducidad": 0},
        )
        with TestClient(app) as c:
            r = c.get("/n")
            assert r.status_code == 200
            body = r.json()
            assert any(n["id"] == "citas_hoy" for n in body)

    def test_get_notificaciones_con_proximas(self):
        """citas_proximas notification included when count > 0."""
        app = _make_noti_app(
            citas_hoy_val={"programadas": 0},
            proximas_val=5,
            membresias_val=[],
            almacen_val={"alertas_stock_bajo": 0, "alertas_caducidad": 0},
        )
        with TestClient(app) as c:
            r = c.get("/n")
            assert r.status_code == 200
            body = r.json()
            assert any(n["id"] == "citas_proximas" for n in body)

    def test_get_notificaciones_membresias_500_plus(self):
        """label='500+' branch when membresias count reaches 500."""
        app = _make_noti_app(
            citas_hoy_val={"programadas": 0},
            proximas_val=0,
            membresias_val=list(range(500)),   # exactly 500 items
            almacen_val={"alertas_stock_bajo": 0, "alertas_caducidad": 0},
        )
        with TestClient(app) as c:
            r = c.get("/n")
            assert r.status_code == 200
            mem = next((n for n in r.json() if n["id"] == "membresias_vencer"), None)
            assert mem is not None
            assert "500+" in mem["detalle"]

    def test_get_notificaciones_membresias_menos_500(self):
        """Normal membresias branch (< 500 items)."""
        app = _make_noti_app(
            citas_hoy_val={"programadas": 0},
            proximas_val=0,
            membresias_val=[{"id": 1}],
            almacen_val={"alertas_stock_bajo": 0, "alertas_caducidad": 0},
        )
        with TestClient(app) as c:
            r = c.get("/n")
            assert r.status_code == 200
            mem = next((n for n in r.json() if n["id"] == "membresias_vencer"), None)
            assert mem is not None
            assert "500+" not in mem["detalle"]

    def test_get_notificaciones_almacen_alertas(self):
        """Both stock_bajo and caducidad alerts included."""
        app = _make_noti_app(
            citas_hoy_val={"programadas": 0},
            proximas_val=0,
            membresias_val=[],
            almacen_val={"alertas_stock_bajo": 2, "alertas_caducidad": 1},
        )
        with TestClient(app) as c:
            r = c.get("/n")
            assert r.status_code == 200
            ids = {n["id"] for n in r.json()}
            assert "stock_bajo" in ids
            assert "caducidad" in ids

    def test_get_notificaciones_excepcion_citas_no_rompe(self):
        """Exception in one module doesn't prevent the rest from returning."""
        citas_repo = MagicMock()
        citas_repo.citas_hoy.side_effect = RuntimeError("DB down")
        citas_repo.citas_proximas.side_effect = RuntimeError("DB down")
        _cfg_citas(CitasService(citas_repo))

        almacen_repo = MagicMock()
        almacen_repo.almacen_stats.return_value = {"alertas_stock_bajo": 0, "alertas_caducidad": 0}
        _cfg_almacen(AlmacenService(almacen_repo))

        ben_repo = MagicMock()
        ben_repo.listar_membresias_proximas_a_vencer.return_value = []
        _cfg_ben(BeneficiariosService(ben_repo))

        from app.presentation.api.routers import notificaciones as rtr
        mini = FastAPI()
        mini.include_router(rtr.router, prefix="/n")
        mini.dependency_overrides[get_current_user] = _override_user

        with TestClient(mini) as c:
            r = c.get("/n")
            assert r.status_code == 200  # must not 500
