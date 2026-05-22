"""Pruebas para los 3 nuevos endpoints: búsqueda full-text, métricas y WS exportación."""
from __future__ import annotations

from datetime import date, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.application.auth.use_cases import AuthService
from app.application.beneficiarios import use_cases as ben_uc
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher
from app.presentation.api.dependencies import get_auth_service
from app.presentation.api.routers import auth as auth_router
from app.presentation.api.routers import busqueda as busqueda_router
from app.presentation.api.routers import metricas as metricas_router
from app.presentation.api.routers import exportaciones as exportaciones_router

from Pruebas.support_auth import InMemoryUserRepository, build_user
from Pruebas.support_beneficiarios import InMemoryBeneficiariosRepository

_ADMIN_CORREO = "admin-feat@test.local"
_ADMIN_PASS = "admin123"


# ── Stub de exportaciones ─────────────────────────────────────────────────────

class _FakeExportService:
    def exportar_reporte_pdf(self, *args, **kwargs):
        from app.domain.exportaciones.entities import FilePayload
        return FilePayload(content=b"%PDF fake", filename="reporte.pdf", media_type="application/pdf")


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _build_test_beneficiarios() -> list[dict]:
    today = date.today()
    _base = {"activo": "S", "estatus_registro": "APROBADO"}
    return [
        {**_base, "id_paciente": 1, "folio": "BEN-000001",
         "nombre": "Juan", "apellido_paterno": "García", "apellido_materno": "López",
         "curp": "GALJ900101HNLRPN00", "fecha_nacimiento": "1990-01-01",
         "municipio": "Monterrey", "estado": "Nuevo León",
         "membresia_estatus": "ACTIVO",
         "fecha_alta": (today - timedelta(days=3)).isoformat()},
        {**_base, "id_paciente": 2, "folio": "BEN-000002",
         "nombre": "María", "apellido_paterno": "García", "apellido_materno": "Torres",
         "curp": "GATM850615MNLRPR00", "fecha_nacimiento": "1985-06-15",
         "municipio": "Monterrey", "estado": "Nuevo León",
         "membresia_estatus": "ACTIVO",
         "fecha_alta": (today - timedelta(days=10)).isoformat()},
        {**_base, "id_paciente": 3, "folio": "BEN-000003",
         "nombre": "Pedro", "apellido_paterno": "Martínez", "apellido_materno": None,
         "curp": None, "fecha_nacimiento": "2000-03-20",
         "municipio": "Guadalupe", "estado": "Nuevo León",
         "membresia_estatus": "VENCIDO",
         "fecha_alta": (today - timedelta(weeks=6)).isoformat()},
        {**_base, "id_paciente": 4, "folio": "BEN-000004",
         "nombre": "Ana", "apellido_paterno": "Rodríguez", "apellido_materno": "Cruz",
         "curp": None, "fecha_nacimiento": None,
         "municipio": "San Pedro", "estado": "Nuevo León",
         "membresia_estatus": None,
         "fecha_alta": (today - timedelta(weeks=2)).isoformat()},
    ]


def _jwt_admin() -> dict[str, str]:
    token = JwtAccessTokenIssuer().issue(
        {"sub": _ADMIN_CORREO, "rol": "ADMINISTRADOR", "nombre": "Admin", "id_usuario": 1}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client():
    hasher = SecurityPasswordHasher()
    admin = build_user(
        correo=_ADMIN_CORREO,
        password_plain=_ADMIN_PASS,
        password_hasher=hasher,
        id_usuario=1,
        rol="ADMINISTRADOR",
    )
    user_repo = InMemoryUserRepository({admin.correo.lower(): admin}, has_users=True)

    ben_repo = InMemoryBeneficiariosRepository(seed=_build_test_beneficiarios())

    issuer = JwtAccessTokenIssuer()
    auth_svc = AuthService(user_repo, hasher, issuer)
    ben_uc.configure_service(ben_repo)

    import app.application.exportaciones.use_cases as exp_uc
    exp_uc.configure_service(_FakeExportService())

    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.include_router(auth_router.router, prefix="/api/auth")
    app.include_router(busqueda_router.router, prefix="/api/buscar")
    app.include_router(metricas_router.router, prefix="/api/dashboard/metricas")
    app.include_router(exportaciones_router.router, prefix="/api/exportaciones")

    app.dependency_overrides[get_auth_service] = lambda: auth_svc

    return TestClient(app)


# ── Tests: Búsqueda ───────────────────────────────────────────────────────────

class TestBusquedaFullText:
    def test_busqueda_por_apellido_devuelve_resultados(self, client):
        headers = _jwt_admin()
        r = client.get("/api/buscar?q=García", headers=headers)
        assert r.status_code == 200
        results = r.json()
        assert len(results) >= 2
        assert all("_score" in res for res in results)

    def test_resultados_ordenados_por_score_descendente(self, client):
        headers = _jwt_admin()
        r = client.get("/api/buscar?q=BEN-000001", headers=headers)
        results = r.json()
        assert results[0]["folio"] == "BEN-000001"
        scores = [res["_score"] for res in results]
        assert scores == sorted(scores, reverse=True)

    def test_busqueda_folio_exacto_tiene_mayor_score(self, client):
        headers = _jwt_admin()
        r = client.get("/api/buscar?q=BEN-000001", headers=headers)
        results = r.json()
        top = results[0]
        assert top["folio"] == "BEN-000001"
        assert top["_score"] >= 120  # exact folio = 30 * 4

    def test_busqueda_sin_resultados_devuelve_lista_vacia(self, client):
        headers = _jwt_admin()
        r = client.get("/api/buscar?q=XYZNOEXISTE", headers=headers)
        assert r.status_code == 200
        assert r.json() == []

    def test_busqueda_requiere_autenticacion(self, client):
        r = client.get("/api/buscar?q=García")
        assert r.status_code == 401

    def test_busqueda_query_muy_corto_devuelve_422(self, client):
        headers = _jwt_admin()
        r = client.get("/api/buscar?q=G", headers=headers)
        assert r.status_code == 422

    def test_campo_tipo_es_beneficiario(self, client):
        headers = _jwt_admin()
        r = client.get("/api/buscar?q=Juan", headers=headers)
        results = r.json()
        assert len(results) >= 1
        assert results[0]["_tipo"] == "beneficiario"

    def test_limit_respetado(self, client):
        headers = _jwt_admin()
        r = client.get("/api/buscar?q=García&limit=1", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) <= 1


# ── Tests: Métricas ───────────────────────────────────────────────────────────

class TestMetricasDashboard:
    def test_endpoint_devuelve_estructura_correcta(self, client):
        headers = _jwt_admin()
        r = client.get("/api/dashboard/metricas", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_beneficiarios" in data
        assert "distribucion_edades" in data
        assert "concentracion_geografica" in data
        assert "tendencia_semanal" in data
        assert "membresias" in data

    def test_total_beneficiarios_correcto(self, client):
        headers = _jwt_admin()
        r = client.get("/api/dashboard/metricas", headers=headers)
        data = r.json()
        assert data["total_beneficiarios"] == 4

    def test_membresias_activos_y_vencidos(self, client):
        headers = _jwt_admin()
        r = client.get("/api/dashboard/metricas", headers=headers)
        mem = r.json()["membresias"]
        assert mem["activas"] == 2
        assert mem["vencidas"] == 1
        assert mem["sin_membresia"] == 1

    def test_tasa_retencion_calculada(self, client):
        headers = _jwt_admin()
        r = client.get("/api/dashboard/metricas", headers=headers)
        mem = r.json()["membresias"]
        assert mem["tasa_retencion_pct"] == 50.0

    def test_distribucion_edades_tiene_percentiles(self, client):
        headers = _jwt_admin()
        r = client.get("/api/dashboard/metricas", headers=headers)
        dist = r.json()["distribucion_edades"]
        assert "p25" in dist
        assert "p50" in dist
        assert "p75" in dist
        assert "promedio" in dist
        assert dist["total_con_fecha"] == 3  # Ana no tiene fecha_nacimiento

    def test_concentracion_geografica_top5(self, client):
        headers = _jwt_admin()
        r = client.get("/api/dashboard/metricas", headers=headers)
        geo = r.json()["concentracion_geografica"]
        assert len(geo) <= 5
        assert geo[0]["municipio"] == "Monterrey"
        assert geo[0]["total"] == 2
        assert all("pct" in g for g in geo)

    def test_tendencia_semanal_tiene_5_semanas(self, client):
        headers = _jwt_admin()
        r = client.get("/api/dashboard/metricas", headers=headers)
        sem = r.json()["tendencia_semanal"]
        assert len(sem) == 5
        assert sem[-1]["etiqueta"] == "actual"

    def test_metricas_requiere_autenticacion(self, client):
        r = client.get("/api/dashboard/metricas")
        assert r.status_code == 401
