from pydantic import BaseModel, Field
from typing import Literal


class ServicioBase(BaseModel):
    nombre: str
    descripcion: str | None = None
    cuota_recuperacion: float = Field(default=0.0, ge=0)
    precio_cuota_a: float | None = Field(default=None, ge=0)
    precio_cuota_b: float | None = Field(default=None, ge=0)
    categoria: Literal["SERVICIO", "LABORATORIO"] = "SERVICIO"
    activo: Literal["S", "N"] = "S"


class ServicioCreate(ServicioBase):
    pass


class ProductoBase(BaseModel):
    clave_interna: str = Field(min_length=1)
    nombre: str
    descripcion: str | None = None
    tipo_producto: Literal["MEDICAMENTO", "EQUIPO", "EQUIPO_MEDICO"]
    precio_cuota_a: float | None = Field(default=None, ge=0)
    precio_cuota_b: float | None = Field(default=None, ge=0)
    activo: Literal["S", "N"] = "S"


class ProductoCreate(ProductoBase):
    presentacion: str | None = None
    dosis: str | None = None
    requiere_caducidad: Literal["S", "N"] | None = "N"
    numero_serie: str | None = None
    marca: str | None = None
    modelo: str | None = None
    estatus_equipo: str | None = "DISPONIBLE"
    observaciones: str | None = None
    cantidad_disponible: int = Field(default=0, ge=0)
    nivel_minimo: int = Field(default=5, ge=0)
    unidad_medida: str | None = None
    fecha_caducidad: str | None = None


class ComodatoBase(BaseModel):
    id_equipo: int
    id_paciente: int
    fecha_prestamo: str
    fecha_devolucion: str | None = None
    estatus: str = "PRESTADO"
    monto_total: float = 0.0
    monto_pagado: float = 0.0
    saldo_pendiente: float = 0.0
    exento_pago: str = "N"
    notas: str | None = None


class ComodatoCreate(ComodatoBase):
    pass


class AjusteExistenciaRequest(BaseModel):
    stock_nuevo: int = Field(ge=0)
    motivo: str = Field(min_length=1, max_length=300)
