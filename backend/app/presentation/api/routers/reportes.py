from fastapi import APIRouter, Query, Depends
from typing import Annotated
from app.presentation.api.schemas import ReporteResponse
from app.application.reportes import use_cases as service
from app.presentation.api.security import get_current_user
router = APIRouter()

@router.get('/por-genero')
def reporte_por_genero(genero: Annotated[str | None, Query()] = None, estado: Annotated[str | None, Query()] = None, tipo_espina: Annotated[int | None, Query()] = None, fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-etapa-vida')
def reporte_por_etapa_vida(genero: Annotated[str | None, Query()] = None, estado: Annotated[str | None, Query()] = None, tipo_espina: Annotated[int | None, Query()] = None, fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-tipo-espina')
def reporte_por_tipo_espina(genero: Annotated[str | None, Query()] = None, estado: Annotated[str | None, Query()] = None, tipo_espina: Annotated[int | None, Query()] = None, fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-estado')
def reporte_por_estado(genero: Annotated[str | None, Query()] = None, estado: Annotated[str | None, Query()] = None, tipo_espina: Annotated[int | None, Query()] = None, fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/resumen')
def reporte_resumen(genero: Annotated[str | None, Query()] = None, estado: Annotated[str | None, Query()] = None, tipo_espina: Annotated[int | None, Query()] = None, fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/servicios-por-tipo')
def reporte_servicios_por_tipo(fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

@router.get('/estudios-por-tipo')
def reporte_estudios_por_tipo(fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

@router.get('/pagos-exentos')
def reporte_pagos_exentos(fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

@router.get('/consolidado-mensual')
def reporte_consolidado_mensual(mes: Annotated[int | None, Query(description='Mes (1-12)')] = None, anio: Annotated[int | None, Query(description='Año')] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_consolidado_mensual(mes, anio, current_user)

@router.get('/por-ciudad')
def reporte_por_ciudad(current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_por_ciudad(current_user)

@router.get('/indicadores-desempeno')
def indicadores_desempeno(fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.indicadores_desempeno(fecha_inicio, fecha_fin, current_user)

@router.get('/pagos-por-metodo')
def reporte_pagos_por_metodo(fecha_inicio: Annotated[str | None, Query()] = None, fecha_fin: Annotated[str | None, Query()] = None, current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.reporte_pagos_por_metodo(fecha_inicio, fecha_fin, current_user)

@router.get('/asistencia-mensual')
def asistencia_mensual_historico(
    meses: Annotated[int, Query(ge=1, le=24, description='Número de meses históricos a incluir')] = 12,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    """Asistencia mensual histórica: pacientes únicos y visitas por mes.

    Retorna datos de los últimos N meses para el widget de promedio de asistencia
    que David solicitó (promedio real ≈ 80-84 personas/mes).
    """
    return service.asistencia_mensual_historico(meses, current_user)

@router.get('/historial')
def historial_reportes(
    tipo_reporte: Annotated[str | None, Query(max_length=60)] = None,
    fecha_inicio: Annotated[str | None, Query()] = None,
    fecha_fin: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[ReporteResponse]:
    return service.historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)
