from typing import Optional
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
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    correo: str
    rol: str
    estatus: str = "ACTIVO"


class UsuarioCreate(UsuarioBase):
    contrasena: str


class UsuarioUpdate(BaseModel):
    nombre: str
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    rol: str
    estatus: str = "ACTIVO"
