from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.schemas.schemas import BeneficiarioCreate, BeneficiarioResponse
from app.application.beneficiarios import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/tipos-espina')
def listar_tipos_espina(current_user: dict=Depends(get_current_user)):
    return service.listar_tipos_espina(current_user)

@router.get('/stats')
def stats_beneficiarios(current_user: dict=Depends(get_current_user)):
    return service.stats_beneficiarios(current_user)

@router.get('/stats/dashboard')
def dashboard_stats(current_user: dict=Depends(get_current_user)):
    return service.dashboard_stats(current_user)

@router.get('', response_model=list[BeneficiarioResponse])
def listar_beneficiarios(nombre: Optional[str]=Query(None), estado: Optional[str]=Query(None), genero: Optional[str]=Query(None), busqueda: Optional[str]=Query(None), membresia_estatus: Optional[str]=Query(None), tipo_cuota: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, current_user)

@router.get('/{folio}', response_model=BeneficiarioResponse)
def obtener_beneficiario(folio: str, current_user: dict=Depends(get_current_user)):
    return service.obtener_beneficiario(folio, current_user)

@router.post('', status_code=201, response_model=BeneficiarioResponse)
def crear_beneficiario(data: BeneficiarioCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.crear_beneficiario(data, current_user)

@router.put('/{folio}', response_model=BeneficiarioResponse)
def actualizar_beneficiario(folio: str, data: BeneficiarioCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.actualizar_beneficiario(folio, data, current_user)

@router.delete('/{folio}', status_code=200)
def eliminar_beneficiario(folio: str, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.eliminar_beneficiario(folio, current_user)

@router.get('/{folio}/historial')
def historial_beneficiario(folio: str, current_user: dict=Depends(get_current_user)):
    return service.historial_beneficiario(folio, current_user)
