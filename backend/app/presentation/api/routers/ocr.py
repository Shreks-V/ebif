"""OCR de documentos con Gemini Vision — pre-registro."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, UploadFile, File, status

from app.core.config import settings
from app.infrastructure.ai.gemini_service import get_gemini_service

router = APIRouter()
_log = logging.getLogger("ebif.ocr")

_ALLOWED_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "application/pdf",
}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/extraer-documento", status_code=200)
async def extraer_documento(
    archivo: Annotated[UploadFile, File(description="Imagen o PDF del documento oficial")],
) -> dict:
    """
    Extrae datos personales de un documento oficial (CURP, acta de nacimiento, INE)
    usando Gemini Vision. La imagen se procesa en memoria y no se almacena.

    No requiere autenticación — es llamado desde el flujo público de pre-registro.
    """
    if archivo.content_type not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de archivo no soportado: {archivo.content_type}. Use JPG, PNG, WEBP o PDF.",
        )

    image_bytes = await archivo.read()
    if len(image_bytes) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="El archivo no debe superar 10 MB.",
        )

    if not settings.GEMINI_KEY_1 and not settings.GEMINI_KEY_2:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de OCR no configurado.",
        )

    try:
        svc = get_gemini_service(settings.GEMINI_KEY_1, settings.GEMINI_KEY_2)
        result = svc.extraer(image_bytes, archivo.content_type or "image/jpeg")
        return result
    except Exception as exc:
        _log.error("Error en OCR: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo procesar el documento. Intenta con una imagen más clara.",
        ) from exc
