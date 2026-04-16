from __future__ import annotations

from collections.abc import Callable

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.application.auth.use_cases import AuthService
from app.core.config import settings
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher
from app.presentation.api.dependencies import get_auth_service
from app.presentation.api.routers import auth as auth_router

from Pruebas.support_auth import InMemoryUserRepository


def build_minimal_auth_app(auth_service: AuthService) -> FastAPI:
    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Autenticación"])
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    return app


@pytest.fixture(autouse=True)
def stable_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "SECRET_KEY", "pytest-jwt-secret-key-exactly-32bytes!")


@pytest.fixture
def password_hasher() -> SecurityPasswordHasher:
    return SecurityPasswordHasher()


@pytest.fixture
def auth_client_factory(
    password_hasher: SecurityPasswordHasher,
) -> Callable[[InMemoryUserRepository], TestClient]:
    def _make(repo: InMemoryUserRepository) -> TestClient:
        auth_service = AuthService(
            user_repository=repo,
            password_hasher=password_hasher,
            token_issuer=JwtAccessTokenIssuer(),
            fallback_users=[],
        )
        app = build_minimal_auth_app(auth_service)
        return TestClient(app)

    return _make
