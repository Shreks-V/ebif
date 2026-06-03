import pytest
from pydantic import ValidationError

from app.application.preregistro.dtos import AprobarPreRegistroData, PreRegistroCreate


VALID_CURP = "AABA010101HNLBCD09"


def test_preregistro_tipo_cuota_accepts_short_aliases():
    preregistro = PreRegistroCreate(
        nombre="Ada",
        apellido_paterno="Lovelace",
        curp=VALID_CURP,
        tipos_espina=[1],
        tipo_cuota="A",
    )
    aprobacion = AprobarPreRegistroData(tipo_cuota="B")

    assert preregistro.tipo_cuota == "CUOTA A"
    assert aprobacion.tipo_cuota == "CUOTA B"


def test_preregistro_tipo_cuota_rejects_invalid_values():
    with pytest.raises(ValidationError):
        PreRegistroCreate(
            nombre="Ada",
            apellido_paterno="Lovelace",
            curp=VALID_CURP,
            tipos_espina=[1],
            tipo_cuota="CUOTA C",
        )


def test_preregistro_curp_invalido_es_rechazado():
    with pytest.raises(ValidationError):
        PreRegistroCreate(
            nombre="Ada",
            apellido_paterno="Lovelace",
            curp="NO-ES-UN-CURP",
            tipos_espina=[1],
        )


def test_aprobacion_tipo_cuota_none_es_aceptado():
    data = AprobarPreRegistroData(tipo_cuota=None)
    assert data.tipo_cuota is None


def test_preregistro_correo_electronico_es_aceptado():
    p = PreRegistroCreate(
        nombre="Ada",
        apellido_paterno="Lovelace",
        curp=VALID_CURP,
        tipos_espina=[1],
        correo_electronico="ada@example.com",
    )
    assert p.correo_electronico == "ada@example.com"


def test_preregistro_fecha_nacimiento_trunca_tiempo():
    p = PreRegistroCreate(
        nombre="Ada",
        apellido_paterno="Lovelace",
        curp=VALID_CURP,
        tipos_espina=[1],
        fecha_nacimiento="1990-06-15T10:30:00",
    )
    assert p.fecha_nacimiento == "1990-06-15"
