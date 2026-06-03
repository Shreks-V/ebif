from __future__ import annotations

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from typing import Annotated

from app.application.bitacora import use_cases as service
from app.presentation.api.security import require_role

router = APIRouter()


@router.get("")
def listar_bitacora(
    tabla: Annotated[str | None, Query()] = None,
    tipo_operacion: Annotated[str | None, Query()] = None,
    fecha_inicio: Annotated[str | None, Query()] = None,
    fecha_fin: Annotated[str | None, Query()] = None,
    busqueda: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: Annotated[dict, Depends(require_role("ADMINISTRADOR"))] = None,
) -> dict:
    return service.listar(tabla, tipo_operacion, fecha_inicio, fecha_fin, busqueda, limit, offset)
