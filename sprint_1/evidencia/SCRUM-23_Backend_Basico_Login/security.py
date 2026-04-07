from datetime import datetime, timedelta, timezone
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Argon2id: ganador de la Password Hashing Competition (PHC)
# - Memory-hard: resiste ataques con GPUs/ASICs
# - Argon2id combina resistencia a side-channel + GPU attacks
# - Recomendado por OWASP como primera opción
ph = PasswordHasher()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña contra hash Argon2id."""
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False


def get_password_hash(password: str) -> str:
    """Genera hash Argon2id con salt aleatorio único."""
    return ph.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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
    """Dependency factory that restricts access to specific roles (RF-SEG-02).

    Usage:
        @router.post("", dependencies=[Depends(require_role("ADMINISTRADOR", "RECEPCIONISTA"))])
    """
    def _check(current_user: dict = Depends(get_current_user)):
        if current_user.get("rol") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta acción",
            )
        return current_user
    return _check
