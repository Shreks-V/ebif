"""Pruebas de cobertura para módulos Doctores y Bitácora."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Optional

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.application.auth.use_cases import AuthService
from app.application.bitacora.use_cases import BitacoraService
from app.application.bitacora.use_cases import configure_service as configure_bitacora
from app.application.doctores.use_cases import DoctoresService
from app.application.doctores.use_cases import configure_service as configure_doctores
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher
from app.presentation.api.dependencies import get_auth_service
from app.presentation.api.routers import auth as auth_router
from app.presentation.api.routers import bitacora as bitacora_router
from app.presentation.api.routers import doctores as doctores_router

from Pruebas.support_auth import InMemoryUserRepository, build_user

_ADMIN_CORREO = "admin-doc@test.local"
_ADMIN_PASS = "admin123"


# ── In-memory stubs ──────────────────────────────────────────────────────────

class InMemoryDoctoresRepository:
    def __init__(self) -> None:
        self._doctores: dict[int, dict] = {
            1: {
                "id_doctor": 1,
                "nombre": "Carlos",
                "apellido_paterno": "López",
                "apellido_materno": None,
                "especialidad": "Neurología",
                "telefono": "5551234567",
                "correo": "carlos@test.local",
                "activo": "S",
                "fecha_registro": "2025-01-01",
                "servicios": [],
            }
        }
        self._disponibilidades: dict[int, list[dict]] = {
            1: [{"id_disponibilidad": 1, "id_doctor": 1, "dia_semana": 1, "hora_inicio": "09:00", "hora_fin": "13:00", "disponible": "S"}]
        }
        self._disp_especial: dict[int, list[dict]] = {1: []}
        self._next_doc_id = 2
        self._next_disp_id = 2
        self._next_disp_esp_id = 1

    def doctor_del_dia(self, current_user=None) -> dict:
        return self._doctores[1]

    def listar_doctores(self, current_user=None, limit: int = 100, offset: int = 0) -> list:
        return list(self._doctores.values())[offset:offset + limit]

    def obtener_disponibilidad_semana(self, current_user=None, limit: int = 500, offset: int = 0) -> list:
        rows = [d for disps in self._disponibilidades.values() for d in disps]
        return rows[offset:offset + limit]

    def obtener_doctor(self, id_doctor: int, current_user=None) -> dict:
        return self._doctores[id_doctor]

    def crear_doctor(self, data: Any, current_user=None) -> dict:
        nid = self._next_doc_id
        self._next_doc_id += 1
        doc = {
            "id_doctor": nid,
            "nombre": data.nombre,
            "apellido_paterno": data.apellido_paterno,
            "apellido_materno": data.apellido_materno,
            "especialidad": data.especialidad,
            "telefono": data.telefono,
            "correo": data.correo,
            "activo": data.activo,
            "fecha_registro": "2025-01-01",
            "servicios": [],
        }
        self._doctores[nid] = doc
        self._disponibilidades[nid] = []
        self._disp_especial[nid] = []
        return doc

    def actualizar_doctor(self, id_doctor: int, data: Any, current_user=None) -> dict:
        doc = deepcopy(self._doctores[id_doctor])
        doc.update({k: getattr(data, k) for k in ("nombre", "apellido_paterno", "apellido_materno", "especialidad", "telefono", "correo", "activo")})
        self._doctores[id_doctor] = doc
        return doc

    def desactivar_doctor(self, id_doctor: int, current_user=None) -> dict:
        if id_doctor in self._doctores:
            self._doctores[id_doctor]["activo"] = "N"
        return self._doctores.get(id_doctor, {})

    def obtener_disponibilidad(self, id_doctor: int, current_user=None, limit: int = 500, offset: int = 0) -> list:
        return self._disponibilidades.get(id_doctor, [])

    def crear_disponibilidad(self, id_doctor: int, data: Any, current_user=None) -> dict:
        disp = {
            "id_disponibilidad": self._next_disp_id,
            "id_doctor": id_doctor,
            "dia_semana": data.dia_semana,
            "hora_inicio": data.hora_inicio,
            "hora_fin": data.hora_fin,
            "disponible": "S",
        }
        self._next_disp_id += 1
        self._disponibilidades.setdefault(id_doctor, []).append(disp)
        return disp

    def eliminar_disponibilidad(self, id_doctor: int, id_disponibilidad: int, current_user=None) -> dict:
        disps = self._disponibilidades.get(id_doctor, [])
        self._disponibilidades[id_doctor] = [d for d in disps if d["id_disponibilidad"] != id_disponibilidad]
        return {"ok": True}

    def obtener_servicios_doctor(self, id_doctor: int, current_user=None) -> list:
        return self._doctores.get(id_doctor, {}).get("servicios", [])

    def listar_disponibilidad_especial(self, id_doctor: int, current_user=None) -> list:
        return self._disp_especial.get(id_doctor, [])

    def crear_disponibilidad_especial(self, id_doctor: int, data: Any, current_user=None) -> dict:
        disp = {
            "id_disp_especial": self._next_disp_esp_id,
            "id_doctor": id_doctor,
            "fecha_inicio": data.fecha_inicio,
            "hora_inicio": data.hora_inicio,
            "hora_fin": data.hora_fin,
            "tipo_recurrencia": data.tipo_recurrencia,
            "descripcion": data.descripcion,
            "activo": "S",
        }
        self._next_disp_esp_id += 1
        self._disp_especial.setdefault(id_doctor, []).append(disp)
        return disp

    def eliminar_disponibilidad_especial(self, id_doctor: int, id_disp_especial: int, current_user=None) -> dict:
        disps = self._disp_especial.get(id_doctor, [])
        self._disp_especial[id_doctor] = [d for d in disps if d["id_disp_especial"] != id_disp_especial]
        return {"ok": True}


class InMemoryBitacoraRepository:
    def __init__(self) -> None:
        self._items = [
            {"id": 1, "tabla": "PACIENTE", "tipo_operacion": "INSERT", "fecha": "2025-01-01", "usuario": "admin"},
            {"id": 2, "tabla": "VENTA", "tipo_operacion": "UPDATE", "fecha": "2025-02-01", "usuario": "recep"},
        ]

    def listar_bitacora(self, tabla=None, tipo_operacion=None, fecha_inicio=None, fecha_fin=None, busqueda=None, limit=100, offset=0) -> list:
        rows = self._items[:]
        if tabla:
            rows = [r for r in rows if r.get("tabla") == tabla]
        return rows[offset:offset + limit]

    def contar_bitacora(self, tabla=None, tipo_operacion=None, fecha_inicio=None, fecha_fin=None, busqueda=None) -> int:
        rows = self._items[:]
        if tabla:
            rows = [r for r in rows if r.get("tabla") == tabla]
        return len(rows)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_user_repo(hasher: SecurityPasswordHasher) -> InMemoryUserRepository:
    admin = build_user(
        correo=_ADMIN_CORREO,
        password_plain=_ADMIN_PASS,
        password_hasher=hasher,
        id_usuario=1,
        nombre="Admin",
        rol="ADMINISTRADOR",
        estatus="ACTIVO",
    )
    return InMemoryUserRepository({admin.correo.lower(): admin}, has_users=True)


def _jwt_admin() -> dict[str, str]:
    token = JwtAccessTokenIssuer().issue(
        {"sub": _ADMIN_CORREO, "rol": "ADMINISTRADOR", "nombre": "Admin", "id_usuario": 1}
    )
    return {"Authorization": f"Bearer {token}"}


def _make_app(router, prefix: str, repo, service_class, configure_fn, hasher) -> FastAPI:
    configure_fn(service_class(repo))
    auth_svc = AuthService(
        user_repository=_make_user_repo(hasher),
        password_hasher=hasher,
        token_issuer=JwtAccessTokenIssuer(),
        fallback_users=[],
    )
    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router.router, prefix="/api/auth")
    app.include_router(router, prefix=prefix)
    app.dependency_overrides[get_auth_service] = lambda: auth_svc
    return app


@pytest.fixture
def doctores_client() -> TestClient:
    hasher = SecurityPasswordHasher()
    app = _make_app(
        doctores_router.router, "/api/doctores",
        InMemoryDoctoresRepository(), DoctoresService, configure_doctores, hasher,
    )
    return TestClient(app)


@pytest.fixture
def bitacora_client() -> TestClient:
    hasher = SecurityPasswordHasher()
    app = _make_app(
        bitacora_router.router, "/api/bitacora",
        InMemoryBitacoraRepository(), BitacoraService, configure_bitacora, hasher,
    )
    return TestClient(app)


# ── Tests doctores ────────────────────────────────────────────────────────────

def test_listar_doctores(doctores_client: TestClient):
    r = doctores_client.get("/api/doctores", headers=_jwt_admin())
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 1
    assert data[0]["nombre"] == "Carlos"


def test_doctor_del_dia(doctores_client: TestClient):
    r = doctores_client.get("/api/doctores/hoy", headers=_jwt_admin())
    assert r.status_code == 200
    assert r.json()["id_doctor"] == 1


def test_obtener_doctor(doctores_client: TestClient):
    r = doctores_client.get("/api/doctores/1", headers=_jwt_admin())
    assert r.status_code == 200
    assert r.json()["especialidad"] == "Neurología"


def test_crear_doctor(doctores_client: TestClient):
    r = doctores_client.post(
        "/api/doctores",
        json={"nombre": "Ana", "apellido_paterno": "García", "especialidad": "Pediatría", "activo": "S"},
        headers=_jwt_admin(),
    )
    assert r.status_code == 201
    assert r.json()["nombre"] == "Ana"


def test_actualizar_doctor(doctores_client: TestClient):
    r = doctores_client.put(
        "/api/doctores/1",
        json={"nombre": "Carlos", "apellido_paterno": "López", "especialidad": "Neurología Pediátrica", "activo": "S"},
        headers=_jwt_admin(),
    )
    assert r.status_code == 200
    assert r.json()["especialidad"] == "Neurología Pediátrica"


def test_desactivar_doctor(doctores_client: TestClient):
    r = doctores_client.delete("/api/doctores/1", headers=_jwt_admin())
    assert r.status_code == 200


def test_disponibilidad_semana(doctores_client: TestClient):
    r = doctores_client.get("/api/doctores/disponibilidad/semana", headers=_jwt_admin())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_obtener_disponibilidad_doctor(doctores_client: TestClient):
    r = doctores_client.get("/api/doctores/1/disponibilidad", headers=_jwt_admin())
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1 and data[0]["dia_semana"] == 1


def test_crear_disponibilidad(doctores_client: TestClient):
    r = doctores_client.post(
        "/api/doctores/1/disponibilidad",
        json={"dia_semana": 3, "hora_inicio": "10:00", "hora_fin": "14:00"},
        headers=_jwt_admin(),
    )
    assert r.status_code == 201
    assert r.json()["dia_semana"] == 3


def test_eliminar_disponibilidad(doctores_client: TestClient):
    r = doctores_client.delete("/api/doctores/1/disponibilidad/1", headers=_jwt_admin())
    assert r.status_code == 200


def test_obtener_servicios_doctor(doctores_client: TestClient):
    r = doctores_client.get("/api/doctores/1/servicios", headers=_jwt_admin())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_listar_disponibilidad_especial(doctores_client: TestClient):
    r = doctores_client.get("/api/doctores/1/disponibilidad-especial", headers=_jwt_admin())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_crear_y_eliminar_disponibilidad_especial(doctores_client: TestClient):
    h = _jwt_admin()
    cre = doctores_client.post(
        "/api/doctores/1/disponibilidad-especial",
        json={"fecha_inicio": "2025-06-01", "hora_inicio": "08:00", "hora_fin": "12:00", "tipo_recurrencia": "UNICA"},
        headers=h,
    )
    assert cre.status_code == 201
    id_disp = cre.json()["id_disp_especial"]
    r = doctores_client.delete(f"/api/doctores/1/disponibilidad-especial/{id_disp}", headers=h)
    assert r.status_code == 200


# ── Tests bitácora ────────────────────────────────────────────────────────────

def test_listar_bitacora(bitacora_client: TestClient):
    r = bitacora_client.get("/api/bitacora", headers=_jwt_admin())
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_listar_bitacora_filtro_tabla(bitacora_client: TestClient):
    r = bitacora_client.get("/api/bitacora", headers=_jwt_admin(), params={"tabla": "PACIENTE"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["tabla"] == "PACIENTE"


def test_bitacora_requiere_admin(bitacora_client: TestClient):
    recep_token = JwtAccessTokenIssuer().issue(
        {"sub": "recep@test.local", "rol": "RECEPCIONISTA", "nombre": "Recep", "id_usuario": 2}
    )
    r = bitacora_client.get("/api/bitacora", headers={"Authorization": f"Bearer {recep_token}"})
    assert r.status_code == 403
