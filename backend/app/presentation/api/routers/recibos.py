from fastapi import APIRouter, Query, Depends
from typing import Annotated, Optional
from app.application.recibos.dtos import VentaCreate, PagoParcialCreate, ExentarVentaBody
from app.application.recibos import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/stats')
def stats_ventas(current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.stats_ventas(current_user)

@router.get('/metodos-pago')
def listar_metodos_pago(current_user: Annotated[dict, Depends(get_current_user)] = None) -> list:
    return service.listar_metodos_pago(current_user)

@router.get('')
def listar_ventas(
    fecha_inicio: Optional[str]=Query(None),
    fecha_fin: Optional[str]=Query(None),
    id_paciente: Optional[int]=Query(None, ge=1),
    search: Optional[str]=Query(None, max_length=120),
    solo_adeudos: bool=Query(False),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list:
    return service.listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset, solo_adeudos)

@router.post('', status_code=201)
def crear_venta(data: VentaCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))] = None) -> dict:
    return service.crear_venta(data, current_user)

@router.get('/{id_venta}')
def obtener_venta(id_venta: int, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.obtener_venta(id_venta, current_user)

@router.put('/{id_venta}/cancelar')
def cancelar_venta(id_venta: int, motivo: Optional[str]=Query(None), current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))] = None) -> dict:
    return service.cancelar_venta(id_venta, motivo, current_user)

@router.post('/{id_venta}/pagos', status_code=201)
def registrar_pago(id_venta: int, data: PagoParcialCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))] = None) -> dict:
    return service.registrar_pago(id_venta, data.id_metodo_pago, data.monto, current_user)

@router.put('/{id_venta}/exentar')
def exentar_venta(id_venta: int, body: ExentarVentaBody, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))] = None) -> dict:
    return service.exentar_venta(id_venta, body.nota, current_user)

@router.get('/{id_venta}/items')
def listar_items_venta(id_venta: int, current_user: Annotated[dict, Depends(get_current_user)] = None) -> list:
    return service.listar_items_venta(id_venta, current_user)
