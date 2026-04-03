from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.security import (
    get_current_user,
    create_access_token,
    verify_password,
    get_password_hash,
)
from app.core.database import get_db, rows_to_dicts, row_to_dict
from app.schemas.schemas import UserLogin, Token, UserResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ──────────────────────────── MOCK FALLBACK DATA ────────────────────────────

mock_users = [
    {
        "id_usuario": 1,
        "nombre": "Administrador",
        "apellido_paterno": "General",
        "apellido_materno": None,
        "correo": "admin@espinabifida.org",
        "hashed_password": get_password_hash("admin123"),
        "rol": "ADMINISTRADOR",
        "estatus": "ACTIVO",
    },
    {
        "id_usuario": 2,
        "nombre": "Usuario",
        "apellido_paterno": "Operativo",
        "apellido_materno": None,
        "correo": "operativo@espinabifida.org",
        "hashed_password": get_password_hash("op123"),
        "rol": "RECEPCIONISTA",
        "estatus": "ACTIVO",
    },
]

# ──────────────────────────── HELPERS ────────────────────────────


def _serialize_user(row: dict) -> dict:
    """Convert DB row to a safe dict, converting datetimes to ISO strings."""
    result = {}
    for key, value in row.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def _find_user_in_db(correo: str) -> dict | None:
    """Look up a user in USUARIO_SISTEMA by correo. Returns dict or None."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT ID_USUARIO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, "
                "CORREO, CONTRASENA_HASH, ROL, ESTATUS, FECHA_CREACION "
                "FROM USUARIO_SISTEMA WHERE CORREO = :1",
                [correo],
            )
            row = row_to_dict(cursor)
            if row is not None:
                return _serialize_user(row)
            return None
    except Exception:
        return None


def _db_has_users() -> bool:
    """Check whether USUARIO_SISTEMA has at least one row."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) AS cnt FROM USUARIO_SISTEMA")
            row = row_to_dict(cursor)
            return row is not None and row.get("cnt", 0) > 0
    except Exception:
        return False


# ──────────────────────────── ENDPOINTS ────────────────────────────


@router.post("/seed")
def seed_users(current_user: dict = Depends(get_current_user)):
    """Insert default admin and operativo users into the DB (requires auth)."""
    if current_user.get("rol") != "ADMINISTRADOR":
        raise HTTPException(status_code=403, detail="Solo administradores pueden ejecutar el seed")

    default_users = [
        {
            "nombre": "Administrador",
            "apellido_paterno": "General",
            "apellido_materno": None,
            "correo": "admin@espinabifida.org",
            "contrasena": "admin123",
            "rol": "ADMINISTRADOR",
        },
        {
            "nombre": "Usuario",
            "apellido_paterno": "Operativo",
            "apellido_materno": None,
            "correo": "operativo@espinabifida.org",
            "contrasena": "op123",
            "rol": "RECEPCIONISTA",
        },
    ]

    inserted = []
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            for u in default_users:
                cursor.execute(
                    "SELECT ID_USUARIO FROM USUARIO_SISTEMA WHERE CORREO = :1",
                    [u["correo"]],
                )
                if cursor.fetchone() is not None:
                    continue

                cursor.execute(
                    "INSERT INTO USUARIO_SISTEMA "
                    "(NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, CORREO, "
                    "CONTRASENA_HASH, ROL, ESTATUS) "
                    "VALUES (:1, :2, :3, :4, :5, :6, :7)",
                    [
                        u["nombre"],
                        u["apellido_paterno"],
                        u["apellido_materno"],
                        u["correo"],
                        get_password_hash(u["contrasena"]),
                        u["rol"],
                        "ACTIVO",
                    ],
                )
                inserted.append(u["correo"])
            conn.commit()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al insertar usuarios en la BD",
        )

    if not inserted:
        return {"message": "Los usuarios por defecto ya existen en la BD."}
    return {"message": f"Usuarios insertados: {', '.join(inserted)}"}


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: UserLogin):
    """Iniciar sesión y obtener token JWT. Rate limited: 10 intentos/min."""

    # Generic error to avoid user enumeration
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Correo o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Try to find user in the real DB
    db_user = _find_user_in_db(form_data.correo)

    if db_user is not None:
        # Check account is active
        estatus = (db_user.get("estatus") or "").strip().upper()
        if estatus != "ACTIVO":
            raise auth_error

        if not verify_password(form_data.password, db_user["contrasena_hash"]):
            raise auth_error
        access_token = create_access_token(
            data={
                "sub": db_user["correo"],
                "rol": db_user["rol"],
                "nombre": db_user["nombre"],
                "id_usuario": db_user["id_usuario"],
            }
        )
        return {"access_token": access_token, "token_type": "bearer"}

    # 2. Fallback to mock users ONLY when DB has no users
    if _db_has_users():
        raise auth_error

    mock_user = next(
        (u for u in mock_users if u["correo"] == form_data.correo), None
    )
    if mock_user is None or not verify_password(
        form_data.password, mock_user["hashed_password"]
    ):
        raise auth_error

    access_token = create_access_token(
        data={
            "sub": mock_user["correo"],
            "rol": mock_user["rol"],
            "nombre": mock_user["nombre"],
            "id_usuario": mock_user["id_usuario"],
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Obtener información del usuario autenticado."""

    # 1. Try the real DB first
    db_user = _find_user_in_db(current_user["correo"])
    if db_user is not None:
        return {
            "id_usuario": db_user["id_usuario"],
            "nombre": db_user["nombre"],
            "apellido_paterno": db_user.get("apellido_paterno"),
            "apellido_materno": db_user.get("apellido_materno"),
            "correo": db_user["correo"],
            "rol": db_user["rol"],
            "estatus": db_user["estatus"],
        }

    # 2. Fallback to mock users
    mock_user = next(
        (u for u in mock_users if u["correo"] == current_user["correo"]),
        None,
    )
    if mock_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return {
        "id_usuario": mock_user["id_usuario"],
        "nombre": mock_user["nombre"],
        "apellido_paterno": mock_user["apellido_paterno"],
        "apellido_materno": mock_user["apellido_materno"],
        "correo": mock_user["correo"],
        "rol": mock_user["rol"],
        "estatus": mock_user["estatus"],
    }
