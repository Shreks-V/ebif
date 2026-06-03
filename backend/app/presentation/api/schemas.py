from pydantic import BaseModel
from typing import Literal
from datetime import datetime

from app.application.auth.dtos import (
    UserLogin, CambiarContrasenaRequest, AdminResetContrasenaRequest,
    UsuarioBase, UsuarioCreate, UsuarioUpdate,
)
from app.application.beneficiarios.dtos import BeneficiarioBase, BeneficiarioCreate, RenovarMembresiaCreate
from app.application.citas.dtos import CitaBase, CitaCreate
from app.application.almacen.dtos import (
    ServicioBase, ServicioCreate,
    ProductoBase, ProductoCreate,
    ComodatoBase, ComodatoCreate,
    AjusteExistenciaRequest,
)
from app.application.doctores.dtos import DoctorBase, DoctorCreate, DisponibilidadCreate
from app.application.preregistro.dtos import PreRegistroCreate, AprobarPreRegistroData
from app.application.recibos.dtos import VentaBase, VentaCreate, PagoParcialCreate
from app.domain.reportes.entities import ReporteFilter

__all__ = [
    # re-exported input DTOs (kept for backward compat with any direct schemas import)
    "UserLogin", "CambiarContrasenaRequest", "AdminResetContrasenaRequest",
    "UsuarioBase", "UsuarioCreate", "UsuarioUpdate",
    "BeneficiarioBase", "BeneficiarioCreate", "RenovarMembresiaCreate",
    "CitaBase", "CitaCreate",
    "ServicioBase", "ServicioCreate",
    "ProductoBase", "ProductoCreate",
    "ComodatoBase", "ComodatoCreate",
    "AjusteExistenciaRequest",
    "DoctorBase", "DoctorCreate", "DisponibilidadCreate",
    "PreRegistroCreate", "AprobarPreRegistroData",
    "VentaBase", "VentaCreate", "PagoParcialCreate",
    "ReporteFilter",
]


# ──────────────────────────── AUTH / USUARIO_SISTEMA ────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str | None = None


class UserResponse(BaseModel):
    id_usuario: int
    nombre: str
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    correo: str
    rol: str
    estatus: str


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    fecha_creacion: str | None = None


# ──────────────────────────── BENEFICIARIOS / PACIENTE ────────────────────────────

class BeneficiarioResponse(BeneficiarioBase):
    id_paciente: int
    folio: str
    fecha_alta: str | None = None
    fecha_registro: str | None = None
    tutor: int | None = None
    relacion_parentezco: str | None = None
    tipos_espina: list[dict] | None = None
    fecha_inicio_membresia: str | None = None
    fecha_vencimiento_membresia: str | None = None


# ──────────────────────────── TIPO ESPINA BIFIDA ────────────────────────────

class TipoEspinaBifida(BaseModel):
    id_tipo_espina: int
    nombre: str
    descripcion: str | None = None
    activo: str = "S"


# ──────────────────────────── METODO DE PAGO ────────────────────────────

class MetodoPago(BaseModel):
    id_metodo_pago: int
    nombre: str
    descripcion: str | None = None
    activo: str = "S"


# ──────────────────────────── DOCTORES / DOCTOR ────────────────────────────

class DoctorResponse(DoctorBase):
    id_doctor: int
    fecha_registro: str | None = None
    servicios: list[dict] | None = None


# ──────────────────────────── DISPONIBILIDAD DOCTOR ────────────────────────────

class DisponibilidadResponse(BaseModel):
    id_disponibilidad: int
    id_doctor: int
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    disponible: str = "S"
    fecha_registro: str | None = None


# ──────────────────────────── SERVICIOS / SERVICIO ────────────────────────────

class ServicioResponse(ServicioBase):
    id_servicio: int
    fecha_registro: str | None = None


# ──────────────────────────── PRODUCTOS / PRODUCTO ────────────────────────────

class ProductoResponse(ProductoBase):
    id_producto: int
    fecha_registro: str | None = None
    presentacion: str | None = None
    dosis: str | None = None
    requiere_caducidad: str | None = None
    numero_serie: str | None = None
    marca: str | None = None
    modelo: str | None = None
    estatus_equipo: str | None = None
    observaciones: str | None = None
    cantidad_disponible: int | None = 0
    nivel_minimo: int | None = 5
    unidad_medida: str | None = None
    fecha_caducidad: str | None = None
    id_producto_padre: int | None = None
    nombre_variante: str | None = None


# ──────────────────────────── EXISTENCIA PRODUCTO ────────────────────────────

class ExistenciaProducto(BaseModel):
    id_existencia: int
    id_producto: int
    cantidad_disponible: int
    nivel_minimo: int
    unidad_medida: str | None = None
    activo: str = "S"


# ──────────────────────────── CITAS / CITA ────────────────────────────

class CitaResponse(CitaBase):
    id_cita: int
    fecha_registro: str | None = None
    nombre_paciente: str | None = None
    folio_paciente: str | None = None
    servicios: list[dict] | None = None


# ──────────────────────────── DETALLE CITA SERVICIO ────────────────────────────

class DetalleCitaServicio(BaseModel):
    id_detalle: int
    id_cita: int
    id_servicio: int
    id_venta: int | None = None
    cantidad: int
    monto_pagado: float
    cancelado: str = "N"
    motivo_cancelacion: str | None = None
    fecha_registro: str | None = None


# ──────────────────────────── COMODATOS / COMODATO ────────────────────────────

class ComodatoResponse(ComodatoBase):
    id_comodato: int
    folio_comodato: str
    id_usuario_registro: int | None = None
    nombre_paciente: str | None = None
    folio_paciente: str | None = None
    nombre_equipo: str | None = None


# ──────────────────────────── VENTAS / VENTA (RECIBOS) ────────────────────────────

class VentaResponse(VentaBase):
    id_venta: int
    folio_venta: str
    id_usuario_registro: int | None = None
    fecha_venta: str | None = None
    cancelada: str = "N"
    motivo_cancelacion: str | None = None
    nombre_paciente: str | None = None
    folio_paciente: str | None = None
    metodos_pago: list[dict] | None = None


# ──────────────────────────── MOVIMIENTO INVENTARIO ────────────────────────────

class MovimientoInventario(BaseModel):
    id_movimiento: int
    id_producto: int
    nombre_producto: str | None = None
    clave_interna: str | None = None
    id_usuario_registro: int | None = None
    id_venta: int | None = None
    id_comodato: int | None = None
    fecha_movimiento: str | None = None
    tipo_movimiento: Literal[
        "ENTRADA", "SALIDA_VENTA", "SALIDA_COMODATO",
        "DEVOLUCION_COMODATO", "SALIDA_MERMA", "AJUSTE_POS", "AJUSTE_NEG",
        "SALIDA", "AJUSTE",
    ]
    cantidad: int
    observaciones: str | None = None


# ──────────────────────────── DOCUMENTO PACIENTE ────────────────────────────

class DocumentoPacienteBase(BaseModel):
    id_paciente: int
    id_tipo_documento: int
    nombre_archivo: str
    ruta_archivo: str
    formato_archivo: str | None = None
    activo: str = "S"


class DocumentoPacienteResponse(DocumentoPacienteBase):
    id_documento: int
    fecha_carga: str | None = None


# ──────────────────────────── TIPO DOCUMENTO ────────────────────────────

class TipoDocumento(BaseModel):
    id_tipo_documento: int
    nombre: str
    descripcion: str | None = None
    activo: str = "S"


# ──────────────────────────── REPORTES ────────────────────────────

class ReporteResponse(BaseModel):
    id_reporte: int
    id_usuario: int
    tipo_reporte: str
    fecha_generacion: str | None = None
    fecha_inicio: str | None = None
    fecha_fin: str | None = None
    formato: str | None = None


# ──────────────────────────── BITACORA ────────────────────────────

class BitacoraCambios(BaseModel):
    id_bitacora: int
    tabla_afectada: str
    id_registro_afectado: int
    campo_modificado: str | None = None
    valor_anterior: str | None = None
    valor_nuevo: str | None = None
    tipo_operacion: str
    id_usuario: int
    fecha_cambio: str | None = None
    observaciones: str | None = None
