from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


# ──────────────────────────── AUTH ────────────────────────────

class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    username: str
    nombre: str
    rol: str


# ──────────────────────────── BENEFICIARIOS ────────────────────────────

class BeneficiarioBase(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    fecha_nacimiento: str
    genero: str
    curp: str
    tipo_espina_bifida: str
    estado_nacimiento: str
    hospital_nacimiento: Optional[str] = None
    nombre_tutor: Optional[str] = None
    calle: Optional[str] = None
    numero: Optional[str] = None
    colonia: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono_casa: Optional[str] = None
    telefono_celular: Optional[str] = None
    correo: Optional[str] = None
    tipo_cuota: Optional[str] = "mensual"
    fecha_ingreso: Optional[str] = None
    estado_membresia: Optional[str] = "activo"
    fotografia_url: Optional[str] = None
    notas: Optional[str] = None


class BeneficiarioCreate(BeneficiarioBase):
    pass


class BeneficiarioResponse(BeneficiarioBase):
    folio: str


# ──────────────────────────── CITAS ────────────────────────────

class CitaBase(BaseModel):
    id_paciente: str
    nombre_paciente: str
    fecha_hora: str
    id_doctor: str
    nombre_doctor: str
    especialidad: str
    tipo_servicio: str
    estatus: str = "PROGRAMADA"
    notas: Optional[str] = None


class CitaCreate(CitaBase):
    pass


class CitaResponse(CitaBase):
    id_cita: int


# ──────────────────────────── DOCTORES ────────────────────────────

class DoctorBase(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    especialidad: str
    telefono: Optional[str] = None
    correo: Optional[str] = None
    activo: bool = True


class DoctorCreate(DoctorBase):
    pass


class DoctorResponse(DoctorBase):
    id_doctor: int


# ──────────────────────────── ALMACÉN – PRODUCTOS ────────────────────────────

class ProductoBase(BaseModel):
    clave: str
    nombre: str
    descripcion: Optional[str] = None
    categoria: str  # Medicamento / Material / Equipo
    unidad: str
    cuota_recuperacion: float = 0.0
    cantidad_disponible: int = 0
    stock_minimo: int = 5
    fecha_caducidad: Optional[str] = None
    estatus: str = "Disponible"


class ProductoCreate(ProductoBase):
    pass


class ProductoResponse(ProductoBase):
    id_producto: int


# ──────────────────────────── ALMACÉN – SERVICIOS OTORGADOS ────────────────────────────

class ServicioOtorgado(BaseModel):
    id: Optional[int] = None
    folio_beneficiario: str
    nombre_beneficiario: str
    tipo_servicio: str
    fecha: str
    monto_pagado: float = 0.0
    notas: Optional[str] = None


# ──────────────────────────── ALMACÉN – COMODATOS ────────────────────────────

class Comodato(BaseModel):
    id: Optional[int] = None
    folio_comodato: Optional[str] = None
    folio_beneficiario: str
    nombre_beneficiario: str
    equipo: str
    fecha_inicio: str
    fecha_devolucion: Optional[str] = None
    monto_total: float = 0.0
    monto_pagado: float = 0.0
    saldo_pendiente: float = 0.0
    estatus: str = "PRESTADO"  # PRESTADO / DEVUELTO / CANCELADO


# ──────────────────────────── RECIBOS ────────────────────────────

class ReciboBase(BaseModel):
    beneficiario: str
    fecha: str
    total: float
    metodo_pago: str
    tipo: str  # cuota / exento
    detalle: Optional[str] = None


class ReciboCreate(ReciboBase):
    pass


class ReciboResponse(ReciboBase):
    id: int
    folio: str


# ──────────────────────────── REPORTES ────────────────────────────

class ReporteFilter(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    genero: Optional[str] = None
    procedencia: Optional[str] = None
    etapa_vida: Optional[str] = None


# ──────────────────────────── PRE-REGISTRO ────────────────────────────

class PreRegistroBase(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    fecha_nacimiento: str
    genero: str
    curp: str
    tipo_espina_bifida: str
    estado_nacimiento: str
    hospital_nacimiento: Optional[str] = None
    nombre_tutor: Optional[str] = None
    calle: Optional[str] = None
    numero: Optional[str] = None
    colonia: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono_casa: Optional[str] = None
    telefono_celular: Optional[str] = None
    correo: Optional[str] = None
    tipo_cuota: Optional[str] = "mensual"
    notas: Optional[str] = None
    paso_actual: int = 1
    completado: bool = False


class PreRegistroCreate(PreRegistroBase):
    pass


class PreRegistroResponse(PreRegistroBase):
    id: int
    fecha_solicitud: str
    estatus: str = "PENDIENTE"
