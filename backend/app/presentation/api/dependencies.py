from functools import lru_cache

from app.application.auth.use_cases import AuthService
from app.infrastructure.auth.fallback_users import build_fallback_users
from app.infrastructure.auth.oracle_user_repository import OracleUserRepository
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher


@lru_cache(maxsize=1)
def get_auth_service() -> AuthService:
    password_hasher = SecurityPasswordHasher()
    user_repository = OracleUserRepository(password_hasher=password_hasher)
    token_issuer = JwtAccessTokenIssuer()
    return AuthService(
        user_repository=user_repository,
        password_hasher=password_hasher,
        token_issuer=token_issuer,
        fallback_users=build_fallback_users(),
    )
