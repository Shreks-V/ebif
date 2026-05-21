from fastapi import APIRouter, Query, Depends
from typing import Annotated, Optional, List, Literal
from app.application.almacen.dtos import ProductoCreate, ServicioCreate, ComodatoCreate, AjusteExistenciaRequest
from app.presentation.api.schemas import ProductoResponse, ServicioResponse, ComodatoResponse, MovimientoInventario
from app.application.almacen import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/productos')
def listar_productos(
    tipo_producto: Optional[Literal['MEDICAMENTO', 'EQUIPO', 'EQUIPO_MEDICO']]=Query(None, description='MEDICAMENTO o EQUIPO'),
    busqueda: Optional[str]=Query(None, max_length=120),
    activo: Optional[Literal['S', 'N']]=Query(None),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> List[ProductoResponse]:
    return service.listar_productos(tipo_producto, busqueda, activo, current_user, limit, offset)

@router.get('/productos/{id_producto}')
def obtener_producto(id_producto: int, current_user: Annotated[dict, Depends(get_current_user)] = None) -> ProductoResponse:
    return service.obtener_producto(id_producto, current_user)

@router.post('/productos', status_code=201)
def crear_producto(data: ProductoCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))] = None) -> ProductoResponse:
    return service.crear_producto(data, current_user)

@router.put('/productos/{id_producto}')
def actualizar_producto(id_producto: int, data: ProductoCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))] = None) -> ProductoResponse:
    return service.actualizar_producto(id_producto, data, current_user)

@router.delete('/productos/{id_producto}')
def desactivar_producto(id_producto: int, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR'))] = None) -> dict:
    return service.desactivar_producto(id_producto, current_user)

@router.patch('/productos/{id_producto}/existencia')
def ajustar_existencia(id_producto: int, data: AjusteExistenciaRequest, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))] = None) -> ProductoResponse:
    return service.ajustar_existencia(id_producto, data.stock_nuevo, data.motivo, current_user)

@router.get('/servicios')
def listar_servicios(
    busqueda: Optional[str]=Query(None, max_length=120),
    activo: Optional[Literal['S', 'N']]=Query(None),
    categoria: Optional[Literal['SERVICIO', 'LABORATORIO']]=Query(None),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> List[ServicioResponse]:
    return service.listar_servicios(busqueda, activo, categoria, current_user, limit, offset)

@router.get('/servicios/{id_servicio}')
def obtener_servicio(id_servicio: int, current_user: Annotated[dict, Depends(get_current_user)] = None) -> ServicioResponse:
    return service.obtener_servicio(id_servicio, current_user)

@router.post('/servicios', status_code=201)
def crear_servicio(data: ServicioCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR'))] = None) -> ServicioResponse:
    return service.crear_servicio(data, current_user)

@router.put('/servicios/{id_servicio}')
def actualizar_servicio(id_servicio: int, data: ServicioCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR'))] = None) -> ServicioResponse:
    return service.actualizar_servicio(id_servicio, data, current_user)

@router.delete('/servicios/{id_servicio}')
def desactivar_servicio(id_servicio: int, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR'))] = None) -> dict:
    return service.desactivar_servicio(id_servicio, current_user)

@router.get('/comodatos')
def listar_comodatos(
    estatus: Optional[Literal['PRESTADO', 'DEVUELTO', 'CANCELADO']]=Query(None, description='PRESTADO, DEVUELTO, CANCELADO'),
    busqueda: Optional[str]=Query(None, max_length=120),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> List[ComodatoResponse]:
    return service.listar_comodatos(estatus, busqueda, current_user, limit, offset)

@router.get('/comodatos/{id_comodato}')
def obtener_comodato(id_comodato: int, current_user: Annotated[dict, Depends(get_current_user)] = None) -> ComodatoResponse:
    return service.obtener_comodato(id_comodato, current_user)

@router.post('/comodatos', status_code=201)
def crear_comodato(data: ComodatoCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))] = None) -> ComodatoResponse:
    return service.crear_comodato(data, current_user)

@router.put('/comodatos/{id_comodato}')
def actualizar_comodato(id_comodato: int, data: ComodatoCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))] = None) -> ComodatoResponse:
    return service.actualizar_comodato(id_comodato, data, current_user)

@router.get('/movimientos')
def listar_movimientos(
    id_producto: Optional[int]=Query(None, ge=1),
    tipo_movimiento: Optional[str]=Query(None),
    busqueda: Optional[str]=Query(None, max_length=120),
    fecha_inicio: Optional[str]=Query(None),
    fecha_fin: Optional[str]=Query(None),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> List[MovimientoInventario]:
    return service.listar_movimientos(id_producto, tipo_movimiento, busqueda, fecha_inicio, fecha_fin, current_user, limit, offset)

@router.get('/stats')
def almacen_stats(current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.almacen_stats(current_user)
