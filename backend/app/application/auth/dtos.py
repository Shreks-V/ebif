from pydantic import BaseModel


class UserLogin(BaseModel):
    correo: str
    password: str


class CambiarContrasenaRequest(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str


class AdminResetContrasenaRequest(BaseModel):
    contrasena_nueva: str


class UsuarioBase(BaseModel):
    nombre: str
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    correo: str
    rol: str
    estatus: str = "ACTIVO"


class UsuarioCreate(UsuarioBase):
    contrasena: str


class UsuarioUpdate(BaseModel):
    nombre: str
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    rol: str
    estatus: str = "ACTIVO"
