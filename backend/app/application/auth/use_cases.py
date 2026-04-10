from app.domain.auth.entities import AuthenticatedUser, SeedUser, User
from app.domain.auth.exceptions import AuthError, ForbiddenActionError, UserNotFoundError
from app.domain.auth.ports import AccessTokenIssuer, PasswordHasher, UserRepository


DEFAULT_SEED_USERS = [
    SeedUser(
        nombre="Administrador",
        apellido_paterno="General",
        apellido_materno=None,
        correo="admin@espinabifida.org",
        contrasena="admin123",
        rol="ADMINISTRADOR",
    ),
    SeedUser(
        nombre="Usuario",
        apellido_paterno="Operativo",
        apellido_materno=None,
        correo="operativo@espinabifida.org",
        contrasena="op123",
        rol="RECEPCIONISTA",
    ),
]


class AuthService:
    def __init__(
        self,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
        token_issuer: AccessTokenIssuer,
        fallback_users: list[User] | None = None,
    ) -> None:
        self._user_repository = user_repository
        self._password_hasher = password_hasher
        self._token_issuer = token_issuer
        self._fallback_users = fallback_users or []

    def login(self, correo: str, password: str) -> AuthenticatedUser:
        db_user = self._user_repository.find_by_email(correo)
        if db_user is not None:
            return self._authenticate_user(db_user, password)

        if self._user_repository.has_users():
            raise AuthError()

        fallback_user = self._find_fallback_user(correo)
        if fallback_user is None:
            raise AuthError()
        return self._authenticate_user(fallback_user, password)

    def get_me(self, correo: str) -> dict:
        user = self._user_repository.find_by_email(correo) or self._find_fallback_user(correo)
        if user is None:
            raise UserNotFoundError()
        return self._to_user_response(user)

    def seed_default_users(self, current_user: dict) -> dict:
        if current_user.get("rol") != "ADMINISTRADOR":
            raise ForbiddenActionError()

        inserted = self._user_repository.seed_users(DEFAULT_SEED_USERS)
        if not inserted:
            return {"message": "Los usuarios por defecto ya existen en la BD."}
        return {"message": f"Usuarios insertados: {', '.join(inserted)}"}

    def _find_fallback_user(self, correo: str) -> User | None:
        return next((user for user in self._fallback_users if user.correo == correo), None)

    def _authenticate_user(self, user: User, password: str) -> AuthenticatedUser:
        estatus = (user.estatus or "").strip().upper()
        if estatus != "ACTIVO":
            raise AuthError()

        if not self._password_hasher.verify(password, user.hashed_password):
            raise AuthError()

        access_token = self._token_issuer.issue(
            data={
                "sub": user.correo,
                "rol": user.rol,
                "nombre": user.nombre,
                "id_usuario": user.id_usuario,
            }
        )
        return AuthenticatedUser(access_token=access_token)

    @staticmethod
    def _to_user_response(user: User) -> dict:
        return {
            "id_usuario": user.id_usuario,
            "nombre": user.nombre,
            "apellido_paterno": user.apellido_paterno,
            "apellido_materno": user.apellido_materno,
            "correo": user.correo,
            "rol": user.rol,
            "estatus": user.estatus,
        }
