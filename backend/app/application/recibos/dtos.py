from pydantic import BaseModel
from typing import Optional, List


class VentaBase(BaseModel):
    id_paciente: int
    monto_total: float
    monto_pagado: float = 0.0
    saldo_pendiente: float = 0.0
    exento_pago: str = "N"


class VentaCreate(VentaBase):
    metodos_pago: Optional[List[dict]] = None


class PagoParcialCreate(BaseModel):
    id_metodo_pago: int
    monto: float
