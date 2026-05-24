from fastapi import APIRouter, Query, Depends
from typing import Annotated, Optional, List
from app.presentation.api.schemas import ReporteResponse
from app.application.reportes import use_cases as service
from app.presentation.api.security import get_current_user
router = APIRouter()

@router.get('/por-genero')
def reporte_por_genero(genero: Annotated[Optional[str], Query()] = None, estado: Annotated[Optional[str], Query()] = None, tipo_espina: Annotated[Optional[int], Query()] = None, fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-etapa-vida')
def reporte_por_etapa_vida(genero: Annotated[Optional[str], Query()] = None, estado: Annotated[Optional[str], Query()] = None, tipo_espina: Annotated[Optional[int], Query()] = None, fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-tipo-espina')
def reporte_por_tipo_espina(genero: Annotated[Optional[str], Query()] = None, estado: Annotated[Optional[str], Query()] = None, tipo_espina: Annotated[Optional[int], Query()] = None, fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-estado')
def reporte_por_estado(genero: Annotated[Optional[str], Query()] = None, estado: Annotated[Optional[str], Query()] = None, tipo_espina: Annotated[Optional[int], Query()] = None, fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/resumen')
def reporte_resumen(genero: Annotated[Optional[str], Query()] = None, estado: Annotated[Optional[str], Query()] = None, tipo_espina: Annotated[Optional[int], Query()] = None, fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/servicios-por-tipo')
def reporte_servicios_por_tipo(fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

@router.get('/estudios-por-tipo')
def reporte_estudios_por_tipo(fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

@router.get('/pagos-exentos')
def reporte_pagos_exentos(fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

@router.get('/consolidado-mensual')
def reporte_consolidado_mensual(mes: Annotated[Optional[int], Query(description='Mes (1-12)')] = None, anio: Annotated[Optional[int], Query(description='Año')] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_consolidado_mensual(mes, anio, current_user)

@router.get('/por-ciudad')
def reporte_por_ciudad(current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_ciudad(current_user)

@router.get('/indicadores-desempeno')
def indicadores_desempeno(fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.indicadores_desempeno(fecha_inicio, fecha_fin, current_user)

@router.get('/pagos-por-metodo')
def reporte_pagos_por_metodo(fecha_inicio: Annotated[Optional[str], Query()] = None, fecha_fin: Annotated[Optional[str], Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_pagos_por_metodo(fecha_inicio, fecha_fin, current_user)

@router.get('/historial')
def historial_reportes(
    tipo_reporte: Annotated[Optional[str], Query(max_length=60)] = None,
    fecha_inicio: Annotated[Optional[str], Query()] = None,
    fecha_fin: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> List[ReporteResponse]:
    return service.historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)
