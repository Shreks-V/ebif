from fastapi import APIRouter, Query, Depends
from typing import Annotated, List, Literal
from app.application.almacen.dtos import ProductoCreate, ServicioCreate, ComodatoCreate, AjusteExistenciaRequest, VarianteCreate
from app.presentation.api.schemas import ProductoResponse, ServicioResponse, ComodatoResponse, MovimientoInventario
from app.application.almacen import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/productos')
def listar_productos(
    tipo_producto: Annotated[Literal['MEDICAMENTO', 'EQUIPO', 'EQUIPO_MEDICO'] | None, Query(description='MEDICAMENTO o EQUIPO')] = None,
    busqueda: Annotated[str | None, Query(max_length=120)] = None,
    activo: Annotated[Literal['S', 'N'] | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[ProductoResponse]:
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

@router.get('/productos/{id_producto}/variantes')
def listar_variantes(
    id_producto: int,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list:
    """Listar variantes (calibres/tallas) de un producto padre."""
    return service.listar_variantes(id_producto, current_user)

@router.post('/productos/{id_producto}/variantes', status_code=201)
def crear_variante(
    id_producto: int,
    data: VarianteCreate,
    current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'ENCARGADO_ALMACEN'))] = None,
) -> dict:
    """Crear una nueva variante (calibre 8, calibre 10, talla M, etc.) para un producto padre."""
    return service.crear_variante(id_producto, data, current_user)

@router.get('/servicios')
def listar_servicios(
    busqueda: Annotated[str | None, Query(max_length=120)] = None,
    activo: Annotated[Literal['S', 'N'] | None, Query()] = None,
    categoria: Annotated[Literal['SERVICIO', 'LABORATORIO'] | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[ServicioResponse]:
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
    estatus: Annotated[Literal['PRESTADO', 'DEVUELTO', 'CANCELADO'] | None, Query(description='PRESTADO, DEVUELTO, CANCELADO')] = None,
    busqueda: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[ComodatoResponse]:
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
    id_producto: Annotated[int | None, Query(ge=1)] = None,
    tipo_movimiento: Annotated[str | None, Query()] = None,
    busqueda: Annotated[str | None, Query(max_length=120)] = None,
    fecha_inicio: Annotated[str | None, Query()] = None,
    fecha_fin: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[MovimientoInventario]:
    return service.listar_movimientos(id_producto, tipo_movimiento, busqueda, fecha_inicio, fecha_fin, current_user, limit, offset)

@router.get('/stats')
def almacen_stats(current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.almacen_stats(current_user)
