import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.application.auth.dtos import (
    AdminResetContrasenaRequest, CambiarContrasenaRequest,
    UserLogin, UsuarioCreate, UsuarioUpdate,
)
from app.application.auth.exceptions import ForbiddenError, LoginError, PasswordTooShortError
from app.domain.auth.exceptions import AuthError, UserAlreadyExistsError, UserNotFoundError
from app.application.auth.use_cases import AuthService
from app.infrastructure.security.auth import create_access_token, decode_access_token
from app.infrastructure.security.refresh_store import (
    REFRESH_TOKEN_EXPIRE_DAYS, get_refresh_store,
)

logger = logging.getLogger(__name__)
from app.presentation.api.dependencies import get_auth_service, get_token_decoder
from app.presentation.api.security import get_current_user
from app.domain.auth.ports import AccessTokenIssuer
from app.core.config import settings
from datetime import timedelta
from app.presentation.api.schemas import Token, UserResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

_MSG_USUARIO_NO_ENCONTRADO = "Usuario no encontrado"
_MSG_SOLO_ADMINISTRADORES = "Solo administradores"


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Correo o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/seed", responses={403: {"description": "Forbidden — only admins may run seed"}})
def seed_users(
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        return auth_service.seed_default_users(current_user)
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Solo administradores pueden ejecutar el seed")
    except Exception as exc:
        logger.exception("Error en seed_users: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al insertar usuarios en la BD",
        )


def _issue_refresh_token(user_claims: dict) -> str:
    jti = secrets.token_urlsafe(32)
    exp = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    get_refresh_store().add(jti, exp)
    return create_access_token(
        {**user_claims, "type": "refresh", "jti": jti},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,  # nosonar
    form_data: UserLogin,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        token = auth_service.login(correo=form_data.correo, password=form_data.password)
        payload = decode_access_token(token.access_token)
        user_claims = {
            "sub": payload["sub"],
            "rol": payload.get("rol"),
            "id_usuario": payload.get("id_usuario"),
            "nombre": payload.get("nombre"),
        }
        return {
            "access_token": token.access_token,
            "token_type": token.token_type,
            "refresh_token": _issue_refresh_token(user_claims),
        }
    except LoginError:
        raise _auth_error()


class _RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/token/refresh", response_model=Token)
def token_refresh(body: _RefreshRequest):
    """Rotación de refresh token: invalida el anterior y emite un nuevo par."""
    try:
        payload = decode_access_token(body.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token no es de tipo refresh")

    jti = payload.get("jti")
    if not jti or not get_refresh_store().consume(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token ya usado o expirado")

    user_claims = {k: payload.get(k) for k in ("sub", "rol", "id_usuario", "nombre")}
    return {
        "access_token": create_access_token(user_claims),
        "token_type": "bearer",
        "refresh_token": _issue_refresh_token(user_claims),
    }


@router.post("/refresh", response_model=Token)
def refresh_token(
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    token_issuer: Annotated[AccessTokenIssuer, Depends(get_token_decoder)] = None,
):
    """Re-emite un token fresco para un usuario ya autenticado."""
    payload = {"sub": current_user["correo"], "rol": current_user.get("rol")}
    new_token = token_issuer.issue(payload, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": new_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        return auth_service.get_me(current_user["correo"])
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_MSG_USUARIO_NO_ENCONTRADO)


@router.post("/cambiar-contrasena", status_code=200)
def cambiar_contrasena(
    body: CambiarContrasenaRequest,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        auth_service.change_password(current_user, body.contrasena_actual, body.contrasena_nueva)
        return {"message": "Contraseña actualizada correctamente"}
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La contraseña actual es incorrecta")
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_MSG_USUARIO_NO_ENCONTRADO)
    except PasswordTooShortError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.get("/usuarios", response_model=list[UserResponse])
def listar_usuarios(
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        return auth_service.list_users(current_user)
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_MSG_SOLO_ADMINISTRADORES)


@router.post("/usuarios", response_model=UserResponse, status_code=201)
def crear_usuario(
    body: UsuarioCreate,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        return auth_service.create_user(current_user, body.model_dump())
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_MSG_SOLO_ADMINISTRADORES)
    except PasswordTooShortError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except UserAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo")
    except Exception as exc:
        logger.exception("Error al crear usuario: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al crear el usuario")


@router.put("/usuarios/{id_usuario}", response_model=UserResponse, status_code=200)
def actualizar_usuario(
    id_usuario: int,
    body: UsuarioUpdate,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        return auth_service.update_user(current_user, id_usuario, body.model_dump())
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_MSG_SOLO_ADMINISTRADORES)
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_MSG_USUARIO_NO_ENCONTRADO)
    except Exception as exc:
        logger.exception("Error al actualizar usuario: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al actualizar el usuario")


@router.post("/usuarios/{id_usuario}/reset-contrasena", status_code=200)
def reset_contrasena_admin(
    id_usuario: int,
    body: AdminResetContrasenaRequest,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
    auth_service: Annotated[AuthService, Depends(get_auth_service)] = None,
):
    try:
        auth_service.admin_reset_password(current_user, id_usuario, body.contrasena_nueva)
        return {"message": "Contraseña restablecida correctamente"}
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_MSG_SOLO_ADMINISTRADORES)
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_MSG_USUARIO_NO_ENCONTRADO)
    except PasswordTooShortError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


# ── Endpoints para Opción C: recuperación por correo (descomentar al configurar SMTP) ─
# @router.post("/recuperar-contrasena", status_code=202)
# def solicitar_recuperacion(correo: str, auth_service: Annotated[AuthService, Depends(get_auth_service)] = None):
#     auth_service.request_password_reset(correo)
#     return {"message": "Si el correo existe, recibirás un enlace de recuperación"}
#
# @router.post("/confirmar-reset", status_code=200)
# def confirmar_reset(token: str, nueva: str, auth_service: Annotated[AuthService, Depends(get_auth_service)] = None):
#     auth_service.confirm_password_reset(token, nueva)
#     return {"message": "Contraseña restablecida correctamente"}
# ────────────────────────────────────────────────────────────────────────────
