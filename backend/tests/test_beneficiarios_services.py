"""Tests for domain-layer calculators in beneficiarios/services.py."""
from datetime import date, datetime
import pytest

from app.domain.beneficiarios.services import (
    calculate_age,
    etapa_vida,
    is_nuevo_leon,
    normalize_genero,
)


class TestCalculateAge:
    def test_string_birthday_today_returns_exact_age(self):
        today = date.today()
        born = date(today.year - 20, today.month, today.day)
        assert calculate_age(str(born)) == 20

    def test_birthday_not_yet_this_year_returns_age_minus_one(self):
        today = date.today()
        if today.month == 12 and today.day == 31:
            pytest.skip("edge-case day")
        born = date(today.year - 5, 12, 31)
        assert calculate_age(str(born)) == 4

    def test_date_object_is_accepted(self):
        today = date.today()
        born = date(today.year - 15, today.month, today.day)
        assert calculate_age(born) == 15

    def test_datetime_object_is_accepted(self):
        today = date.today()
        born = datetime(today.year - 10, today.month, today.day)
        assert calculate_age(born) == 10

    def test_none_returns_zero(self):
        assert calculate_age(None) == 0

    def test_empty_string_returns_zero(self):
        assert calculate_age('') == 0

    def test_invalid_string_returns_zero(self):
        assert calculate_age('not-a-date') == 0

    def test_unknown_type_returns_zero(self):
        assert calculate_age(12345) == 0


class TestEtapaVida:
    def test_primera_infancia_lower_bound(self):
        assert etapa_vida(0) == 'Primera Infancia (0-5)'

    def test_primera_infancia_upper_bound(self):
        assert etapa_vida(5) == 'Primera Infancia (0-5)'

    def test_infancia_lower_bound(self):
        assert etapa_vida(6) == 'Infancia (6-11)'

    def test_infancia_upper_bound(self):
        assert etapa_vida(11) == 'Infancia (6-11)'

    def test_adolescencia_lower_bound(self):
        assert etapa_vida(12) == 'Adolescencia (12-17)'

    def test_adolescencia_upper_bound(self):
        assert etapa_vida(17) == 'Adolescencia (12-17)'

    def test_juventud_lower_bound(self):
        assert etapa_vida(18) == 'Juventud (18-29)'

    def test_juventud_upper_bound(self):
        assert etapa_vida(29) == 'Juventud (18-29)'

    def test_adultez_lower_bound(self):
        assert etapa_vida(30) == 'Adultez (30-59)'

    def test_adultez_upper_bound(self):
        assert etapa_vida(59) == 'Adultez (30-59)'

    def test_adulto_mayor(self):
        assert etapa_vida(60) == 'Adulto Mayor (60+)'

    def test_adulto_mayor_high_age(self):
        assert etapa_vida(95) == 'Adulto Mayor (60+)'


class TestNormalizeGenero:
    def test_h_returns_hombre(self):
        assert normalize_genero('H') == 'Hombre'

    def test_hombre_returns_hombre(self):
        assert normalize_genero('HOMBRE') == 'Hombre'

    def test_masculino_returns_hombre(self):
        assert normalize_genero('MASCULINO') == 'Hombre'

    def test_m_returns_mujer(self):
        assert normalize_genero('M') == 'Mujer'

    def test_mujer_returns_mujer(self):
        assert normalize_genero('MUJER') == 'Mujer'

    def test_f_returns_mujer(self):
        assert normalize_genero('F') == 'Mujer'

    def test_femenino_returns_mujer(self):
        assert normalize_genero('FEMENINO') == 'Mujer'

    def test_lowercase_is_normalized(self):
        assert normalize_genero('h') == 'Hombre'
        assert normalize_genero('mujer') == 'Mujer'

    def test_whitespace_is_stripped(self):
        assert normalize_genero('  H  ') == 'Hombre'

    def test_none_returns_none(self):
        assert normalize_genero(None) is None

    def test_unknown_value_returns_none(self):
        assert normalize_genero('X') is None
        assert normalize_genero('OTRO') is None


class TestIsNuevoLeon:
    def test_with_accent(self):
        assert is_nuevo_leon('Nuevo León') is True

    def test_without_accent(self):
        assert is_nuevo_leon('Nuevo Leon') is True

    def test_uppercase(self):
        assert is_nuevo_leon('NUEVO LEON') is True

    def test_lowercase(self):
        assert is_nuevo_leon('nuevo leon') is True

    def test_other_state_returns_false(self):
        assert is_nuevo_leon('Jalisco') is False

    def test_empty_string_returns_false(self):
        assert is_nuevo_leon('') is False

    def test_none_returns_false(self):
        assert is_nuevo_leon(None) is False
