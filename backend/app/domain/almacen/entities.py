from typing import Literal
from typing_extensions import TypedDict


class Producto(TypedDict, total=False):
    id_producto: int
    clave_interna: str
    nombre: str
    descripcion: str | None
    tipo_producto: str
    precio_cuota_a: float | None
    precio_cuota_b: float | None
    activo: str
    fecha_registro: str | None
    presentacion: str | None
    dosis: str | None
    requiere_caducidad: str | None
    numero_serie: str | None
    marca: str | None
    modelo: str | None
    estatus_equipo: str | None
    observaciones: str | None
    cantidad_disponible: int | None
    nivel_minimo: int | None
    unidad_medida: str | None
    fecha_caducidad: str | None


class Servicio(TypedDict, total=False):
    id_servicio: int
    nombre: str
    descripcion: str | None
    cuota_recuperacion: float
    precio_cuota_a: float | None
    precio_cuota_b: float | None
    categoria: str
    activo: str
    fecha_registro: str | None


class Comodato(TypedDict, total=False):
    id_comodato: int
    folio_comodato: str
    id_equipo: int
    id_paciente: int
    fecha_prestamo: str
    fecha_devolucion: str | None
    estatus: str
    monto_total: float
    monto_pagado: float
    saldo_pendiente: float
    exento_pago: str
    notas: str | None
    id_usuario_registro: int | None
    nombre_paciente: str | None
    folio_paciente: str | None
    nombre_equipo: str | None


class MovimientoStock(TypedDict, total=False):
    id_movimiento: int
    id_producto: int
    nombre_producto: str | None
    clave_interna: str | None
    id_usuario_registro: int | None
    id_venta: int | None
    id_comodato: int | None
    fecha_movimiento: str | None
    tipo_movimiento: str
    cantidad: int
    observaciones: str | None
