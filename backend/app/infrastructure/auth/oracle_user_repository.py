from __future__ import annotations

from app.domain.auth.entities import SeedUser, User
from app.domain.auth.ports import PasswordHasher, UserRepository
from app.infrastructure.persistence.oracle import get_db, row_to_dict


class OracleUserRepository(UserRepository):
    def __init__(self, password_hasher: PasswordHasher) -> None:
        self._password_hasher = password_hasher

    def find_by_email(self, correo: str) -> User | None:
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
                return self._to_user(row) if row is not None else None
        except Exception:
            return None

    def has_users(self) -> bool:
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) AS cnt FROM USUARIO_SISTEMA")
                row = row_to_dict(cursor)
                return row is not None and row.get("cnt", 0) > 0
        except Exception:
            return False

    def seed_users(self, users: list[SeedUser]) -> list[str]:
        inserted: list[str] = []
        with get_db() as conn:
            cursor = conn.cursor()
            for user in users:
                cursor.execute(
                    "SELECT ID_USUARIO FROM USUARIO_SISTEMA WHERE CORREO = :1",
                    [user.correo],
                )
                if cursor.fetchone() is not None:
                    continue

                cursor.execute(
                    "INSERT INTO USUARIO_SISTEMA "
                    "(NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, CORREO, "
                    "CONTRASENA_HASH, ROL, ESTATUS) "
                    "VALUES (:1, :2, :3, :4, :5, :6, :7)",
                    [
                        user.nombre,
                        user.apellido_paterno,
                        user.apellido_materno,
                        user.correo,
                        self._password_hasher.hash(user.contrasena),
                        user.rol,
                        "ACTIVO",
                    ],
                )
                inserted.append(user.correo)
            conn.commit()
        return inserted

    @staticmethod
    def _to_user(row: dict) -> User:
        return User(
            id_usuario=row["id_usuario"],
            nombre=row["nombre"],
            apellido_paterno=row.get("apellido_paterno"),
            apellido_materno=row.get("apellido_materno"),
            correo=row["correo"],
            hashed_password=row["contrasena_hash"],
            rol=row["rol"],
            estatus=row["estatus"],
            fecha_creacion=row.get("fecha_creacion"),
        )
