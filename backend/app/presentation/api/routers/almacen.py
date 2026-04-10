from fastapi import APIRouter, Query, Depends
from typing import Optional, List
from app.schemas.schemas import ProductoCreate, ProductoResponse, ServicioCreate, ServicioResponse, ComodatoCreate, ComodatoResponse, MovimientoInventario
from app.application.almacen import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/productos', response_model=List[ProductoResponse])
def listar_productos(tipo_producto: Optional[str]=Query(None, description='MEDICAMENTO o EQUIPO'), busqueda: Optional[str]=Query(None), activo: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.listar_productos(tipo_producto, busqueda, activo, current_user)

@router.get('/productos/{id_producto}', response_model=ProductoResponse)
def obtener_producto(id_producto: int, current_user: dict=Depends(get_current_user)):
    return service.obtener_producto(id_producto, current_user)

@router.post('/productos', status_code=201, response_model=ProductoResponse)
def crear_producto(data: ProductoCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))):
    return service.crear_producto(data, current_user)

@router.put('/productos/{id_producto}', response_model=ProductoResponse)
def actualizar_producto(id_producto: int, data: ProductoCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))):
    return service.actualizar_producto(id_producto, data, current_user)

@router.delete('/productos/{id_producto}')
def desactivar_producto(id_producto: int, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.desactivar_producto(id_producto, current_user)

@router.get('/servicios', response_model=List[ServicioResponse])
def listar_servicios(busqueda: Optional[str]=Query(None), activo: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.listar_servicios(busqueda, activo, current_user)

@router.get('/servicios/{id_servicio}', response_model=ServicioResponse)
def obtener_servicio(id_servicio: int, current_user: dict=Depends(get_current_user)):
    return service.obtener_servicio(id_servicio, current_user)

@router.post('/servicios', status_code=201, response_model=ServicioResponse)
def crear_servicio(data: ServicioCreate, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.crear_servicio(data, current_user)

@router.put('/servicios/{id_servicio}', response_model=ServicioResponse)
def actualizar_servicio(id_servicio: int, data: ServicioCreate, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.actualizar_servicio(id_servicio, data, current_user)

@router.delete('/servicios/{id_servicio}')
def desactivar_servicio(id_servicio: int, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.desactivar_servicio(id_servicio, current_user)

@router.get('/comodatos', response_model=List[ComodatoResponse])
def listar_comodatos(estatus: Optional[str]=Query(None, description='PRESTADO, DEVUELTO, CANCELADO'), busqueda: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.listar_comodatos(estatus, busqueda, current_user)

@router.get('/comodatos/{id_comodato}', response_model=ComodatoResponse)
def obtener_comodato(id_comodato: int, current_user: dict=Depends(get_current_user)):
    return service.obtener_comodato(id_comodato, current_user)

@router.post('/comodatos', status_code=201, response_model=ComodatoResponse)
def crear_comodato(data: ComodatoCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))):
    return service.crear_comodato(data, current_user)

@router.put('/comodatos/{id_comodato}', response_model=ComodatoResponse)
def actualizar_comodato(id_comodato: int, data: ComodatoCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))):
    return service.actualizar_comodato(id_comodato, data, current_user)

@router.get('/movimientos', response_model=List[MovimientoInventario])
def listar_movimientos(id_producto: Optional[int]=Query(None), tipo_movimiento: Optional[str]=Query(None, description='ENTRADA, SALIDA, AJUSTE'), current_user: dict=Depends(get_current_user)):
    return service.listar_movimientos(id_producto, tipo_movimiento, current_user)

@router.get('/stats')
def almacen_stats(current_user: dict=Depends(get_current_user)):
    return service.almacen_stats(current_user)
