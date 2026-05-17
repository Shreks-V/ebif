"""
Unit tests for beneficiarios DTOs — email and date validators.
"""
import pytest
from pydantic import ValidationError

from app.application.beneficiarios.dtos import BeneficiarioCreate


CURP_VALIDA = "GALJ980514HNLRPN09"


class TestCorreoValidator:
    def test_valid_email_is_accepted(self):
        b = BeneficiarioCreate(
            nombre="Ana",
            apellido_paterno="García",
            curp=CURP_VALIDA,
            correo_electronico="ana@example.com",
        )
        assert b.correo_electronico == "ana@example.com"

    def test_empty_string_becomes_none(self):
        b = BeneficiarioCreate(
            nombre="Ana",
            apellido_paterno="García",
            curp=CURP_VALIDA,
            correo_electronico="   ",
        )
        assert b.correo_electronico is None

    def test_none_email_stays_none(self):
        b = BeneficiarioCreate(
            nombre="Ana",
            apellido_paterno="García",
            curp=CURP_VALIDA,
            correo_electronico=None,
        )
        assert b.correo_electronico is None

    def test_missing_at_sign_is_rejected(self):
        with pytest.raises(ValidationError, match="correo_electronico"):
            BeneficiarioCreate(
                nombre="Ana",
                apellido_paterno="García",
                curp=CURP_VALIDA,
                correo_electronico="sinrobaaroba.com",
            )

    def test_missing_domain_dot_is_rejected(self):
        with pytest.raises(ValidationError, match="correo_electronico"):
            BeneficiarioCreate(
                nombre="Ana",
                apellido_paterno="García",
                curp=CURP_VALIDA,
                correo_electronico="usuario@sinpunto",
            )


class TestFechaNacimientoValidator:
    def test_valid_iso_date_is_accepted(self):
        b = BeneficiarioCreate(
            nombre="Luis",
            apellido_paterno="López",
            curp=CURP_VALIDA,
            fecha_nacimiento="1990-06-15",
        )
        assert b.fecha_nacimiento == "1990-06-15"

    def test_date_with_time_is_truncated(self):
        b = BeneficiarioCreate(
            nombre="Luis",
            apellido_paterno="López",
            curp=CURP_VALIDA,
            fecha_nacimiento="1990-06-15T08:00:00",
        )
        assert b.fecha_nacimiento == "1990-06-15"

    def test_empty_string_becomes_none(self):
        b = BeneficiarioCreate(
            nombre="Luis",
            apellido_paterno="López",
            curp=CURP_VALIDA,
            fecha_nacimiento="",
        )
        assert b.fecha_nacimiento is None

    def test_invalid_date_format_is_rejected(self):
        with pytest.raises(ValidationError, match="YYYY-MM-DD"):
            BeneficiarioCreate(
                nombre="Luis",
                apellido_paterno="López",
                curp=CURP_VALIDA,
                fecha_nacimiento="15/06/1990",
            )

    def test_invalid_date_value_is_rejected(self):
        with pytest.raises(ValidationError, match="YYYY-MM-DD"):
            BeneficiarioCreate(
                nombre="Luis",
                apellido_paterno="López",
                curp=CURP_VALIDA,
                fecha_nacimiento="1990-13-45",
            )


class TestDefaults:
    def test_defaults_are_correct(self):
        b = BeneficiarioCreate(
            nombre="Pedro",
            apellido_paterno="Martínez",
            curp=CURP_VALIDA,
        )
        assert b.usa_valvula == "N"
        assert b.membresia_estatus == "ACTIVO"
        assert b.activo == "S"
        assert b.tipos_espina is None
