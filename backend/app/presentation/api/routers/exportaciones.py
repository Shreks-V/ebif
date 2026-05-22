"""
Exportaciones — PDF y Excel.

Cubre:
  RF-ER-05  Reportes en formato PDF
  RF-ER-06  Reporte general de un paciente en PDF
  RF-ER-11  Exportar tablas a Excel
  RF-RB-06  Credencial de beneficiario en PDF
  RF-RB-07  Exportar lista filtrada de beneficiarios a Excel
  RF-SO-10  Comprobante de servicio / cita en PDF
  RF-PS-05  Contrato de comodato en PDF
  RF-ER-WS  Progreso de exportación en tiempo real (WebSocket)
"""
import asyncio
import base64
import io
import json
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Query, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.domain.exportaciones.entities import FilePayload
from app.application.exportaciones import use_cases as service
from app.infrastructure.security.auth import decode_access_token
from app.presentation.api.security import get_current_user

_log = logging.getLogger("ebif.ws.exportaciones")

router = APIRouter()


def _payload_response(payload: FilePayload) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(payload.content),
        media_type=payload.media_type,
        headers={"Content-Disposition": f'attachment; filename="{payload.filename}"'},
    )


@router.get('/reportes/pdf')
def exportar_reporte_pdf(
    tipo: str = Query('resumen', description='resumen | por-genero | por-etapa-vida | por-estado | por-tipo-espina | consolidado-mensual | indicadores'),
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_espina: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    mes: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    current_user: Annotated[dict, Depends(get_current_user)] = None,
) -> StreamingResponse:
    return _payload_response(service.exportar_reporte_pdf(tipo, genero, estado, tipo_espina, fecha_inicio, fecha_fin, mes, anio, current_user))

@router.get('/beneficiario/{folio}/pdf')
def exportar_beneficiario_pdf(folio: str, current_user: Annotated[dict, Depends(get_current_user)] = None) -> StreamingResponse:
    return _payload_response(service.exportar_beneficiario_pdf(folio, current_user))

@router.get('/beneficiario/{folio}/credencial')
def exportar_credencial_pdf(folio: str, current_user: Annotated[dict, Depends(get_current_user)] = None) -> StreamingResponse:
    return _payload_response(service.exportar_credencial_pdf(folio, current_user))

@router.get('/cita/{id_cita}/comprobante')
def exportar_comprobante_cita(id_cita: int, current_user: Annotated[dict, Depends(get_current_user)] = None) -> StreamingResponse:
    return _payload_response(service.exportar_comprobante_cita(id_cita, current_user))

@router.get('/comodato/{id_comodato}/contrato')
def exportar_contrato_comodato(id_comodato: int, current_user: Annotated[dict, Depends(get_current_user)] = None) -> StreamingResponse:
    return _payload_response(service.exportar_contrato_comodato(id_comodato, current_user))

@router.get('/beneficiarios/excel')
def exportar_beneficiarios_excel(genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), membresia_estatus: Optional[str]=Query(None), busqueda: Optional[str]=Query(None), current_user: Annotated[dict, Depends(get_current_user)] = None) -> StreamingResponse:
    return _payload_response(service.exportar_beneficiarios_excel(genero, estado, membresia_estatus, busqueda, current_user))

@router.get('/reportes/excel')
def exportar_reporte_excel(tipo: str=Query('resumen', description='resumen | servicios-por-tipo | pagos-exentos | consolidado-mensual'), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), mes: Optional[int]=Query(None), anio: Optional[int]=Query(None), current_user: Annotated[dict, Depends(get_current_user)] = None) -> StreamingResponse:
    return _payload_response(service.exportar_reporte_excel(tipo, fecha_inicio, fecha_fin, mes, anio, current_user))


async def _ws_send(ws: WebSocket, step: int, total: int, msg: str, data: dict | None = None) -> None:
    payload: dict = {"step": step, "total": total, "message": msg}
    if data:
        payload.update(data)
    await ws.send_text(json.dumps(payload))


@router.websocket("/ws/exportar")
async def ws_exportar_reporte(
    websocket: WebSocket,
    tipo: str = Query("resumen"),
    genero: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    tipo_espina: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    mes: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    token: Optional[str] = Query(None),
):
    """
    Exporta un reporte PDF con progreso en tiempo real via WebSocket.

    Autenticación: pasar el access token como query param ?token=<jwt>
    Pasos: validar → cargar datos → generar PDF → codificar → listo
    """
    await websocket.accept()
    try:
        # ── Paso 1: validar token ──────────────────────────────────────
        await _ws_send(websocket, 1, 5, "Validando sesión…")
        if not token:
            await websocket.send_text(json.dumps({"error": "Token requerido"}))
            await websocket.close(code=4001)
            return
        try:
            current_user = decode_access_token(token)
        except Exception:
            await websocket.send_text(json.dumps({"error": "Token inválido o expirado"}))
            await websocket.close(code=4001)
            return

        # ── Paso 2: preparar parámetros ────────────────────────────────
        await _ws_send(websocket, 2, 5, "Preparando parámetros…")
        await asyncio.sleep(0)  # cede el event loop

        # ── Paso 3: generar PDF (tarea bloqueante en hilo aparte) ──────
        await _ws_send(websocket, 3, 5, "Generando reporte PDF…")
        payload: FilePayload = await asyncio.to_thread(
            service.exportar_reporte_pdf,
            tipo, genero, estado, tipo_espina,
            fecha_inicio, fecha_fin, mes, anio, current_user,
        )

        # ── Paso 4: codificar en base64 ────────────────────────────────
        await _ws_send(websocket, 4, 5, "Codificando archivo…")
        b64 = base64.b64encode(payload.content).decode()

        # ── Paso 5: enviar resultado ───────────────────────────────────
        await _ws_send(websocket, 5, 5, "Listo", {
            "filename": payload.filename,
            "media_type": payload.media_type,
            "data": b64,
        })
        await websocket.close()

    except WebSocketDisconnect:
        _log.info("WebSocket desconectado durante exportación")
    except Exception as exc:
        _log.exception("Error en ws_exportar_reporte: %s", exc)
        try:
            await websocket.send_text(json.dumps({"error": "Error interno al generar el reporte"}))
            await websocket.close(code=1011)
        except Exception:
            pass
