"""Tests for ReportesService — verifies delegation to repository."""
from unittest.mock import MagicMock
import pytest

import app.application.reportes.use_cases as uc_mod
from app.application.reportes.use_cases import (
    ReportesService,
    configure_service,
    reporte_por_genero,
    reporte_por_etapa_vida,
    reporte_por_tipo_espina,
    reporte_por_estado,
    reporte_resumen,
    reporte_servicios_por_tipo,
    reporte_estudios_por_tipo,
    reporte_pagos_exentos,
    reporte_consolidado_mensual,
    historial_reportes,
    reporte_por_ciudad,
    indicadores_desempeno,
    reporte_pagos_por_metodo,
)

_ALL_REPORT_METHODS = [
    'reporte_por_genero', 'reporte_por_etapa_vida', 'reporte_por_tipo_espina',
    'reporte_por_estado', 'reporte_resumen', 'reporte_servicios_por_tipo',
    'reporte_estudios_por_tipo', 'reporte_pagos_exentos', 'reporte_consolidado_mensual',
    'historial_reportes', 'reporte_por_ciudad', 'indicadores_desempeno',
    'reporte_pagos_por_metodo',
]


def _make_repo():
    repo = MagicMock()
    for m in _ALL_REPORT_METHODS:
        getattr(repo, m).return_value = []
    return repo


class TestReportesServiceClass:
    def setup_method(self):
        self.repo = _make_repo()
        self.svc = ReportesService(self.repo)

    def test_reporte_por_genero_delega(self):
        self.svc.reporte_por_genero()
        self.repo.reporte_por_genero.assert_called_once()

    def test_reporte_por_etapa_vida_delega(self):
        self.svc.reporte_por_etapa_vida()
        self.repo.reporte_por_etapa_vida.assert_called_once()

    def test_reporte_por_tipo_espina_delega(self):
        self.svc.reporte_por_tipo_espina()
        self.repo.reporte_por_tipo_espina.assert_called_once()

    def test_reporte_por_estado_delega(self):
        self.svc.reporte_por_estado()
        self.repo.reporte_por_estado.assert_called_once()

    def test_reporte_resumen_delega(self):
        self.svc.reporte_resumen()
        self.repo.reporte_resumen.assert_called_once()

    def test_reporte_servicios_por_tipo_delega(self):
        self.svc.reporte_servicios_por_tipo()
        self.repo.reporte_servicios_por_tipo.assert_called_once()

    def test_reporte_estudios_por_tipo_delega(self):
        self.svc.reporte_estudios_por_tipo()
        self.repo.reporte_estudios_por_tipo.assert_called_once()

    def test_reporte_pagos_exentos_delega(self):
        self.svc.reporte_pagos_exentos()
        self.repo.reporte_pagos_exentos.assert_called_once()

    def test_reporte_consolidado_mensual_delega(self):
        self.svc.reporte_consolidado_mensual()
        self.repo.reporte_consolidado_mensual.assert_called_once()

    def test_historial_reportes_delega(self):
        self.svc.historial_reportes()
        self.repo.historial_reportes.assert_called_once()

    def test_reporte_por_ciudad_delega(self):
        self.svc.reporte_por_ciudad()
        self.repo.reporte_por_ciudad.assert_called_once()

    def test_indicadores_desempeno_delega(self):
        self.svc.indicadores_desempeno()
        self.repo.indicadores_desempeno.assert_called_once()

    def test_reporte_pagos_por_metodo_delega(self):
        self.svc.reporte_pagos_por_metodo()
        self.repo.reporte_pagos_por_metodo.assert_called_once()


class TestReportesModuleFunctions:
    def setup_method(self):
        self.repo = _make_repo()
        configure_service(ReportesService(self.repo))

    def teardown_method(self):
        uc_mod._service = None

    def test_reporte_por_genero(self):
        reporte_por_genero()
        self.repo.reporte_por_genero.assert_called_once()

    def test_reporte_por_etapa_vida(self):
        reporte_por_etapa_vida()
        self.repo.reporte_por_etapa_vida.assert_called_once()

    def test_reporte_por_tipo_espina(self):
        reporte_por_tipo_espina()
        self.repo.reporte_por_tipo_espina.assert_called_once()

    def test_reporte_por_estado(self):
        reporte_por_estado()
        self.repo.reporte_por_estado.assert_called_once()

    def test_reporte_resumen(self):
        reporte_resumen()
        self.repo.reporte_resumen.assert_called_once()

    def test_reporte_servicios_por_tipo(self):
        reporte_servicios_por_tipo()
        self.repo.reporte_servicios_por_tipo.assert_called_once()

    def test_reporte_estudios_por_tipo(self):
        reporte_estudios_por_tipo()
        self.repo.reporte_estudios_por_tipo.assert_called_once()

    def test_reporte_pagos_exentos(self):
        reporte_pagos_exentos()
        self.repo.reporte_pagos_exentos.assert_called_once()

    def test_reporte_consolidado_mensual(self):
        reporte_consolidado_mensual()
        self.repo.reporte_consolidado_mensual.assert_called_once()

    def test_historial_reportes(self):
        historial_reportes()
        self.repo.historial_reportes.assert_called_once()

    def test_reporte_por_ciudad(self):
        reporte_por_ciudad()
        self.repo.reporte_por_ciudad.assert_called_once()

    def test_indicadores_desempeno(self):
        indicadores_desempeno()
        self.repo.indicadores_desempeno.assert_called_once()

    def test_reporte_pagos_por_metodo(self):
        reporte_pagos_por_metodo()
        self.repo.reporte_pagos_por_metodo.assert_called_once()


class TestReportesServiceUnconfigured:
    def setup_method(self):
        uc_mod._service = None

    def teardown_method(self):
        uc_mod._service = None

    def test_svc_raises_cuando_no_configurado(self):
        with pytest.raises(RuntimeError, match="reportes service is not configured"):
            reporte_por_genero()
