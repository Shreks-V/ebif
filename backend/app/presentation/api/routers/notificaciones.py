import asyncio
import logging
from typing import Annotated
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from app.presentation.api.security import get_current_user
from app.presentation.api.dependencies import get_token_decoder
from app.domain.auth.roles import normalize_role
from app.domain.auth.exceptions import TokenDecodeError
from app.application.citas import use_cases as citas_svc
from app.application.almacen import use_cases as almacen_svc
from app.application.beneficiarios import use_cases as beneficiarios_svc

logger = logging.getLogger(__name__)

router = APIRouter()

_WS_PUSH_INTERVAL = 60


def _s(n: int) -> str:
    return 's' if n != 1 else ''


def _noti_citas_hoy(current_user) -> dict | None:
    hoy = citas_svc.citas_hoy(current_user)
    n = hoy.get('programadas', 0)
    if n <= 0:
        return None
    return {
        'id': 'citas_hoy', 'categoria': 'citas', 'tipo': 'info',
        'titulo': 'Citas de hoy',
        'detalle': f"{n} cita{_s(n)} programada{_s(n)} para hoy.",
        'count': n, 'link': '/citas',
    }


def _noti_citas_proximas(current_user) -> dict | None:
    n = citas_svc.citas_proximas(7, current_user).get('count', 0)
    if n <= 0:
        return None
    return {
        'id': 'citas_proximas', 'categoria': 'citas', 'tipo': 'info',
        'titulo': 'Próximas citas',
        'detalle': f"{n} cita{_s(n)} en los próximos 7 días.",
        'count': n, 'link': '/citas',
    }


def _noti_membresias(current_user) -> dict | None:
    membresias = beneficiarios_svc.listar_membresias_proximas_a_vencer(30, current_user, 500, 0)
    n = len(membresias) if isinstance(membresias, list) else 0
    if n <= 0:
        return None
    label = '500+' if n == 500 else str(n)
    return {
        'id': 'membresias_vencer', 'categoria': 'membresias', 'tipo': 'warning',
        'titulo': 'Membresías por vencer',
        'detalle': f"{label} membresía{_s(n)} vence{'n' if n != 1 else ''} en los próximos 30 días.",
        'count': n, 'link': '/registro-usuarios',
    }


def _noti_almacen(current_user) -> list[dict]:
    stats = almacen_svc.almacen_stats(current_user)
    stock_bajo = int(stats.get('alertas_stock_bajo', 0))
    caducidad = int(stats.get('alertas_caducidad', 0))
    result = []
    if stock_bajo > 0:
        result.append({
            'id': 'stock_bajo', 'categoria': 'almacen', 'tipo': 'warning',
            'titulo': 'Inventario en riesgo',
            'detalle': f"{stock_bajo} producto{_s(stock_bajo)} con existencias bajas.",
            'count': stock_bajo, 'link': '/almacen',
        })
    if caducidad > 0:
        result.append({
            'id': 'caducidad', 'categoria': 'almacen', 'tipo': 'warning',
            'titulo': 'Productos por caducar',
            'detalle': f"{caducidad} producto{_s(caducidad)} próximo{_s(caducidad)} a caducar.",
            'count': caducidad, 'link': '/almacen',
        })
    return result


def _recopilar(current_user) -> list[dict]:
    result = []
    for fn, label in [
        (_noti_citas_hoy, 'citas de hoy'),
        (_noti_citas_proximas, 'citas próximas'),
        (_noti_membresias, 'membresías por vencer'),
    ]:
        try:
            item = fn(current_user)
            if item:
                result.append(item)
        except Exception as exc:
            logger.warning('notificaciones: error al obtener %s: %s', label, exc)
    try:
        result.extend(_noti_almacen(current_user))
    except Exception as exc:
        logger.warning('notificaciones: error al obtener stats de almacén: %s', exc)
    return result


@router.get('')
def get_notificaciones(current_user: Annotated[dict, Depends(get_current_user)] = None):
    """Agrega alertas de todos los módulos en una respuesta unificada."""
    return _recopilar(current_user)


@router.websocket('/ws')
async def notificaciones_ws(websocket: WebSocket, token: str = Query(...)):
    """WebSocket que empuja notificaciones cada 60 s sin polling del cliente."""
    decoder = get_token_decoder()
    try:
        payload = decoder.decode(token)
        correo = payload.get('sub')
        if not correo:
            raise TokenDecodeError('sin sub')
        current_user = {
            'correo': str(correo).strip(),
            'rol': normalize_role(payload.get('rol', 'OPERATIVO')),
            'id_usuario': payload.get('id_usuario'),
            'nombre': str(payload.get('nombre') or '').strip(),
        }
    except Exception:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    try:
        while True:
            data = await asyncio.to_thread(_recopilar, current_user)
            await websocket.send_json(data)
            await asyncio.sleep(_WS_PUSH_INTERVAL)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning('notificaciones_ws: conexión cerrada con error: %s', exc)
