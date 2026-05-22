"""Gemini Vision — extracción de datos desde documentos oficiales."""
from __future__ import annotations

import itertools
import json
import logging
import threading
from typing import Any

from google import genai
from google.genai import types

_log = logging.getLogger("ebif.ai.gemini")

_PROMPT = """Eres un asistente especializado en extracción de datos de documentos oficiales mexicanos.

Analiza la imagen. Puede ser cualquiera de estos documentos:
- CURP (Clave Única de Registro de Población)
- INE / IFE (credencial de elector)
- Acta de nacimiento
- Comprobante de domicilio (recibo de luz, agua, teléfono, estado de cuenta bancario)
- Pasaporte mexicano
- Cartilla militar
- Cualquier otro documento oficial

INSTRUCCIONES:
1. Identifica qué tipo de documento es
2. Extrae ÚNICAMENTE los campos que estén visibles y claramente legibles
3. Si un campo no aparece en el documento o está ilegible, usa null
4. No inventes ni infergas datos que no estén explícitos en el documento

CAMPOS A EXTRAER:

Identificación personal:
- tipo_documento: tipo detectado (ej: "CURP", "INE", "Acta de nacimiento", "Comprobante de domicilio", "Pasaporte", "Otro")
- nombre: primer(os) nombre(s) de la persona titular
- apellido_paterno: apellido paterno
- apellido_materno: apellido materno
- fecha_nacimiento: fecha en formato YYYY-MM-DD
- sexo: exactamente "Masculino" o "Femenino"
- curp: los 18 caracteres exactos del CURP
- estado_nacimiento: nombre del estado mexicano donde nació

Domicilio (de INE, comprobante de domicilio, acta, etc.):
- calle: nombre de la calle o avenida
- numero_exterior: número exterior
- numero_interior: número interior o departamento (null si no aplica)
- colonia: nombre de la colonia o fraccionamiento
- municipio: nombre del municipio o alcaldía
- estado_residencia: nombre del estado de residencia
- codigo_postal: código postal de 5 dígitos

Datos familiares (de acta de nacimiento principalmente):
- nombre_padre: nombre completo del padre
- nombre_madre: nombre completo de la madre

Calidad de extracción:
- confianza: "alta" si lees la mayoría de campos claramente, "media" si algunos son difíciles de leer, "baja" si el documento está muy dañado, inclinado o fuera de foco
- campos_detectados: lista de los nombres de los campos que sí pudiste extraer (sin los que son null)

Responde ÚNICAMENTE con JSON válido. Sin explicaciones, sin texto adicional."""


class GeminiOcrService:
    def __init__(self, key1: str, key2: str) -> None:
        self._keys = [k for k in [key1, key2] if k]
        if not self._keys:
            raise ValueError("Se requiere al menos una GEMINI_KEY")
        self._cycle = itertools.cycle(self._keys)
        self._lock = threading.Lock()

    def _next_key(self) -> str:
        with self._lock:
            return next(self._cycle)

    def extraer(self, image_bytes: bytes, mime_type: str) -> dict[str, Any]:
        last_exc: Exception | None = None

        for _ in range(len(self._keys)):
            key = self._next_key()
            try:
                client = genai.Client(api_key=key)
                image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                response = client.models.generate_content(
                    model="gemini-3.5-flash",
                    contents=[image_part, _PROMPT],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0,
                    ),
                )
                return json.loads(response.text)
            except Exception as exc:
                _log.warning("Gemini key falló (%s…): %s", key[:8], exc)
                last_exc = exc

        raise RuntimeError(f"Todos los intentos con Gemini fallaron: {last_exc}") from last_exc


_service: GeminiOcrService | None = None


def get_gemini_service(key1: str, key2: str) -> GeminiOcrService:
    global _service
    if _service is None:
        _service = GeminiOcrService(key1, key2)
    return _service
