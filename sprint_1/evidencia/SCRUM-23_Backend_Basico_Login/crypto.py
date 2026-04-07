"""
Cifrado AES-256-GCM para datos personales sensibles.

Cumplimiento con LFPDPPP (Ley Federal de Proteccion de Datos Personales
en Posesion de los Particulares):
- Los datos sensibles se cifran antes de almacenarse en la BD.
- Se descifran solo al momento de ser consultados por usuarios autorizados.
- AES-256-GCM proporciona confidencialidad + integridad (authenticated encryption).
- Cada valor cifrado usa un nonce (IV) unico de 12 bytes.

Formato almacenado: base64( nonce_12bytes + ciphertext + tag_16bytes )
"""

import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


def _get_key() -> bytes:
    key_b64 = settings.DATA_ENCRYPTION_KEY
    if not key_b64:
        raise RuntimeError(
            "DATA_ENCRYPTION_KEY no configurada. "
            "Genera una con: python -c \"from cryptography.hazmat.primitives.ciphers.aead import AESGCM; "
            "import base64; print(base64.b64encode(AESGCM.generate_key(bit_length=256)).decode())\""
        )
    return base64.b64decode(key_b64)


def encrypt(plaintext: str | None) -> str | None:
    """Cifra un texto plano con AES-256-GCM. Retorna None si el input es None/vacio."""
    if not plaintext:
        return plaintext
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt(ciphertext: str | None) -> str | None:
    """Descifra un texto cifrado con AES-256-GCM. Retorna None si el input es None/vacio."""
    if not ciphertext:
        return ciphertext
    try:
        key = _get_key()
        data = base64.b64decode(ciphertext)
        nonce = data[:12]
        ct = data[12:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except Exception:
        # Si el dato no esta cifrado (migracion gradual), retornar tal cual
        return ciphertext


# ── Campos sensibles por tabla (LFPDPPP) ──────────────────────────────
# Datos personales: nombre, contacto, direccion, identificacion
# Datos sensibles: informacion medica, CURP

# Campos cifrados en BD (AES-256-GCM)
# Los nombres se mantienen sin cifrar para permitir busquedas SQL (LIKE),
# pero estan protegidos por autenticacion, autorizacion y HTTPS en transito.

PACIENTE_ENCRYPTED_FIELDS = {
    # Identificacion (dato sensible LFPDPPP)
    "curp",
    # Contacto personal
    "telefono_casa", "telefono_celular", "correo_electronico",
    # Direccion detallada
    "direccion",
    # Contacto de emergencia
    "en_emergencia_avisar_a", "telefono_emergencia",
    # Datos del tutor
    "nombre_padre_madre",
    # Datos medicos (datos sensibles LFPDPPP - proteccion reforzada)
    "tipo_sangre", "notas_adicionales", "hospital_nacimiento",
}

DOCTOR_ENCRYPTED_FIELDS = {
    "telefono", "correo",
}

USUARIO_ENCRYPTED_FIELDS = {
    # Correo no se cifra porque es el campo de login (WHERE CORREO = :1)
}


def encrypt_row(row: dict, sensitive_fields: set[str]) -> dict:
    """Cifra los campos sensibles de un diccionario antes de INSERT/UPDATE."""
    result = dict(row)
    for field in sensitive_fields:
        if field in result and result[field] is not None:
            result[field] = encrypt(str(result[field]))
    return result


def decrypt_row(row: dict | None, sensitive_fields: set[str]) -> dict | None:
    """Descifra los campos sensibles de un diccionario despues de SELECT."""
    if row is None:
        return None
    result = dict(row)
    for field in sensitive_fields:
        if field in result and result[field] is not None:
            result[field] = decrypt(str(result[field]))
    return result


def decrypt_rows(rows: list[dict], sensitive_fields: set[str]) -> list[dict]:
    """Descifra los campos sensibles de una lista de diccionarios."""
    return [decrypt_row(r, sensitive_fields) for r in rows]
