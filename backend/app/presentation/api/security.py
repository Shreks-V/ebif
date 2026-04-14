from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.core.session_context import reset_current_user_id, set_current_user_id
from app.domain.auth.roles import normalize_role
from app.infrastructure.security.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        correo: str = payload.get("sub")
        if correo is None:
            raise credentials_exception
        rol_normalizado = normalize_role(payload.get("rol", "OPERATIVO"))
        user = {
            "correo": str(correo).strip(),
            "rol": rol_normalizado,
            "rol_original": payload.get("rol", "OPERATIVO"),
            "id_usuario": payload.get("id_usuario"),
            "nombre": str(payload.get("nombre") or "").strip(),
        }
    except JWTError:
        raise credentials_exception

    token_ctx = set_current_user_id(user.get("id_usuario"))
    try:
        yield user
    finally:
        reset_current_user_id(token_ctx)


def require_role(*allowed_roles: str):
    def _check(current_user: dict = Depends(get_current_user)):
        current_role = normalize_role(current_user.get("rol"))
        allowed_normalized = {normalize_role(r) for r in allowed_roles}
        if current_role not in allowed_normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta acción",
            )
        current_user["rol"] = current_role
        return current_user

    return _check
