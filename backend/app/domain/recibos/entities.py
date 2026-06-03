from typing_extensions import TypedDict


class Venta(TypedDict, total=False):
    id_venta: int
    folio_venta: str
    id_paciente: int
    monto_total: float
    monto_pagado: float
    saldo_pendiente: float
    exento_pago: str
    id_usuario_registro: int | None
    fecha_venta: str | None
    cancelada: str
    motivo_cancelacion: str | None
    nombre_paciente: str | None
    folio_paciente: str | None
    metodos_pago: list[dict] | None
    items: list[dict] | None


class VentaLinea(TypedDict, total=False):
    id_linea: int
    id_venta: int
    tipo: str
    id_referencia: int
    descripcion: str
    precio_unitario: float
    cantidad: int
    subtotal: float


class MetodoPago(TypedDict, total=False):
    id_metodo_pago: int
    nombre: str
    descripcion: str | None
    activo: str
