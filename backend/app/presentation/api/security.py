from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.infrastructure.security.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
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
        return {
            "correo": correo,
            "rol": payload.get("rol", "OPERATIVO"),
            "id_usuario": payload.get("id_usuario"),
            "nombre": payload.get("nombre"),
        }
    except JWTError:
        raise credentials_exception


def require_role(*allowed_roles: str):
    def _check(current_user: dict = Depends(get_current_user)):
        if current_user.get("rol") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta acción",
            )
        return current_user

    return _check
