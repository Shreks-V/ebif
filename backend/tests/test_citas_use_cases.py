"""Tests for CitasService — verifies delegation, id validation, and normalization."""
from unittest.mock import MagicMock
import pytest

from app.application.citas.dtos import CitaCreate
from app.domain.exceptions import ValidationError
import app.application.citas.use_cases as uc_mod
from app.application.citas.use_cases import (
    CitasService,
    configure_service,
    citas_stats,
    citas_hoy,
    listar_citas,
    obtener_cita,
    crear_cita,
    actualizar_cita,
    iniciar_cita,
    completar_cita,
    cancelar_cita,
    eliminar_cita,
    citas_proximas,
)

_ALL_METHODS = [
    'citas_stats', 'citas_hoy', 'listar_citas', 'obtener_cita',
    'crear_cita', 'actualizar_cita', 'iniciar_cita', 'completar_cita',
    'cancelar_cita', 'eliminar_cita', 'citas_proximas',
]


def _make_repo():
    repo = MagicMock()
    for m in _ALL_METHODS:
        getattr(repo, m).return_value = {}
    return repo


def _cita(**kw):
    defaults = dict(id_paciente=1, fecha_hora='2026-06-01 10:00', estatus='PROGRAMADA')
    defaults.update(kw)
    return CitaCreate(**defaults)


class TestCitasServiceClass:
    def setup_method(self):
        self.repo = _make_repo()
        self.svc = CitasService(self.repo)

    def test_citas_stats_delega(self):
        self.svc.citas_stats()
        self.repo.citas_stats.assert_called_once()

    def test_citas_hoy_delega(self):
        self.svc.citas_hoy()
        self.repo.citas_hoy.assert_called_once()

    def test_listar_citas_delega(self):
        self.svc.listar_citas()
        self.repo.listar_citas.assert_called_once()

    def test_obtener_cita_delega(self):
        self.svc.obtener_cita(1)
        self.repo.obtener_cita.assert_called_once()

    def test_crear_cita_delega_con_fecha_hora_valida(self):
        self.svc.crear_cita(_cita())
        self.repo.crear_cita.assert_called_once()

    def test_crear_cita_strips_notas(self):
        self.svc.crear_cita(_cita(notas='  nota con espacios  '))
        sent = self.repo.crear_cita.call_args[0][0]
        assert sent.notas == 'nota con espacios'

    def test_crear_cita_sin_fecha_hora_lanza_error(self):
        with pytest.raises(ValidationError, match='fecha y hora'):
            self.svc.crear_cita(_cita(fecha_hora=''))

    def test_actualizar_cita_delega(self):
        self.svc.actualizar_cita(1, _cita())
        self.repo.actualizar_cita.assert_called_once()

    def test_iniciar_cita_valido_delega(self):
        self.svc.iniciar_cita(1)
        self.repo.iniciar_cita.assert_called_once()

    def test_iniciar_cita_id_invalido_lanza_error(self):
        with pytest.raises(ValidationError):
            self.svc.iniciar_cita(0)

    def test_completar_cita_valido_delega(self):
        self.svc.completar_cita(2)
        self.repo.completar_cita.assert_called_once()

    def test_completar_cita_id_invalido_lanza_error(self):
        with pytest.raises(ValidationError):
            self.svc.completar_cita(-1)

    def test_cancelar_cita_valido_delega(self):
        self.svc.cancelar_cita(3)
        self.repo.cancelar_cita.assert_called_once()

    def test_cancelar_cita_id_invalido_lanza_error(self):
        with pytest.raises(ValidationError):
            self.svc.cancelar_cita(0)

    def test_eliminar_cita_valido_delega(self):
        self.svc.eliminar_cita(4)
        self.repo.eliminar_cita.assert_called_once()

    def test_eliminar_cita_id_invalido_lanza_error(self):
        with pytest.raises(ValidationError):
            self.svc.eliminar_cita(-5)

    def test_citas_proximas_delega(self):
        self.svc.citas_proximas()
        self.repo.citas_proximas.assert_called_once()


class TestCitasModuleFunctions:
    def setup_method(self):
        self.repo = _make_repo()
        configure_service(CitasService(self.repo))

    def teardown_method(self):
        uc_mod._service = None

    def test_citas_stats(self):
        citas_stats()
        self.repo.citas_stats.assert_called_once()

    def test_citas_hoy(self):
        citas_hoy()
        self.repo.citas_hoy.assert_called_once()

    def test_listar_citas(self):
        listar_citas()
        self.repo.listar_citas.assert_called_once()

    def test_obtener_cita(self):
        obtener_cita(1)
        self.repo.obtener_cita.assert_called_once()

    def test_crear_cita(self):
        crear_cita(_cita())
        self.repo.crear_cita.assert_called_once()

    def test_actualizar_cita(self):
        actualizar_cita(1, _cita())
        self.repo.actualizar_cita.assert_called_once()

    def test_iniciar_cita(self):
        iniciar_cita(1)
        self.repo.iniciar_cita.assert_called_once()

    def test_completar_cita(self):
        completar_cita(1)
        self.repo.completar_cita.assert_called_once()

    def test_cancelar_cita(self):
        cancelar_cita(1)
        self.repo.cancelar_cita.assert_called_once()

    def test_eliminar_cita(self):
        eliminar_cita(1)
        self.repo.eliminar_cita.assert_called_once()

    def test_citas_proximas(self):
        citas_proximas()
        self.repo.citas_proximas.assert_called_once()


class TestCitasServiceUnconfigured:
    def setup_method(self):
        uc_mod._service = None

    def teardown_method(self):
        uc_mod._service = None

    def test_svc_raises_cuando_no_configurado(self):
        with pytest.raises(RuntimeError, match="citas service is not configured"):
            citas_stats()
