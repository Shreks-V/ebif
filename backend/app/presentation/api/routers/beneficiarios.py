from fastapi import APIRouter, Query, Depends
from typing import Annotated
from app.application.beneficiarios.dtos import BeneficiarioCreate, RenovarMembresiaCreate
from app.presentation.api.schemas import BeneficiarioResponse
from app.application.beneficiarios import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/tipos-espina')
def listar_tipos_espina(current_user: Annotated[dict, Depends(get_current_user)] = None) -> list:
    return service.listar_tipos_espina(current_user)

@router.get('/stats')
def stats_beneficiarios(current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.stats_beneficiarios(current_user)

@router.get('/stats/dashboard')
def dashboard_stats(current_user: Annotated[dict, Depends(get_current_user)] = None) -> dict:
    return service.dashboard_stats(current_user)

@router.get('')
def listar_beneficiarios(
    nombre: Annotated[str | None, Query(max_length=120)] = None,
    estado: Annotated[str | None, Query(max_length=40)] = None,
    genero: Annotated[str | None, Query(max_length=40)] = None,
    busqueda: Annotated[str | None, Query(max_length=120)] = None,
    membresia_estatus: Annotated[str | None, Query(max_length=40)] = None,
    tipo_cuota: Annotated[str | None, Query(max_length=10)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list[BeneficiarioResponse]:
    return service.listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, current_user, limit, offset)

@router.get('/mapa')
def mapa_beneficiarios(current_user: Annotated[dict, Depends(get_current_user)] = None) -> list:
    return service.mapa_beneficiarios(current_user)

@router.get('/{folio}')
def obtener_beneficiario(folio: str, current_user: Annotated[dict, Depends(get_current_user)] = None) -> BeneficiarioResponse:
    return service.obtener_beneficiario(folio, current_user)

@router.post('', status_code=201)
def crear_beneficiario(data: BeneficiarioCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))] = None) -> BeneficiarioResponse:
    return service.crear_beneficiario(data, current_user)

@router.put('/{folio}')
def actualizar_beneficiario(folio: str, data: BeneficiarioCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))] = None) -> BeneficiarioResponse:
    return service.actualizar_beneficiario(folio, data, current_user)

@router.delete('/{folio}', status_code=200)
def eliminar_beneficiario(folio: str, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR'))] = None) -> dict:
    return service.eliminar_beneficiario(folio, current_user)

@router.get('/{folio}/historial')
def historial_beneficiario(
    folio: str,
    limit_citas: Annotated[int, Query(ge=1, le=500)] = 100,
    offset_citas: Annotated[int, Query(ge=0)] = 0,
    limit_pagos: Annotated[int, Query(ge=1, le=500)] = 100,
    offset_pagos: Annotated[int, Query(ge=0)] = 0,
    limit_comodatos: Annotated[int, Query(ge=1, le=500)] = 100,
    offset_comodatos: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> dict:
    return service.historial_beneficiario(
        folio,
        current_user,
        limit_citas,
        offset_citas,
        limit_pagos,
        offset_pagos,
        limit_comodatos,
        offset_comodatos,
    )

@router.get('/membresias/proximas-a-vencer')
def membresias_proximas_a_vencer(
    dias: Annotated[int, Query(ge=1, le=365)] = 30,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> list:
    return service.listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

@router.post('/{folio}/renovar-membresia', status_code=200)
def renovar_membresia(folio: str, data: RenovarMembresiaCreate, current_user: Annotated[dict, Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))] = None) -> dict:
    return service.renovar_membresia(folio, data, current_user)
