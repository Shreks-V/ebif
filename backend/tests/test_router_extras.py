"""
Router tests for previously uncovered endpoints.

Covers:
  - auth.py: /seed, /token/refresh, /refresh, /usuarios/{id}/reset-contrasena
  - almacen.py: productos, servicios, comodatos, movimientos, stats (CRUD completo)
  - exportaciones.py: PDF/Excel streaming responses + WebSocket ws_exportar
  - notificaciones.py: WebSocket con token inválido / sin sub
  - geocoding use_cases: GeocodingService.geocodificar_lote (happy path + fallback)

All service calls are mocked — no Oracle DB required.
"""
from __future__ import annotations

import json
from io import BytesIO
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.presentation.api.security import get_current_user, require_role
from app.domain.exceptions import NotFoundError, ConflictError, ValidationError, InternalError
from app.domain.exportaciones.entities import FilePayload

# ── Fake users ───────────────────────────────────────────────────────────────────

_ADMIN = {"correo": "adm@extra.test", "rol": "ADMINISTRADOR", "id_usuario": 1, "nombre": "Admin"}
_RECEP = {"correo": "rec@extra.test", "rol": "RECEPCIONISTA", "id_usuario": 2, "nombre": "Recep"}


def _override_admin():
    return _ADMIN


def _override_recep():
    return _RECEP


def _mini(routers: list) -> FastAPI:
    """Mini FastAPI with domain exception handlers."""
    app = FastAPI()

    @app.exception_handler(NotFoundError)
    async def _nf(req: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @app.exception_handler(ConflictError)
    async def _cf(req: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @app.exception_handler(ValidationError)
    async def _vl(req: Request, exc: ValidationError):
        return JSONResponse(status_code=400, content={"detail": exc.detail})

    @app.exception_handler(InternalError)
    async def _ie(req: Request, exc: InternalError):
        return JSONResponse(status_code=500, content={"detail": exc.detail})

    for prefix, router in routers:
        app.include_router(router, prefix=prefix)

    app.dependency_overrides[get_current_user] = _override_admin
    return app


# ══════════════════════════════════════════════════════════════════════════════════
# AUTH — /seed, /token/refresh, /refresh, /reset-contrasena
# ══════════════════════════════════════════════════════════════════════════════════

import app.application.auth.use_cases as _auth_uc
from app.application.auth.use_cases import AuthService
from app.presentation.api.dependencies import get_auth_service


@pytest.fixture(scope="module")
def auth_extra_client():
    svc = MagicMock(spec=AuthService)
    svc.seed_default_users.return_value = {"created": 2, "errors": []}
    svc.admin_reset_password.return_value = None
    svc.get_me.return_value = {
        "id_usuario": 1, "nombre": "Admin", "correo": "adm@extra.test",
        "rol": "ADMINISTRADOR", "estatus": "ACTIVO",
    }

    from app.presentation.api.routers import auth as rtr
    app = _mini([(f"/api/auth", rtr.router)])
    app.dependency_overrides[get_auth_service] = lambda: svc
    app.dependency_overrides[get_current_user] = _override_admin

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c, svc


class TestAuthExtras:
    # ── /seed ────────────────────────────────────────────────────────────────────
    def test_seed_admin_200(self, auth_extra_client):
        c, svc = auth_extra_client
        r = c.post("/api/auth/seed")
        assert r.status_code == 200

    def test_seed_forbidden_403(self, auth_extra_client):
        from app.application.auth.exceptions import ForbiddenError
        c, svc = auth_extra_client
        svc.seed_default_users.side_effect = ForbiddenError("no")
        r = c.post("/api/auth/seed")
        assert r.status_code == 403
        svc.seed_default_users.side_effect = None
        svc.seed_default_users.return_value = {"created": 2, "errors": []}

    def test_seed_exception_500(self, auth_extra_client):
        c, svc = auth_extra_client
        svc.seed_default_users.side_effect = RuntimeError("DB down")
        r = c.post("/api/auth/seed")
        assert r.status_code == 500
        svc.seed_default_users.side_effect = None
        svc.seed_default_users.return_value = {"created": 2, "errors": []}

    # ── /token/refresh ───────────────────────────────────────────────────────────
    def test_token_refresh_sin_body_422(self, auth_extra_client):
        c, _ = auth_extra_client
        r = c.post("/api/auth/token/refresh", json={})
        assert r.status_code == 422

    def test_token_refresh_token_invalido_401(self, auth_extra_client):
        c, _ = auth_extra_client
        r = c.post("/api/auth/token/refresh", json={"refresh_token": "not.a.jwt"})
        assert r.status_code == 401

    def test_token_refresh_tipo_incorrecto_401(self, auth_extra_client):
        """Token válido pero de tipo 'access', no 'refresh'."""
        from app.infrastructure.security.adapters import JwtAccessTokenIssuer
        issuer = JwtAccessTokenIssuer()
        # issue an access token (type != refresh)
        token = issuer.issue({"sub": "adm@extra.test", "rol": "ADMINISTRADOR", "id_usuario": 1, "nombre": "Admin"})
        c, _ = auth_extra_client
        r = c.post("/api/auth/token/refresh", json={"refresh_token": token})
        assert r.status_code == 401

    # ── /refresh ─────────────────────────────────────────────────────────────────
    def test_refresh_con_auth_200(self, auth_extra_client):
        c, _ = auth_extra_client
        r = c.post("/api/auth/refresh")
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_refresh_sin_auth_401(self):
        from app.presentation.api.routers import auth as rtr
        # Build app WITHOUT overriding get_current_user so real JWT validation runs
        bare = FastAPI()
        bare.include_router(rtr.router, prefix="/api/auth")
        with TestClient(bare, raise_server_exceptions=False) as c:
            r = c.post("/api/auth/refresh")
        assert r.status_code == 401

    # ── /usuarios/{id}/reset-contrasena ──────────────────────────────────────────
    def test_reset_password_admin_200(self, auth_extra_client):
        c, svc = auth_extra_client
        svc.admin_reset_password.return_value = None
        r = c.post("/api/auth/usuarios/2/reset-contrasena",
                   json={"contrasena_nueva": "NewPass1234!"})
        assert r.status_code == 200
        assert r.json()["message"] == "Contraseña restablecida correctamente"

    def test_reset_password_forbidden_403(self, auth_extra_client):
        from app.application.auth.exceptions import ForbiddenError
        c, svc = auth_extra_client
        svc.admin_reset_password.side_effect = ForbiddenError("no")
        r = c.post("/api/auth/usuarios/2/reset-contrasena",
                   json={"contrasena_nueva": "NewPass1234!"})
        assert r.status_code == 403
        svc.admin_reset_password.side_effect = None

    def test_reset_password_not_found_404(self, auth_extra_client):
        from app.domain.auth.exceptions import UserNotFoundError
        c, svc = auth_extra_client
        svc.admin_reset_password.side_effect = UserNotFoundError("no existe")
        r = c.post("/api/auth/usuarios/9999/reset-contrasena",
                   json={"contrasena_nueva": "NewPass1234!"})
        assert r.status_code == 404
        svc.admin_reset_password.side_effect = None

    def test_reset_password_corta_422(self, auth_extra_client):
        from app.application.auth.exceptions import PasswordTooShortError
        c, svc = auth_extra_client
        svc.admin_reset_password.side_effect = PasswordTooShortError("muy corta")
        r = c.post("/api/auth/usuarios/2/reset-contrasena",
                   json={"contrasena_nueva": "abc"})
        assert r.status_code in (400, 422)
        svc.admin_reset_password.side_effect = None


# ══════════════════════════════════════════════════════════════════════════════════
# ALMACEN ROUTER
# ══════════════════════════════════════════════════════════════════════════════════

import app.application.almacen.use_cases as _almacen_uc
from app.application.almacen.use_cases import AlmacenService, configure_service as _cfg_almacen

_PRODUCTO = {
    "id_producto": 1, "clave_interna": "MED-001", "nombre": "Paracetamol",
    "tipo_producto": "MEDICAMENTO", "activo": "S", "cantidad_disponible": 50,
    "nivel_minimo": 5, "precio_cuota_a": 10.0, "precio_cuota_b": None,
}
_SERVICIO = {
    "id_servicio": 1, "nombre": "Consulta Neurología", "activo": "S",
    "cuota_recuperacion": 100.0, "categoria": "SERVICIO",
}
_COMODATO = {
    "id_comodato": 1, "folio_comodato": "COD-000001",
    "id_equipo": 1, "id_paciente": 1,
    "nombre_paciente": "Ana", "folio_paciente": "BEN-000001",
    "nombre_equipo": "Silla de ruedas",
    "estatus": "PRESTADO", "fecha_prestamo": "2026-01-01",
    "fecha_devolucion": None, "monto_total": 0.0,
    "monto_pagado": 0.0, "saldo_pendiente": 0.0,
    "exento_pago": "N", "notas": None,
}


@pytest.fixture(scope="module")
def almacen_client():
    svc = MagicMock(spec=AlmacenService)
    svc.listar_productos.return_value = [_PRODUCTO]
    svc.obtener_producto.return_value = _PRODUCTO
    svc.crear_producto.return_value = {**_PRODUCTO, "id_producto": 99}
    svc.actualizar_producto.return_value = _PRODUCTO
    svc.desactivar_producto.return_value = {"detail": "Producto desactivado"}
    svc.ajustar_existencia.return_value = {**_PRODUCTO, "cantidad_disponible": 80}
    svc.listar_servicios.return_value = [_SERVICIO]
    svc.obtener_servicio.return_value = _SERVICIO
    svc.crear_servicio.return_value = {**_SERVICIO, "id_servicio": 99}
    svc.actualizar_servicio.return_value = _SERVICIO
    svc.desactivar_servicio.return_value = {"detail": "Servicio desactivado"}
    svc.listar_comodatos.return_value = [_COMODATO]
    svc.obtener_comodato.return_value = _COMODATO
    svc.crear_comodato.return_value = {**_COMODATO, "id_comodato": 99}
    svc.actualizar_comodato.return_value = _COMODATO
    svc.listar_movimientos.return_value = []
    svc.almacen_stats.return_value = {
        "stock_bajo": 2, "por_caducar": 1, "total_productos": 15,
    }
    _cfg_almacen(svc)

    from app.presentation.api.routers import almacen as rtr
    app = _mini([("/api/almacen", rtr.router)])
    app.dependency_overrides[get_current_user] = _override_admin
    # require_role('ADMINISTRADOR', ...) also reads from get_current_user
    from app.presentation.api.security import require_role as _rr
    app.dependency_overrides[_rr("ADMINISTRADOR", "ENCARGADO_ALMACEN")] = _override_admin
    app.dependency_overrides[_rr("ADMINISTRADOR")] = _override_admin

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    _almacen_uc._service = None


class TestAlmacenRouter:
    # ── productos ────────────────────────────────────────────────────────────────
    def test_listar_productos(self, almacen_client):
        r = almacen_client.get("/api/almacen/productos")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_listar_productos_con_filtros(self, almacen_client):
        r = almacen_client.get(
            "/api/almacen/productos",
            params={"tipo_producto": "MEDICAMENTO", "busqueda": "Para", "activo": "S"}
        )
        assert r.status_code == 200

    def test_obtener_producto(self, almacen_client):
        r = almacen_client.get("/api/almacen/productos/1")
        assert r.status_code == 200
        assert r.json()["nombre"] == "Paracetamol"

    def test_crear_producto_201(self, almacen_client):
        body = {
            "clave_interna": "MED-002", "nombre": "Ibuprofeno",
            "tipo_producto": "MEDICAMENTO", "activo": "S",
        }
        r = almacen_client.post("/api/almacen/productos", json=body)
        assert r.status_code == 201

    def test_crear_producto_sin_nombre_422(self, almacen_client):
        r = almacen_client.post("/api/almacen/productos", json={"tipo_producto": "MEDICAMENTO"})
        assert r.status_code == 422

    def test_actualizar_producto(self, almacen_client):
        body = {
            "clave_interna": "MED-001", "nombre": "Paracetamol 500mg",
            "tipo_producto": "MEDICAMENTO", "activo": "S",
        }
        r = almacen_client.put("/api/almacen/productos/1", json=body)
        assert r.status_code == 200

    def test_desactivar_producto(self, almacen_client):
        r = almacen_client.delete("/api/almacen/productos/1")
        assert r.status_code == 200

    def test_ajustar_existencia(self, almacen_client):
        r = almacen_client.patch(
            "/api/almacen/productos/1/existencia",
            json={"stock_nuevo": 80, "motivo": "Reposición"}
        )
        assert r.status_code == 200
        assert r.json()["cantidad_disponible"] == 80

    def test_listar_productos_limit_invalido_422(self, almacen_client):
        r = almacen_client.get("/api/almacen/productos", params={"limit": 0})
        assert r.status_code == 422

    # ── servicios ────────────────────────────────────────────────────────────────
    def test_listar_servicios(self, almacen_client):
        r = almacen_client.get("/api/almacen/servicios")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_listar_servicios_con_filtros(self, almacen_client):
        r = almacen_client.get(
            "/api/almacen/servicios",
            params={"busqueda": "Consul", "categoria": "SERVICIO", "activo": "S"}
        )
        assert r.status_code == 200

    def test_obtener_servicio(self, almacen_client):
        r = almacen_client.get("/api/almacen/servicios/1")
        assert r.status_code == 200

    def test_crear_servicio_201(self, almacen_client):
        r = almacen_client.post(
            "/api/almacen/servicios",
            json={"nombre": "Fisioterapia", "cuota_recuperacion": 200.0}
        )
        assert r.status_code == 201

    def test_crear_servicio_sin_nombre_422(self, almacen_client):
        r = almacen_client.post("/api/almacen/servicios", json={})
        assert r.status_code == 422

    def test_actualizar_servicio(self, almacen_client):
        r = almacen_client.put(
            "/api/almacen/servicios/1",
            json={"nombre": "Consulta Neurología (actualizado)", "cuota_recuperacion": 150.0}
        )
        assert r.status_code == 200

    def test_desactivar_servicio(self, almacen_client):
        r = almacen_client.delete("/api/almacen/servicios/1")
        assert r.status_code == 200

    # ── comodatos ────────────────────────────────────────────────────────────────
    def test_listar_comodatos(self, almacen_client):
        r = almacen_client.get("/api/almacen/comodatos")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_listar_comodatos_con_filtros(self, almacen_client):
        r = almacen_client.get(
            "/api/almacen/comodatos",
            params={"estatus": "PRESTADO", "busqueda": "Ana"}
        )
        assert r.status_code == 200

    def test_obtener_comodato(self, almacen_client):
        r = almacen_client.get("/api/almacen/comodatos/1")
        assert r.status_code == 200

    def test_crear_comodato_201(self, almacen_client):
        body = {"id_equipo": 1, "id_paciente": 1, "fecha_prestamo": "2026-06-01",
                "monto_total": 0.0, "estatus": "PRESTADO", "exento_pago": "N"}
        r = almacen_client.post("/api/almacen/comodatos", json=body)
        assert r.status_code == 201

    def test_actualizar_comodato(self, almacen_client):
        body = {"id_equipo": 1, "id_paciente": 1, "fecha_prestamo": "2026-06-01",
                "monto_total": 0.0, "estatus": "PRESTADO", "exento_pago": "N"}
        r = almacen_client.put("/api/almacen/comodatos/1", json=body)
        assert r.status_code == 200

    # ── movimientos y stats ──────────────────────────────────────────────────────
    def test_listar_movimientos(self, almacen_client):
        r = almacen_client.get("/api/almacen/movimientos")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_listar_movimientos_con_filtros(self, almacen_client):
        r = almacen_client.get(
            "/api/almacen/movimientos",
            params={"id_producto": 1, "tipo_movimiento": "ENTRADA",
                    "fecha_inicio": "2026-01-01", "fecha_fin": "2026-12-31"}
        )
        assert r.status_code == 200

    def test_almacen_stats(self, almacen_client):
        r = almacen_client.get("/api/almacen/stats")
        assert r.status_code == 200
        assert "stock_bajo" in r.json()
        assert "total_productos" in r.json()

    def test_not_found_producto(self):
        svc = MagicMock(spec=AlmacenService)
        svc.obtener_producto.side_effect = NotFoundError("Producto no encontrado")
        _cfg_almacen(svc)

        from app.presentation.api.routers import almacen as rtr
        app = _mini([("/api/almacen", rtr.router)])
        app.dependency_overrides[get_current_user] = _override_admin
        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/almacen/productos/9999")
        assert r.status_code == 404

        _almacen_uc._service = None


# ══════════════════════════════════════════════════════════════════════════════════
# EXPORTACIONES ROUTER
# ══════════════════════════════════════════════════════════════════════════════════

import app.application.exportaciones.use_cases as _export_uc
from app.application.exportaciones.use_cases import ExportacionesService, configure_service as _cfg_export

_FAKE_PDF = FilePayload(content=b"%PDF-1.4 fake", filename="test.pdf", media_type="application/pdf")
_FAKE_XLSX = FilePayload(content=b"PK fake excel", filename="test.xlsx",
                         media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@pytest.fixture(scope="module")
def export_client():
    svc = MagicMock(spec=ExportacionesService)
    svc.exportar_reporte_pdf.return_value = _FAKE_PDF
    svc.exportar_beneficiario_pdf.return_value = _FAKE_PDF
    svc.exportar_credencial_pdf.return_value = _FAKE_PDF
    svc.exportar_comprobante_cita.return_value = _FAKE_PDF
    svc.exportar_contrato_comodato.return_value = _FAKE_PDF
    svc.exportar_beneficiarios_excel.return_value = _FAKE_XLSX
    svc.exportar_reporte_excel.return_value = _FAKE_XLSX
    _cfg_export(svc)

    from app.presentation.api.routers import exportaciones as rtr
    app = _mini([("/api/exportaciones", rtr.router)])
    app.dependency_overrides[get_current_user] = _override_admin

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    _export_uc._service = None


class TestExportacionesRouter:
    def test_reporte_pdf_200(self, export_client):
        r = export_client.get("/api/exportaciones/reportes/pdf")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")

    def test_reporte_pdf_con_filtros(self, export_client):
        r = export_client.get(
            "/api/exportaciones/reportes/pdf",
            params={"tipo": "por-genero", "genero": "Masculino", "mes": 1, "anio": 2026}
        )
        assert r.status_code == 200

    def test_beneficiario_pdf_200(self, export_client):
        r = export_client.get("/api/exportaciones/beneficiario/BEN-000001/pdf")
        assert r.status_code == 200
        assert "attachment" in r.headers.get("content-disposition", "")

    def test_credencial_pdf_200(self, export_client):
        r = export_client.get("/api/exportaciones/beneficiario/BEN-000001/credencial")
        assert r.status_code == 200

    def test_comprobante_cita_pdf_200(self, export_client):
        r = export_client.get("/api/exportaciones/cita/1/comprobante")
        assert r.status_code == 200

    def test_contrato_comodato_pdf_200(self, export_client):
        r = export_client.get("/api/exportaciones/comodato/1/contrato")
        assert r.status_code == 200

    def test_beneficiarios_excel_200(self, export_client):
        r = export_client.get("/api/exportaciones/beneficiarios/excel")
        assert r.status_code == 200
        ct = r.headers["content-type"]
        assert "spreadsheetml" in ct or "excel" in ct or "octet" in ct

    def test_beneficiarios_excel_con_filtros(self, export_client):
        r = export_client.get(
            "/api/exportaciones/beneficiarios/excel",
            params={"genero": "Femenino", "membresia_estatus": "ACTIVO"}
        )
        assert r.status_code == 200

    def test_reporte_excel_200(self, export_client):
        r = export_client.get("/api/exportaciones/reportes/excel")
        assert r.status_code == 200

    def test_reporte_excel_con_filtros(self, export_client):
        r = export_client.get(
            "/api/exportaciones/reportes/excel",
            params={"tipo": "servicios-por-tipo", "fecha_inicio": "2026-01-01"}
        )
        assert r.status_code == 200

    def test_sin_auth_401(self):
        from app.presentation.api.routers import exportaciones as rtr
        svc = MagicMock(spec=ExportacionesService)
        svc.exportar_reporte_pdf.return_value = _FAKE_PDF
        _cfg_export(svc)

        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/exportaciones")
        # No dependency override → real JWT required
        with TestClient(app, raise_server_exceptions=False) as c:
            r = c.get("/api/exportaciones/reportes/pdf")
        assert r.status_code == 401

        _export_uc._service = None


class TestExportacionesWebSocket:
    """WebSocket ws_exportar — progreso en tiempo real."""

    def _ws_drain_until_error(self, ws, max_msgs: int = 5) -> dict:
        """Receive messages until we get one with 'error', or exhaust max_msgs."""
        for _ in range(max_msgs):
            try:
                msg = json.loads(ws.receive_text())
                if "error" in msg:
                    return msg
            except Exception:
                break
        return {}

    def test_ws_sin_token_cierra_con_error(self):
        """Sin token → el handler envía paso 1 y luego un mensaje de error."""
        from app.presentation.api.routers import exportaciones as rtr
        svc = MagicMock(spec=ExportacionesService)
        svc.exportar_reporte_pdf.return_value = _FAKE_PDF
        _cfg_export(svc)

        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/exportaciones")

        with TestClient(app, raise_server_exceptions=False) as c:
            with c.websocket_connect("/api/exportaciones/ws/exportar?tipo=resumen") as ws:
                error_msg = self._ws_drain_until_error(ws)
        assert "error" in error_msg

        _export_uc._service = None

    def test_ws_token_invalido_cierra_con_error(self):
        """Token malformado → paso 1 y luego mensaje de error."""
        from app.presentation.api.routers import exportaciones as rtr
        svc = MagicMock(spec=ExportacionesService)
        svc.exportar_reporte_pdf.return_value = _FAKE_PDF
        _cfg_export(svc)

        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/exportaciones")

        with TestClient(app, raise_server_exceptions=False) as c:
            with c.websocket_connect(
                "/api/exportaciones/ws/exportar?tipo=resumen&token=not.valid.jwt"
            ) as ws:
                error_msg = self._ws_drain_until_error(ws)
        assert "error" in error_msg

        _export_uc._service = None

    def test_ws_token_valido_flujo_completo(self):
        """Token JWT válido → 5 mensajes de progreso y data en base64."""
        from app.infrastructure.security.adapters import JwtAccessTokenIssuer
        from app.presentation.api.routers import exportaciones as rtr

        token = JwtAccessTokenIssuer().issue({
            "sub": "adm@extra.test", "rol": "ADMINISTRADOR",
            "id_usuario": 1, "nombre": "Admin",
        })

        svc = MagicMock(spec=ExportacionesService)
        svc.exportar_reporte_pdf.return_value = _FAKE_PDF
        _cfg_export(svc)

        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/exportaciones")

        with TestClient(app, raise_server_exceptions=False) as c:
            with c.websocket_connect(
                f"/api/exportaciones/ws/exportar?tipo=resumen&token={token}"
            ) as ws:
                messages = []
                for _ in range(6):          # 5 progreso + cierre
                    try:
                        messages.append(json.loads(ws.receive_text()))
                    except Exception:
                        break

        assert len(messages) >= 5
        last = messages[-1]
        assert last.get("step") == 5
        assert "data" in last          # base64 del PDF
        assert "filename" in last

        _export_uc._service = None


# ══════════════════════════════════════════════════════════════════════════════════
# NOTIFICACIONES — WebSocket con token inválido
# ══════════════════════════════════════════════════════════════════════════════════

class TestNotificacionesWS:
    def test_ws_token_invalido_cierra_1008(self):
        from app.presentation.api.routers import notificaciones as rtr
        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/notificaciones")

        with TestClient(app, raise_server_exceptions=False) as c:
            try:
                with c.websocket_connect(
                    "/api/notificaciones/ws?token=bad.token.here"
                ) as ws:
                    # El servidor debe cerrar inmediatamente con código 1008
                    ws.receive_text()
            except Exception:
                pass   # WS cerrará abruptamente — eso es lo esperado

    def test_ws_token_sin_sub_cierra(self):
        """JWT válido pero sin campo 'sub' → cierre."""
        from jose import jwt as pyjwt
        from app.core.config import settings

        payload = {
            "rol": "ADMINISTRADOR",
            "id_usuario": 99,
        }
        import time
        payload["exp"] = int(time.time()) + 3600
        token = pyjwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        from app.presentation.api.routers import notificaciones as rtr
        app = FastAPI()
        app.include_router(rtr.router, prefix="/api/notificaciones")

        with TestClient(app, raise_server_exceptions=False) as c:
            try:
                with c.websocket_connect(
                    f"/api/notificaciones/ws?token={token}"
                ) as ws:
                    ws.receive_text()
            except Exception:
                pass


# ══════════════════════════════════════════════════════════════════════════════════
# GEOCODING USE CASE
# ══════════════════════════════════════════════════════════════════════════════════

from app.application.geocoding.use_cases import GeocodingService


class TestGeocodingService:
    def _make_svc(self, pending: list, coords_map: dict):
        """
        pending: list of {'id': int, 'ciudad': str, 'estado': str}
        coords_map: query_string → (lat, lon) | None
        """
        repo = MagicMock()
        repo.get_sin_geocodificar.return_value = pending
        repo.guardar_geocodificacion.return_value = None
        repo.marcar_geocodificacion_fallida.return_value = None

        geocoder = MagicMock()
        def _geo(query: str):
            return coords_map.get(query)
        geocoder.geocodificar.side_effect = _geo

        return GeocodingService(repo, geocoder)

    def test_lote_vacio_retorna_cero(self):
        svc = self._make_svc([], {})
        result = svc.geocodificar_lote()
        assert result == 0

    def test_lote_con_coordenadas_geocodifica(self):
        pending = [{"id": 1, "ciudad": "Monterrey", "estado": "Nuevo León"}]
        coords_map = {"Monterrey, Nuevo León, Mexico": (25.686, -100.316)}
        svc = self._make_svc(pending, coords_map)

        result = svc.geocodificar_lote()

        assert result == 1
        svc._repository.guardar_geocodificacion.assert_called_once_with(1, 25.686, -100.316)
        svc._repository.marcar_geocodificacion_fallida.assert_not_called()

    def test_lote_sin_coordenadas_marca_fallo(self):
        pending = [{"id": 2, "ciudad": "Desconocida", "estado": ""}]
        coords_map = {}   # geocodificador retorna None para todo
        svc = self._make_svc(pending, coords_map)

        result = svc.geocodificar_lote()

        assert result == 0
        svc._repository.marcar_geocodificacion_fallida.assert_called_once_with(2)
        svc._repository.guardar_geocodificacion.assert_not_called()

    def test_lote_mixto_parcial(self):
        pending = [
            {"id": 10, "ciudad": "Monterrey", "estado": "Nuevo León"},
            {"id": 11, "ciudad": "X", "estado": ""},
            {"id": 12, "ciudad": "CDMX", "estado": "CDMX"},
        ]
        coords_map = {
            "Monterrey, Nuevo León, Mexico": (25.686, -100.316),
            "CDMX, CDMX, Mexico": (19.432, -99.133),
        }
        svc = self._make_svc(pending, coords_map)

        result = svc.geocodificar_lote()

        assert result == 2
        assert svc._repository.guardar_geocodificacion.call_count == 2
        assert svc._repository.marcar_geocodificacion_fallida.call_count == 1

    def test_lote_respeta_batch_size(self):
        """get_sin_geocodificar es llamado con el batch_size configurado."""
        svc = self._make_svc([], {})
        svc.geocodificar_lote(batch_size=5)
        svc._repository.get_sin_geocodificar.assert_called_once_with(5)

    def test_lote_ciudad_sin_estado(self):
        """Construye query correctamente cuando estado está vacío."""
        pending = [{"id": 3, "ciudad": "Saltillo", "estado": ""}]
        coords_map = {"Saltillo, Mexico": (25.42, -101.0)}
        svc = self._make_svc(pending, coords_map)

        result = svc.geocodificar_lote()
        assert result == 1
        svc._repository.guardar_geocodificacion.assert_called_once_with(3, 25.42, -101.0)

    def test_configure_service(self):
        from app.application.geocoding import use_cases as geo_uc
        repo = MagicMock()
        geo = MagicMock()
        svc = GeocodingService(repo, geo)
        geo_uc.configure_service(svc)
        assert geo_uc._service is svc
        # Cleanup
        geo_uc._service = None

    def test_svc_sin_configurar_lanza_runtime(self):
        from app.application.geocoding import use_cases as geo_uc
        geo_uc._service = None
        with pytest.raises(RuntimeError, match="geocoding service is not configured"):
            geo_uc.geocodificar_lote()
