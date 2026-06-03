"""
Pure unit tests for service classes and domain utilities.

These tests call service methods directly (no HTTP) with mock repositories,
so they run without any Oracle DB connection. They cover lines that HTTP-level
tests cannot reach because those tests mock the entire service class.

Covers:
  - core/session_context.py — get_current_user_id, reset_current_user_id (both branches)
  - application/auth/use_cases.py — fallback user paths, get_me 404, change_password 404,
      admin_reset_password, seed_default_users, _find_fallback_user returns None
  - application/almacen/use_cases.py — all AlmacenService delegating methods,
      ajustar_existencia empty motivo, _svc() RuntimeError
  - application/beneficiarios/use_cases.py — listar_tipos_espina, empty folio validation,
      renovar_membresia, mapa, expirar, module-level _svc() RuntimeError
  - application/recibos/use_cases.py — cancelar empty motivo, registrar_pago validation,
      exentar_venta, listar_items_venta, _svc() RuntimeError
  - application/doctores/use_cases.py — _normalize_doctor (correo + apellido_materno),
      _svc() RuntimeError
  - application/bitacora/use_cases.py — _svc() RuntimeError
  - application/geocoding/use_cases.py — _svc() RuntimeError
  - application/beneficiarios/dtos.py — _normalizar_fecha_iso non-string value, short string
  - infrastructure/auth/fallback_users.py — build_fallback_users
  - infrastructure/security/refresh_store.py — consume missing jti, consume expired jti
"""
from __future__ import annotations

import importlib
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.application.auth.exceptions import ForbiddenError, PasswordTooShortError
from app.domain.auth.exceptions import AuthError, UserNotFoundError
from app.domain.exceptions import ValidationError
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _fake_admin() -> dict:
    return {"correo": "adm@unit.test", "rol": "ADMINISTRADOR", "id_usuario": 1, "nombre": "Admin"}


def _fake_recep() -> dict:
    return {"correo": "rec@unit.test", "rol": "RECEPCIONISTA", "id_usuario": 2, "nombre": "Recep"}


# ══════════════════════════════════════════════════════════════════════════════
# core/session_context.py
# ══════════════════════════════════════════════════════════════════════════════

class TestSessionContext:
    def test_get_current_user_id_returns_none_by_default(self):
        from app.core.session_context import clear_current_user_id, get_current_user_id
        clear_current_user_id()
        assert get_current_user_id() is None

    def test_get_current_user_id_returns_set_value(self):
        from app.core.session_context import (
            clear_current_user_id,
            get_current_user_id,
            set_current_user_id,
        )
        set_current_user_id(42)
        assert get_current_user_id() == 42
        clear_current_user_id()

    def test_reset_current_user_id_happy_path(self):
        """reset_current_user_id restores previous value via token."""
        from app.core.session_context import (
            clear_current_user_id,
            get_current_user_id,
            reset_current_user_id,
            set_current_user_id,
        )
        clear_current_user_id()
        token = set_current_user_id(99)
        reset_current_user_id(token)
        assert get_current_user_id() is None

    def test_reset_current_user_id_bad_token_sets_none(self):
        """reset_current_user_id with a token from a different ContextVar raises ValueError,
        which is caught and sets the value to None."""
        from contextvars import ContextVar
        from app.core.session_context import (
            get_current_user_id,
            reset_current_user_id,
            set_current_user_id,
        )
        set_current_user_id(7)

        # A token from a *different* ContextVar — calling reset() with it on our
        # ContextVar causes a real ValueError (not a mock).
        _other: ContextVar[int | None] = ContextVar("_other_for_test", default=None)
        bad_token = _other.set(99)

        reset_current_user_id(bad_token)

        # After ValueError branch, value is set to None
        assert get_current_user_id() is None


# ══════════════════════════════════════════════════════════════════════════════
# application/auth/use_cases.py — AuthService
# ══════════════════════════════════════════════════════════════════════════════

def _build_auth_service(user_repo=None, fallback_users=None):
    from app.application.auth.use_cases import AuthService

    hasher = SecurityPasswordHasher()
    issuer = JwtAccessTokenIssuer()
    repo = user_repo or MagicMock()
    return AuthService(
        user_repository=repo,
        password_hasher=hasher,
        token_issuer=issuer,
        fallback_users=fallback_users,
    )


class TestAuthServiceFallbackPaths:
    """Cover lines 55-61, 154: login with fallback users."""

    def test_login_fallback_user_found(self):
        """When DB has no users AND there IS a matching fallback user, it authenticates."""
        from app.infrastructure.auth.fallback_users import build_fallback_users

        hasher = SecurityPasswordHasher()
        fallback = build_fallback_users(hasher)

        repo = MagicMock()
        repo.find_by_email.return_value = None  # not in DB
        repo.has_users.return_value = False  # no DB users at all

        svc = _build_auth_service(user_repo=repo, fallback_users=fallback)
        result = svc.login("admin@espinabifida.org", "admin123")
        assert result.access_token

    def test_login_fallback_user_wrong_password(self):
        """Fallback user exists but wrong password → LoginError."""
        from app.application.auth.exceptions import LoginError
        from app.infrastructure.auth.fallback_users import build_fallback_users

        hasher = SecurityPasswordHasher()
        fallback = build_fallback_users(hasher)

        repo = MagicMock()
        repo.find_by_email.return_value = None
        repo.has_users.return_value = False

        svc = _build_auth_service(user_repo=repo, fallback_users=fallback)
        with pytest.raises(LoginError):
            svc.login("admin@espinabifida.org", "wrongpassword")

    def test_login_fallback_user_not_found(self):
        """No DB user and no matching fallback → LoginError."""
        from app.application.auth.exceptions import LoginError

        repo = MagicMock()
        repo.find_by_email.return_value = None
        repo.has_users.return_value = False

        svc = _build_auth_service(user_repo=repo, fallback_users=[])
        with pytest.raises(LoginError):
            svc.login("nobody@example.com", "any")

    def test_find_fallback_returns_none(self):
        """_find_fallback_user returns None when correo not in list."""
        from app.infrastructure.auth.fallback_users import build_fallback_users

        hasher = SecurityPasswordHasher()
        fallback = build_fallback_users(hasher)

        svc = _build_auth_service(fallback_users=fallback)
        result = svc._find_fallback_user("unknown@nowhere.com")
        assert result is None


class TestAuthServiceGetMe:
    def test_get_me_user_not_found_raises(self):
        """When both DB and fallback return None, get_me raises UserNotFoundError."""
        repo = MagicMock()
        repo.find_by_email.return_value = None
        svc = _build_auth_service(user_repo=repo, fallback_users=[])
        with pytest.raises(UserNotFoundError):
            svc.get_me("ghost@test.com")


class TestAuthServiceChangePassword:
    def test_change_password_user_not_found(self):
        """When DB returns None for email, change_password raises UserNotFoundError."""
        repo = MagicMock()
        repo.find_by_email.return_value = None
        svc = _build_auth_service(user_repo=repo)
        with pytest.raises(UserNotFoundError):
            svc.change_password({"correo": "ghost@test.com"}, "old", "new_password_long")


class TestAuthServiceAdminResetPassword:
    def test_admin_reset_forbidden_for_non_admin(self):
        """Non-admin current_user raises ForbiddenError."""
        svc = _build_auth_service()
        with pytest.raises(ForbiddenError):
            svc.admin_reset_password(_fake_recep(), 1, "newpass123")

    def test_admin_reset_short_password_raises(self):
        """Short password raises PasswordTooShortError."""
        svc = _build_auth_service()
        with pytest.raises(PasswordTooShortError):
            svc.admin_reset_password(_fake_admin(), 1, "short")

    def test_admin_reset_user_not_found(self):
        """find_by_id returns None → UserNotFoundError."""
        repo = MagicMock()
        repo.find_by_id.return_value = None
        svc = _build_auth_service(user_repo=repo)
        with pytest.raises(UserNotFoundError):
            svc.admin_reset_password(_fake_admin(), 999, "longpassword1")

    def test_admin_reset_success(self):
        """Successful admin reset calls update_password."""
        from app.domain.auth.entities import User

        repo = MagicMock()
        repo.find_by_id.return_value = User(
            id_usuario=5,
            nombre="Test",
            apellido_paterno="U",
            apellido_materno=None,
            correo="u@test.com",
            hashed_password="hashed",
            rol="RECEPCIONISTA",
            estatus="ACTIVO",
        )
        svc = _build_auth_service(user_repo=repo)
        svc.admin_reset_password(_fake_admin(), 5, "validpassword")
        repo.update_password.assert_called_once()


class TestAuthServiceSeedDefaultUsers:
    def test_seed_forbidden_for_non_admin(self):
        svc = _build_auth_service()
        with pytest.raises(ForbiddenError):
            svc.seed_default_users(_fake_recep())

    def test_seed_returns_already_exist_message(self):
        """When seed_users returns empty list, seed already done."""
        repo = MagicMock()
        repo.seed_users.return_value = []
        svc = _build_auth_service(user_repo=repo)
        result = svc.seed_default_users(_fake_admin())
        assert "ya existen" in result["message"]

    def test_seed_returns_inserted_message(self):
        """When seed_users returns correos, report them."""
        repo = MagicMock()
        repo.seed_users.return_value = ["admin@espinabifida.org", "operativo@espinabifida.org"]
        svc = _build_auth_service(user_repo=repo)
        result = svc.seed_default_users(_fake_admin())
        assert "admin@espinabifida.org" in result["message"]


# ══════════════════════════════════════════════════════════════════════════════
# application/almacen/use_cases.py — AlmacenService class methods
# ══════════════════════════════════════════════════════════════════════════════

class TestAlmacenServiceMethods:
    """Each method simply delegates to the repository; we cover the delegation."""

    @pytest.fixture(autouse=True)
    def service(self):
        from app.application.almacen.use_cases import AlmacenService
        self._repo = MagicMock()
        self._svc = AlmacenService(self._repo)

    def test_actualizar_producto_delegates(self):
        from app.application.almacen.dtos import ProductoCreate
        data = ProductoCreate(
            clave_interna="CL001",
            nombre="Producto Uno",
            tipo_producto="MEDICAMENTO",
        )
        self._repo.actualizar_producto.return_value = {"id_producto": 1}
        result = self._svc.actualizar_producto(1, data)
        self._repo.actualizar_producto.assert_called_once()
        assert result == {"id_producto": 1}

    def test_listar_servicios_delegates(self):
        self._repo.listar_servicios.return_value = []
        result = self._svc.listar_servicios()
        self._repo.listar_servicios.assert_called_once()
        assert result == []

    def test_actualizar_servicio_delegates(self):
        from app.application.almacen.dtos import ServicioCreate
        data = ServicioCreate(nombre="Servicio X", categoria="SERVICIO")
        self._repo.actualizar_servicio.return_value = {"id_servicio": 2}
        result = self._svc.actualizar_servicio(2, data)
        self._repo.actualizar_servicio.assert_called_once()
        assert result == {"id_servicio": 2}

    def test_desactivar_servicio_delegates(self):
        self._repo.desactivar_servicio.return_value = {"detail": "ok"}
        result = self._svc.desactivar_servicio(3)
        self._repo.desactivar_servicio.assert_called_once()
        assert result == {"detail": "ok"}

    def test_listar_comodatos_delegates(self):
        self._repo.listar_comodatos.return_value = [{"id": 1}]
        result = self._svc.listar_comodatos()
        self._repo.listar_comodatos.assert_called_once()
        assert result == [{"id": 1}]

    def test_obtener_comodato_delegates(self):
        self._repo.obtener_comodato.return_value = {"id_comodato": 10}
        result = self._svc.obtener_comodato(10)
        self._repo.obtener_comodato.assert_called_once()
        assert result == {"id_comodato": 10}

    def test_crear_comodato_delegates(self):
        from app.application.almacen.dtos import ComodatoCreate
        data = ComodatoCreate(
            id_equipo=2,
            id_paciente=1,
            fecha_prestamo="2026-01-01",
        )
        self._repo.crear_comodato.return_value = {"id_comodato": 20}
        result = self._svc.crear_comodato(data)
        self._repo.crear_comodato.assert_called_once()
        assert result == {"id_comodato": 20}

    def test_actualizar_comodato_delegates(self):
        from app.application.almacen.dtos import ComodatoCreate
        data = ComodatoCreate(
            id_equipo=2,
            id_paciente=1,
            fecha_prestamo="2026-01-01",
        )
        self._repo.actualizar_comodato.return_value = {"id_comodato": 20}
        result = self._svc.actualizar_comodato(20, data)
        self._repo.actualizar_comodato.assert_called_once()
        assert result == {"id_comodato": 20}

    def test_listar_movimientos_delegates(self):
        self._repo.listar_movimientos.return_value = []
        result = self._svc.listar_movimientos()
        self._repo.listar_movimientos.assert_called_once()
        assert result == []

    def test_ajustar_existencia_empty_motivo_raises(self):
        with pytest.raises(ValidationError, match="motivo"):
            self._svc.ajustar_existencia(1, 10, "   ")

    def test_ajustar_existencia_none_motivo_raises(self):
        with pytest.raises(ValidationError, match="motivo"):
            self._svc.ajustar_existencia(1, 10, "")


class TestAlmacenSvcRuntimeError:
    def test_svc_raises_when_not_configured(self):
        """Module-level _svc() raises RuntimeError before configure_service is called."""
        import app.application.almacen.use_cases as uc
        original = uc._service
        uc._service = None
        try:
            with pytest.raises(RuntimeError, match="almacen service is not configured"):
                uc._svc()
        finally:
            uc._service = original


# ══════════════════════════════════════════════════════════════════════════════
# application/beneficiarios/use_cases.py — BeneficiariosService
# ══════════════════════════════════════════════════════════════════════════════

class TestBeneficiariosServiceMethods:
    @pytest.fixture(autouse=True)
    def service(self):
        from app.application.beneficiarios.use_cases import BeneficiariosService
        self._repo = MagicMock()
        self._svc = BeneficiariosService(self._repo)

    def test_listar_tipos_espina_delegates(self):
        self._repo.listar_tipos_espina.return_value = [{"id": 1}]
        result = self._svc.listar_tipos_espina()
        self._repo.listar_tipos_espina.assert_called_once()
        assert result == [{"id": 1}]

    def test_obtener_beneficiario_empty_folio_raises(self):
        with pytest.raises(ValidationError, match="folio"):
            self._svc.obtener_beneficiario("")

    def test_obtener_beneficiario_whitespace_folio_raises(self):
        with pytest.raises(ValidationError, match="folio"):
            self._svc.obtener_beneficiario("   ")

    def test_actualizar_beneficiario_empty_folio_raises(self):
        from app.application.beneficiarios.dtos import BeneficiarioCreate
        data = BeneficiarioCreate(
            nombre="X",
            apellido_paterno="Y",
            curp="XYZW010101HDFABC01",
        )
        with pytest.raises(ValidationError, match="folio"):
            self._svc.actualizar_beneficiario("", data)

    def test_renovar_membresia_delegates(self):
        from app.application.beneficiarios.dtos import RenovarMembresiaCreate
        self._repo.renovar_membresia.return_value = {"result": "ok"}
        data = RenovarMembresiaCreate(monto_total=500.0)
        result = self._svc.renovar_membresia("BEN-000001", data)
        self._repo.renovar_membresia.assert_called_once()
        assert result == {"result": "ok"}

    def test_mapa_beneficiarios_delegates(self):
        self._repo.mapa_beneficiarios.return_value = [{"lat": 25.0}]
        result = self._svc.mapa_beneficiarios()
        self._repo.mapa_beneficiarios.assert_called_once()
        assert result == [{"lat": 25.0}]

    def test_expirar_membresias_vencidas_delegates(self):
        self._repo.expirar_membresias_vencidas.return_value = 3
        result = self._svc.expirar_membresias_vencidas()
        self._repo.expirar_membresias_vencidas.assert_called_once()
        assert result == 3


class TestBeneficiariosSvcModuleLevelFunctions:
    """Cover module-level wrapper functions by configuring the service."""

    @pytest.fixture(autouse=True)
    def _setup(self):
        import app.application.beneficiarios.use_cases as uc
        from app.application.beneficiarios.use_cases import BeneficiariosService
        self._repo = MagicMock()
        svc = BeneficiariosService(self._repo)
        uc.configure_service(svc)
        yield
        # Cleanup
        uc._service = None

    def test_module_listar_tipos_espina(self):
        import app.application.beneficiarios.use_cases as uc
        self._repo.listar_tipos_espina.return_value = [{"id": 2}]
        result = uc.listar_tipos_espina()
        assert result == [{"id": 2}]

    def test_module_renovar_membresia(self):
        import app.application.beneficiarios.use_cases as uc
        from app.application.beneficiarios.dtos import RenovarMembresiaCreate
        self._repo.renovar_membresia.return_value = {"result": "renewed"}
        data = RenovarMembresiaCreate(monto_total=300.0)
        result = uc.renovar_membresia("BEN-000001", data)
        assert result == {"result": "renewed"}

    def test_module_expirar_membresias_vencidas(self):
        import app.application.beneficiarios.use_cases as uc
        self._repo.expirar_membresias_vencidas.return_value = 0
        result = uc.expirar_membresias_vencidas()
        assert result == 0

    def test_module_mapa_beneficiarios(self):
        import app.application.beneficiarios.use_cases as uc
        self._repo.mapa_beneficiarios.return_value = []
        result = uc.mapa_beneficiarios()
        assert result == []


class TestBeneficiariosSvcRuntimeError:
    def test_svc_raises_when_not_configured(self):
        import app.application.beneficiarios.use_cases as uc
        original = uc._service
        uc._service = None
        try:
            with pytest.raises(RuntimeError, match="beneficiarios service is not configured"):
                uc._svc()
        finally:
            uc._service = original


# ══════════════════════════════════════════════════════════════════════════════
# application/recibos/use_cases.py — RecibosService
# ══════════════════════════════════════════════════════════════════════════════

class TestRecibosServiceValidation:
    @pytest.fixture(autouse=True)
    def service(self):
        from app.application.recibos.use_cases import RecibosService
        self._repo = MagicMock()
        self._svc = RecibosService(self._repo)

    def test_cancelar_venta_empty_motivo_raises(self):
        with pytest.raises(ValidationError, match="motivo"):
            self._svc.cancelar_venta(1, "")

    def test_cancelar_venta_none_motivo_raises(self):
        with pytest.raises(ValidationError, match="motivo"):
            self._svc.cancelar_venta(1, None)

    def test_cancelar_venta_whitespace_motivo_raises(self):
        with pytest.raises(ValidationError, match="motivo"):
            self._svc.cancelar_venta(1, "   ")

    def test_registrar_pago_monto_cero_raises(self):
        with pytest.raises(ValidationError, match="monto"):
            self._svc.registrar_pago(1, 1, 0.0)

    def test_registrar_pago_monto_negativo_raises(self):
        with pytest.raises(ValidationError, match="monto"):
            self._svc.registrar_pago(1, 1, -50.0)

    def test_registrar_pago_id_metodo_cero_raises(self):
        with pytest.raises(ValidationError, match="método de pago"):
            self._svc.registrar_pago(1, 0, 100.0)

    def test_exentar_venta_delegates(self):
        self._repo.exentar_venta.return_value = {"exento": True}
        result = self._svc.exentar_venta(1, "Exención médica")
        self._repo.exentar_venta.assert_called_once_with(1, "Exención médica", None)
        assert result == {"exento": True}

    def test_exentar_venta_none_nota(self):
        self._repo.exentar_venta.return_value = {"exento": True}
        result = self._svc.exentar_venta(1, None)
        self._repo.exentar_venta.assert_called_once_with(1, None, None)
        assert result == {"exento": True}

    def test_listar_items_venta_delegates(self):
        self._repo.listar_items_venta.return_value = [{"id_item": 1}]
        result = self._svc.listar_items_venta(1)
        self._repo.listar_items_venta.assert_called_once()
        assert result == [{"id_item": 1}]


class TestRecibosSvcRuntimeError:
    def test_svc_raises_when_not_configured(self):
        import app.application.recibos.use_cases as uc
        original = uc._service
        uc._service = None
        try:
            with pytest.raises(RuntimeError, match="recibos service is not configured"):
                uc._svc()
        finally:
            uc._service = original


# ══════════════════════════════════════════════════════════════════════════════
# application/doctores/use_cases.py — DoctoresService._normalize_doctor
# ══════════════════════════════════════════════════════════════════════════════

class TestDoctoresServiceNormalize:
    def test_normalize_doctor_with_correo(self):
        """When correo is set, _normalize_doctor strips and lowercases it."""
        from app.application.doctores.dtos import DoctorCreate
        from app.application.doctores.use_cases import DoctoresService

        repo = MagicMock()
        svc = DoctoresService(repo)
        data = DoctorCreate(
            nombre="  Dr. Test  ",
            apellido_paterno="Pérez",
            apellido_materno="García",
            correo="  DOC@EXAMPLE.COM  ",
            cedula_profesional="123456",
        )
        normalized = DoctoresService._normalize_doctor(data)
        assert normalized.correo == "doc@example.com"
        assert normalized.nombre == "Dr. Test"
        assert normalized.apellido_materno == "García"

    def test_normalize_doctor_without_correo(self):
        """When correo is None or empty, no correo key in updates."""
        from app.application.doctores.dtos import DoctorCreate
        from app.application.doctores.use_cases import DoctoresService

        data = DoctorCreate(
            nombre="Dr. Sin Correo",
            apellido_paterno="López",
        )
        normalized = DoctoresService._normalize_doctor(data)
        assert normalized.correo is None

    def test_normalize_doctor_with_apellido_materno(self):
        """Apellido materno is stripped when present."""
        from app.application.doctores.dtos import DoctorCreate
        from app.application.doctores.use_cases import DoctoresService

        data = DoctorCreate(
            nombre="Dr. Nombre",
            apellido_paterno="AP",
            apellido_materno="  AM  ",
        )
        normalized = DoctoresService._normalize_doctor(data)
        assert normalized.apellido_materno == "AM"


class TestDoctoresSvcRuntimeError:
    def test_svc_raises_when_not_configured(self):
        import app.application.doctores.use_cases as uc
        original = uc._service
        uc._service = None
        try:
            with pytest.raises(RuntimeError, match="doctores service is not configured"):
                uc._svc()
        finally:
            uc._service = original


# ══════════════════════════════════════════════════════════════════════════════
# application/bitacora/use_cases.py — _svc() RuntimeError
# ══════════════════════════════════════════════════════════════════════════════

class TestBitacoraSvcRuntimeError:
    def test_svc_raises_when_not_configured(self):
        import app.application.bitacora.use_cases as uc
        original = uc._service
        uc._service = None
        try:
            with pytest.raises(RuntimeError, match="bitacora service is not configured"):
                uc._svc()
        finally:
            uc._service = original


# ══════════════════════════════════════════════════════════════════════════════
# application/geocoding/use_cases.py — _svc() RuntimeError
# ══════════════════════════════════════════════════════════════════════════════

class TestGeocodingSvcRuntimeError:
    def test_svc_raises_when_not_configured(self):
        import app.application.geocoding.use_cases as uc
        original = uc._service
        uc._service = None
        try:
            with pytest.raises(RuntimeError, match="geocoding service is not configured"):
                uc._svc()
        finally:
            uc._service = original


# ══════════════════════════════════════════════════════════════════════════════
# application/beneficiarios/dtos.py — _normalizar_fecha_iso edge cases
# ══════════════════════════════════════════════════════════════════════════════

class TestBeneficiariosDtosDateValidator:
    def test_non_string_value_passthrough(self):
        """_normalizar_fecha_iso returns non-string values as-is (line 23)."""
        from app.application.beneficiarios.dtos import _normalizar_fecha_iso

        # Passing a date object (non-string) — should return it unchanged
        from datetime import date

        d = date(2020, 5, 15)
        result = _normalizar_fecha_iso(d, "fecha_nacimiento")
        assert result == d

    def test_string_too_short_raises(self):
        """String shorter than 10 chars raises ValueError (line 26)."""
        from app.application.beneficiarios.dtos import _normalizar_fecha_iso

        with pytest.raises(ValueError, match="YYYY-MM-DD"):
            _normalizar_fecha_iso("2020-01", "fecha_nacimiento")

    def test_none_value_returns_none(self):
        from app.application.beneficiarios.dtos import _normalizar_fecha_iso

        assert _normalizar_fecha_iso(None, "fecha_nacimiento") is None

    def test_valid_datetime_string_truncated(self):
        """Full ISO datetime string is truncated to YYYY-MM-DD."""
        from app.application.beneficiarios.dtos import _normalizar_fecha_iso

        result = _normalizar_fecha_iso("2020-05-15T10:00:00", "fecha_nacimiento")
        assert result == "2020-05-15"


# ══════════════════════════════════════════════════════════════════════════════
# infrastructure/auth/fallback_users.py — build_fallback_users
# ══════════════════════════════════════════════════════════════════════════════

class TestBuildFallbackUsers:
    def test_returns_two_users(self):
        from app.infrastructure.auth.fallback_users import build_fallback_users

        hasher = SecurityPasswordHasher()
        users = build_fallback_users(hasher)
        assert len(users) == 2

    def test_admin_user_exists(self):
        from app.infrastructure.auth.fallback_users import build_fallback_users

        hasher = SecurityPasswordHasher()
        users = build_fallback_users(hasher)
        admin = next((u for u in users if u.rol == "ADMINISTRADOR"), None)
        assert admin is not None
        assert hasher.verify("admin123", admin.hashed_password)

    def test_recepcionista_user_exists(self):
        from app.infrastructure.auth.fallback_users import build_fallback_users

        hasher = SecurityPasswordHasher()
        users = build_fallback_users(hasher)
        recep = next((u for u in users if u.rol == "RECEPCIONISTA"), None)
        assert recep is not None
        assert hasher.verify("op123", recep.hashed_password)


# ══════════════════════════════════════════════════════════════════════════════
# infrastructure/security/refresh_store.py — consume edge cases
# ══════════════════════════════════════════════════════════════════════════════

class TestRefreshTokenStore:
    def test_consume_missing_jti_returns_false(self):
        """consume() returns False if JTI was never added (lines 28-32)."""
        from app.infrastructure.security.refresh_store import RefreshTokenStore

        store = RefreshTokenStore()
        result = store.consume("nonexistent-jti")
        assert result is False

    def test_consume_expired_jti_returns_false(self):
        """consume() returns False if JTI is present but already expired."""
        from app.infrastructure.security.refresh_store import RefreshTokenStore

        store = RefreshTokenStore()
        past = datetime.now(timezone.utc) - timedelta(days=1)
        store._tokens["expired-jti"] = past
        result = store.consume("expired-jti")
        assert result is False

    def test_consume_valid_jti_returns_true_and_removes(self):
        """consume() returns True for a valid non-expired JTI and removes it."""
        from app.infrastructure.security.refresh_store import RefreshTokenStore

        store = RefreshTokenStore()
        future = datetime.now(timezone.utc) + timedelta(days=1)
        store._tokens["valid-jti"] = future
        result = store.consume("valid-jti")
        assert result is True
        assert "valid-jti" not in store._tokens

    def test_add_and_evict_expired(self):
        """add() evicts expired tokens."""
        from app.infrastructure.security.refresh_store import RefreshTokenStore

        store = RefreshTokenStore()
        past = datetime.now(timezone.utc) - timedelta(seconds=1)
        store._tokens["old-jti"] = past
        future = datetime.now(timezone.utc) + timedelta(days=1)
        store.add("new-jti", future)
        assert "old-jti" not in store._tokens
        assert "new-jti" in store._tokens


# ══════════════════════════════════════════════════════════════════════════════
# application/geocoding/use_cases.py — module-level _svc() return path
# ══════════════════════════════════════════════════════════════════════════════

class TestGeocodingSvcReturnPath:
    def test_module_geocodificar_lote_with_no_pending(self):
        """Module-level geocodificar_lote covers the return path of _svc()."""
        import app.application.geocoding.use_cases as uc
        from app.application.geocoding.use_cases import GeocodingService

        repo = MagicMock()
        repo.get_sin_geocodificar.return_value = []  # no pending → returns 0
        geocoder = MagicMock()
        svc = GeocodingService(repository=repo, geocoder=geocoder)
        uc.configure_service(svc)
        try:
            result = uc.geocodificar_lote(10)
            assert result == 0
        finally:
            uc._service = None


# ══════════════════════════════════════════════════════════════════════════════
# application/recibos/use_cases.py — happy path of registrar_pago
# ══════════════════════════════════════════════════════════════════════════════

class TestRecibosRegistrarPagoHappyPath:
    def test_registrar_pago_valid_args_delegates(self):
        """With valid monto and id_metodo_pago, delegates to the repository."""
        from app.application.recibos.use_cases import RecibosService

        repo = MagicMock()
        repo.registrar_pago.return_value = {"id_venta": 1, "saldo_pendiente": 0.0}
        svc = RecibosService(repo)
        result = svc.registrar_pago(1, 1, 100.0)
        repo.registrar_pago.assert_called_once_with(1, 1, 100.0, None)
        assert result == {"id_venta": 1, "saldo_pendiente": 0.0}


# ══════════════════════════════════════════════════════════════════════════════
# routers/busqueda.py — _score_field edge cases
# ══════════════════════════════════════════════════════════════════════════════

class TestBusquedaScoreField:
    """Cover _score_field lines 23 (empty value) and 35 (token prefix match)."""

    def test_score_field_empty_value_returns_0(self):
        """When value is None or empty, _score_field returns 0."""
        from app.presentation.api.routers.busqueda import _score_field
        assert _score_field("query", None, 10) == 0
        assert _score_field("query", "", 10) == 0

    def test_score_field_exact_match(self):
        """Exact match returns weight * 4."""
        from app.presentation.api.routers.busqueda import _score_field
        assert _score_field("juan", "juan", 10) == 40

    def test_score_field_prefix_match(self):
        """Value starts with query returns weight * 2."""
        from app.presentation.api.routers.busqueda import _score_field
        assert _score_field("jua", "juan", 10) == 20

    def test_score_field_contains_match(self):
        """Query appears inside value returns weight."""
        from app.presentation.api.routers.busqueda import _score_field
        assert _score_field("uan", "juan", 10) == 10

    def test_score_field_token_prefix_match(self):
        """All query tokens appear as prefix of value tokens (line 35)."""
        from app.presentation.api.routers.busqueda import _score_field
        # "jua per" → query tokens: ["jua", "per"]
        # value "juan perez" → tokens: ["juan", "perez"]
        # "jua" is prefix of "juan" ✓, "per" is prefix of "perez" ✓
        result = _score_field("jua per", "juan perez", 10)
        assert result == 10  # token prefix match

    def test_score_field_no_match_returns_0(self):
        """No matching condition → returns 0."""
        from app.presentation.api.routers.busqueda import _score_field
        assert _score_field("xyz", "juan", 10) == 0


# ══════════════════════════════════════════════════════════════════════════════
# routers/metricas.py — _edad_anios exception branch and _percentile
# ══════════════════════════════════════════════════════════════════════════════

class TestMetricasHelpers:
    def test_edad_anios_invalid_date_returns_none(self):
        """Invalid date string hits except Exception → returns None."""
        from app.presentation.api.routers.metricas import _edad_anios
        result = _edad_anios("not-a-date-!!!")
        assert result is None

    def test_edad_anios_none_returns_none(self):
        from app.presentation.api.routers.metricas import _edad_anios
        assert _edad_anios(None) is None

    def test_edad_anios_valid_date(self):
        from app.presentation.api.routers.metricas import _edad_anios
        result = _edad_anios("2000-01-01")
        assert result is not None
        assert isinstance(result, int)

    def test_percentile_returns_value(self):
        """_percentile with non-empty list returns a float."""
        from app.presentation.api.routers.metricas import _percentile
        result = _percentile([1.0, 2.0, 3.0, 4.0, 5.0], 50)
        assert isinstance(result, float)

    def test_percentile_empty_returns_none(self):
        from app.presentation.api.routers.metricas import _percentile
        assert _percentile([], 50) is None
