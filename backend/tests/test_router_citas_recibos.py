"""
HTTP-level router tests for Citas, Recibos, Doctores y Bitácora.

Uses MagicMock services so no DB is needed. Validates:
  - auth guards (401 without token, 403 wrong role)
  - happy-path HTTP codes
  - 404 propagation from domain
  - input validation 422
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch
import pytest

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.presentation.api.security import get_current_user, require_role
from app.domain.exceptions import NotFoundError, ConflictError, ValidationError, InternalError

# ── Fake users ──────────────────────────────────────────────────────────────────

_ADMIN = {"correo": "adm@ci.com", "rol": "ADMINISTRADOR", "id_usuario": 1, "nombre": "CI Admin"}
_RECEP = {"correo": "rec@ci.com", "rol": "RECEPCIONISTA", "id_usuario": 2, "nombre": "CI Recep"}


def _override_admin():
    return _ADMIN


def _make_app_with_handlers() -> FastAPI:
    """Mini FastAPI app with domain exception handlers registered (mirrors app_factory)."""
    mini = FastAPI()

    @mini.exception_handler(NotFoundError)
    async def _nf(req: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @mini.exception_handler(ConflictError)
    async def _cf(req: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @mini.exception_handler(ValidationError)
    async def _vl(req: Request, exc: ValidationError):
        return JSONResponse(status_code=400, content={"detail": exc.detail})

    @mini.exception_handler(InternalError)
    async def _ie(req: Request, exc: InternalError):
        return JSONResponse(status_code=500, content={"detail": exc.detail})

    return mini


def _override_recep():
    return _RECEP


# ── CITAS ROUTER ────────────────────────────────────────────────────────────────

import app.application.citas.use_cases as _citas_uc
from app.application.citas.use_cases import CitasService, configure_service as _cfg_citas


@pytest.fixture(scope="module")
def citas_client():
    svc = MagicMock(spec=CitasService)
    svc.citas_stats.return_value = {"total": 0, "por_estatus": {}}
    svc.citas_hoy.return_value = {"total": 0, "citas": [], "fecha": "2026-05-27"}
    svc.listar_citas.return_value = []
    svc.obtener_cita.return_value = {
        "id_cita": 1, "id_paciente": 1, "nombre_paciente": "Test",
        "fecha_hora": "2026-06-01T10:00:00", "estatus": "PROGRAMADA",
    }
    svc.crear_cita.return_value = {
        "id_cita": 99, "id_paciente": 1,
        "fecha_hora": "2026-06-01T10:00:00", "estatus": "PROGRAMADA",
    }
    svc.actualizar_cita.return_value = {"id_cita": 1, "estatus": "PROGRAMADA"}
    svc.iniciar_cita.return_value = {"id_cita": 1, "estatus": "EN_CURSO"}
    svc.completar_cita.return_value = {"id_cita": 1, "estatus": "COMPLETADA"}
    svc.cancelar_cita.return_value = {"id_cita": 1, "estatus": "CANCELADA"}
    svc.eliminar_cita.return_value = {"detail": "Cita eliminada"}
    svc.citas_proximas.return_value = []
    _cfg_citas(svc)

    from app.presentation.api.routers import citas as rtr
    app = FastAPI()
    app.include_router(rtr.router, prefix="/api/citas")
    app.dependency_overrides[get_current_user] = _override_admin

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    _citas_uc._service = None


class TestCitasRouter:
    def test_stats(self, citas_client):
        r = citas_client.get("/api/citas/stats")
        assert r.status_code == 200
        assert "total" in r.json()

    def test_hoy(self, citas_client):
        r = citas_client.get("/api/citas/hoy")
        assert r.status_code == 200
        data = r.json()
        assert "citas" in data
        assert "total" in data

    def test_listar_default(self, citas_client):
        r = citas_client.get("/api/citas")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_listar_con_filtros(self, citas_client):
        r = citas_client.get("/api/citas", params={"fecha": "2026-06-01", "estatus": "PROGRAMADA"})
        assert r.status_code == 200

    def test_listar_limit_invalido_422(self, citas_client):
        r = citas_client.get("/api/citas", params={"limit": 0})
        assert r.status_code == 422

    def test_listar_limit_excesivo_422(self, citas_client):
        r = citas_client.get("/api/citas", params={"limit": 9999})
        assert r.status_code == 422

    def test_obtener_cita(self, citas_client):
        r = citas_client.get("/api/citas/1")
        assert r.status_code == 200
        assert r.json()["id_cita"] == 1

    def test_crear_cita_201(self, citas_client):
        body = {"id_paciente": 1, "fecha_hora": "2026-06-01T10:00:00"}
        r = citas_client.post("/api/citas", json=body)
        assert r.status_code == 201

    def test_crear_cita_sin_body_422(self, citas_client):
        r = citas_client.post("/api/citas", json={})
        assert r.status_code == 422

    def test_actualizar_cita(self, citas_client):
        body = {"id_paciente": 1, "fecha_hora": "2026-06-02T09:00:00"}
        r = citas_client.put("/api/citas/1", json=body)
        assert r.status_code == 200

    def test_iniciar_cita(self, citas_client):
        r = citas_client.put("/api/citas/1/iniciar")
        assert r.status_code == 200
        assert r.json()["estatus"] == "EN_CURSO"

    def test_completar_cita(self, citas_client):
        r = citas_client.put("/api/citas/1/completar")
        assert r.status_code == 200
        assert r.json()["estatus"] == "COMPLETADA"

    def test_cancelar_cita(self, citas_client):
        r = citas_client.put("/api/citas/1/cancelar")
        assert r.status_code == 200
        assert r.json()["estatus"] == "CANCELADA"

    def test_eliminar_cita(self, citas_client):
        r = citas_client.delete("/api/citas/1")
        assert r.status_code == 200

    def test_not_found_propagado(self):
        """Si el servicio lanza NotFoundError, el router devuelve 404."""
        svc = MagicMock(spec=CitasService)
        svc.obtener_cita.side_effect = NotFoundError("Cita no encontrada")
        _cfg_citas(svc)

        from app.presentation.api.routers import citas as rtr
        app = _make_app_with_handlers()
        app.include_router(rtr.router, prefix="/api/citas")
        app.dependency_overrides[get_current_user] = _override_admin

        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/citas/9999")
        assert r.status_code == 404

        _citas_uc._service = None

    def test_sin_auth_401(self):
        """Sin token debe retornar 401."""
        from app.presentation.api.routers import citas as rtr
        svc = MagicMock(spec=CitasService)
        svc.listar_citas.return_value = []
        _cfg_citas(svc)

        from app.presentation.api.dependencies import get_token_decoder
        from app.infrastructure.security.adapters import JwtAccessTokenIssuer

        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/citas")
        # No se sobreescribe get_current_user → necesita JWT real
        app.dependency_overrides[get_token_decoder] = JwtAccessTokenIssuer

        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/citas")
        assert r.status_code == 401

        _citas_uc._service = None


# ── RECIBOS ROUTER ──────────────────────────────────────────────────────────────

import app.application.recibos.use_cases as _recibos_uc
from app.application.recibos.use_cases import RecibosService, configure_service as _cfg_recibos


@pytest.fixture(scope="module")
def recibos_client():
    svc = MagicMock(spec=RecibosService)
    svc.stats_ventas.return_value = {"total": 0, "total_monto": 0}
    svc.listar_metodos_pago.return_value = [
        {"id_metodo_pago": 1, "nombre": "EFECTIVO"},
        {"id_metodo_pago": 2, "nombre": "TARJETA"},
    ]
    svc.listar_ventas.return_value = []
    svc.crear_venta.return_value = {
        "id_venta": 99, "id_paciente": 1, "monto_total": 500.0, "estatus": "PENDIENTE",
    }
    svc.obtener_venta.return_value = {
        "id_venta": 1, "id_paciente": 1, "monto_total": 500.0, "estatus": "PENDIENTE",
    }
    svc.cancelar_venta.return_value = {"id_venta": 1, "estatus": "CANCELADA"}
    svc.registrar_pago.return_value = {"id_pago": 1, "monto": 200.0}
    svc.exentar_venta.return_value = {"id_venta": 1, "exento_pago": "S"}
    svc.listar_items_venta.return_value = []
    _cfg_recibos(svc)

    from app.presentation.api.routers import recibos as rtr
    app = FastAPI()
    app.include_router(rtr.router, prefix="/api/recibos")
    app.dependency_overrides[get_current_user] = _override_admin

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    _recibos_uc._service = None


class TestRecibosRouter:
    def test_stats(self, recibos_client):
        r = recibos_client.get("/api/recibos/stats")
        assert r.status_code == 200

    def test_metodos_pago(self, recibos_client):
        r = recibos_client.get("/api/recibos/metodos-pago")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_listar_ventas(self, recibos_client):
        r = recibos_client.get("/api/recibos")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_listar_con_filtros(self, recibos_client):
        r = recibos_client.get(
            "/api/recibos",
            params={"fecha_inicio": "2026-01-01", "fecha_fin": "2026-12-31", "search": "EB-001"},
        )
        assert r.status_code == 200

    def test_listar_limit_invalido_422(self, recibos_client):
        r = recibos_client.get("/api/recibos", params={"limit": 0})
        assert r.status_code == 422

    def test_crear_venta_201(self, recibos_client):
        body = {
            "id_paciente": 1,
            "monto_total": 500.0,
            "exento_pago": "N",
            "metodos_pago": [{"id_metodo_pago": 1, "monto": 500.0}],
            "items": [
                {
                    "tipo": "SERVICIO",
                    "id_referencia": 1,
                    "descripcion": "Consulta médica",
                    "precio_unitario": 500.0,
                    "cantidad": 1,
                }
            ],
        }
        r = recibos_client.post("/api/recibos", json=body)
        assert r.status_code == 201

    def test_crear_venta_sin_paciente_422(self, recibos_client):
        r = recibos_client.post("/api/recibos", json={"monto_total": 100})
        assert r.status_code == 422

    def test_obtener_venta(self, recibos_client):
        r = recibos_client.get("/api/recibos/1")
        assert r.status_code == 200
        assert r.json()["id_venta"] == 1

    def test_cancelar_venta(self, recibos_client):
        r = recibos_client.put("/api/recibos/1/cancelar", params={"motivo": "Prueba"})
        assert r.status_code == 200
        assert r.json()["estatus"] == "CANCELADA"

    def test_registrar_pago_parcial(self, recibos_client):
        r = recibos_client.post(
            "/api/recibos/1/pagos",
            json={"id_metodo_pago": 1, "monto": 200.0},
        )
        assert r.status_code == 201

    def test_exentar_venta(self, recibos_client):
        r = recibos_client.put("/api/recibos/1/exentar", json={"nota": "Por acuerdo directivo"})
        assert r.status_code == 200

    def test_listar_items_venta(self, recibos_client):
        r = recibos_client.get("/api/recibos/1/items")
        assert r.status_code == 200

    def test_not_found_venta(self):
        svc = MagicMock(spec=RecibosService)
        svc.obtener_venta.side_effect = NotFoundError("Venta no encontrada")
        _cfg_recibos(svc)

        from app.presentation.api.routers import recibos as rtr
        app = _make_app_with_handlers()
        app.include_router(rtr.router, prefix="/api/recibos")
        app.dependency_overrides[get_current_user] = _override_admin

        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/recibos/9999")
        assert r.status_code == 404

        _recibos_uc._service = None


# ── DOCTORES ROUTER ─────────────────────────────────────────────────────────────

import app.application.doctores.use_cases as _doctores_uc
from app.application.doctores.use_cases import DoctoresService, configure_service as _cfg_doctores


@pytest.fixture(scope="module")
def doctores_client():
    svc = MagicMock(spec=DoctoresService)
    svc.listar_doctores.return_value = [
        {"id_doctor": 1, "nombre": "Roberto", "apellido_paterno": "Sánchez",
         "especialidad": "Neurología", "activo": "S"},
    ]
    svc.doctor_del_dia.return_value = {}
    svc.obtener_doctor.return_value = {
        "id_doctor": 1, "nombre": "Roberto", "apellido_paterno": "Sánchez",
        "especialidad": "Neurología", "activo": "S",
    }
    svc.crear_doctor.return_value = {
        "id_doctor": 99, "nombre": "Nuevo", "apellido_paterno": "Doctor",
        "especialidad": "Pediatría", "activo": "S",
    }
    svc.actualizar_doctor.return_value = {
        "id_doctor": 1, "nombre": "Roberto Mod", "apellido_paterno": "Sánchez",
        "especialidad": "Neurología", "activo": "S",
    }
    svc.desactivar_doctor.return_value = {"id_doctor": 1, "activo": "N"}
    svc.obtener_disponibilidad.return_value = []
    svc.obtener_disponibilidad_semana.return_value = []
    svc.crear_disponibilidad.return_value = {"id_disponibilidad": 1, "dia_semana": 1}
    svc.eliminar_disponibilidad.return_value = {"detail": "Eliminado"}
    svc.obtener_servicios_doctor.return_value = []
    svc.listar_disponibilidad_especial.return_value = []
    svc.crear_disponibilidad_especial.return_value = {"id": 1}
    svc.eliminar_disponibilidad_especial.return_value = {"detail": "Eliminado"}
    _cfg_doctores(svc)

    from app.presentation.api.routers import doctores as rtr
    app = FastAPI()
    app.include_router(rtr.router, prefix="/api/doctores")
    app.dependency_overrides[get_current_user] = _override_admin

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    _doctores_uc._service = None


class TestDoctoresRouter:
    def test_listar_doctores(self, doctores_client):
        r = doctores_client.get("/api/doctores")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["nombre"] == "Roberto"

    def test_doctor_del_dia(self, doctores_client):
        r = doctores_client.get("/api/doctores/hoy")
        assert r.status_code == 200

    def test_disponibilidad_semana(self, doctores_client):
        r = doctores_client.get("/api/doctores/disponibilidad/semana")
        assert r.status_code == 200

    def test_obtener_doctor(self, doctores_client):
        r = doctores_client.get("/api/doctores/1")
        assert r.status_code == 200
        assert r.json()["id_doctor"] == 1

    def test_crear_doctor_201(self, doctores_client):
        body = {
            "nombre": "Nuevo", "apellido_paterno": "Doctor",
            "especialidad": "Pediatría", "activo": "S",
        }
        r = doctores_client.post("/api/doctores", json=body)
        assert r.status_code == 201
        assert r.json()["id_doctor"] == 99

    def test_actualizar_doctor(self, doctores_client):
        body = {
            "nombre": "Roberto Mod", "apellido_paterno": "Sánchez",
            "especialidad": "Neurología", "activo": "S",
        }
        r = doctores_client.put("/api/doctores/1", json=body)
        assert r.status_code == 200
        assert r.json()["nombre"] == "Roberto Mod"

    def test_desactivar_doctor(self, doctores_client):
        r = doctores_client.delete("/api/doctores/1")
        assert r.status_code == 200
        assert r.json()["activo"] == "N"

    def test_obtener_disponibilidad(self, doctores_client):
        r = doctores_client.get("/api/doctores/1/disponibilidad")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_crear_disponibilidad_201(self, doctores_client):
        r = doctores_client.post(
            "/api/doctores/1/disponibilidad",
            json={"dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "14:00"},
        )
        assert r.status_code == 201

    def test_eliminar_disponibilidad(self, doctores_client):
        r = doctores_client.delete("/api/doctores/1/disponibilidad/1")
        assert r.status_code == 200

    def test_not_found_doctor(self):
        svc = MagicMock(spec=DoctoresService)
        svc.obtener_doctor.side_effect = NotFoundError("Doctor no encontrado")
        _cfg_doctores(svc)

        from app.presentation.api.routers import doctores as rtr
        app = _make_app_with_handlers()
        app.include_router(rtr.router, prefix="/api/doctores")
        app.dependency_overrides[get_current_user] = _override_admin

        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/doctores/9999")
        assert r.status_code == 404

        _doctores_uc._service = None

    def test_recepcionista_no_puede_crear_doctor(self):
        """require_role(ADMINISTRADOR) rechaza recepcionista → 403."""
        svc = MagicMock(spec=DoctoresService)
        svc.listar_doctores.return_value = []
        _cfg_doctores(svc)

        from app.presentation.api.routers import doctores as rtr
        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/doctores")
        app.dependency_overrides[get_current_user] = _override_recep

        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.post(
                "/api/doctores",
                json={"nombre": "X", "apellido_paterno": "Y", "especialidad": "Z", "activo": "S"},
            )
        assert r.status_code == 403

        _doctores_uc._service = None


# ── BITÁCORA ROUTER ─────────────────────────────────────────────────────────────

import app.application.bitacora.use_cases as _bitacora_uc
from app.application.bitacora.use_cases import BitacoraService, configure_service as _cfg_bitacora


@pytest.fixture(scope="module")
def bitacora_client():
    svc = MagicMock(spec=BitacoraService)
    svc.listar.return_value = {
        "items": [
            {
                "id_bitacora": 1, "tabla_afectada": "BENEFICIARIO",
                "tipo_operacion": "INSERT", "id_registro_afectado": "BEN-000001",
                "fecha_cambio": "2026-05-27T08:30:00",
                "id_usuario": 1, "usuario_nombre": "Admin", "usuario_apellido": "Test",
            }
        ],
        "total": 1, "limit": 20, "offset": 0,
    }
    _cfg_bitacora(svc)

    from app.presentation.api.routers import bitacora as rtr
    app = FastAPI()
    app.include_router(rtr.router, prefix="/api/bitacora")
    app.dependency_overrides[get_current_user] = _override_admin

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    _bitacora_uc._service = None


class TestBitacoraRouter:
    def test_listar_bitacora(self, bitacora_client):
        r = bitacora_client.get("/api/bitacora")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert data["total"] == 1
        assert data["items"][0]["tabla_afectada"] == "BENEFICIARIO"

    def test_filtrar_por_tabla(self, bitacora_client):
        r = bitacora_client.get("/api/bitacora", params={"tabla": "BENEFICIARIO"})
        assert r.status_code == 200

    def test_filtrar_por_operacion(self, bitacora_client):
        r = bitacora_client.get("/api/bitacora", params={"tipo_operacion": "INSERT"})
        assert r.status_code == 200

    def test_filtrar_por_fechas(self, bitacora_client):
        r = bitacora_client.get(
            "/api/bitacora",
            params={"fecha_inicio": "2026-01-01", "fecha_fin": "2026-12-31"},
        )
        assert r.status_code == 200

    def test_filtrar_por_busqueda(self, bitacora_client):
        r = bitacora_client.get("/api/bitacora", params={"busqueda": "Admin"})
        assert r.status_code == 200

    def test_paginacion(self, bitacora_client):
        r = bitacora_client.get("/api/bitacora", params={"limit": 5, "offset": 0})
        assert r.status_code == 200

    def test_limit_invalido_422(self, bitacora_client):
        r = bitacora_client.get("/api/bitacora", params={"limit": 0})
        assert r.status_code == 422

    def test_recepcionista_no_puede_ver_bitacora(self):
        """Bitácora requiere ADMINISTRADOR — recepcionista recibe 403."""
        svc = MagicMock(spec=BitacoraService)
        svc.listar.return_value = {"items": [], "total": 0, "limit": 20, "offset": 0}
        _cfg_bitacora(svc)

        from app.presentation.api.routers import bitacora as rtr
        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/bitacora")
        app.dependency_overrides[get_current_user] = _override_recep

        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/bitacora")
        assert r.status_code == 403

        _bitacora_uc._service = None

    def test_sin_auth_401(self):
        """Sin token debe retornar 401."""
        svc = MagicMock(spec=BitacoraService)
        svc.listar.return_value = {"items": [], "total": 0, "limit": 20, "offset": 0}
        _cfg_bitacora(svc)

        from app.presentation.api.routers import bitacora as rtr
        from app.presentation.api.dependencies import get_token_decoder
        from app.infrastructure.security.adapters import JwtAccessTokenIssuer

        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/bitacora")
        app.dependency_overrides[get_token_decoder] = JwtAccessTokenIssuer

        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/bitacora")
        assert r.status_code == 401

        _bitacora_uc._service = None
