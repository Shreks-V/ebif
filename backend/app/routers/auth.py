from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import (
    get_current_user,
    create_access_token,
    verify_password,
    get_password_hash,
)
from app.schemas.schemas import Token, UserResponse

router = APIRouter()

# ──────────────────────────── MOCK DATA ────────────────────────────

mock_users = [
    {
        "username": "admin",
        "nombre": "Administrador General",
        "rol": "admin",
        "hashed_password": get_password_hash("admin123"),
    },
    {
        "username": "operativo",
        "nombre": "Usuario Operativo",
        "rol": "operativo",
        "hashed_password": get_password_hash("op123"),
    },
]


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Iniciar sesión y obtener token JWT."""
    user = next(
        (u for u in mock_users if u["username"] == form_data.username), None
    )
    if user is None or not verify_password(
        form_data.password, user["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user["username"], "role": user["rol"], "nombre": user["nombre"]}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Obtener información del usuario autenticado."""
    user = next(
        (u for u in mock_users if u["username"] == current_user["username"]),
        None,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return {
        "username": user["username"],
        "nombre": user["nombre"],
        "rol": user["rol"],
    }
