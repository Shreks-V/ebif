from __future__ import annotations

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from typing import Annotated, Optional

from app.application.bitacora import use_cases as service
from app.presentation.api.security import require_role

router = APIRouter()


@router.get("")
def listar_bitacora(
    tabla: Optional[str] = Query(None),
    tipo_operacion: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: Annotated[dict, Depends(require_role("ADMINISTRADOR"))] = None,
) -> dict:
    return service.listar(tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda, limit, offset)
