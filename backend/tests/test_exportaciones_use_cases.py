"""Tests for ExportacionesService — verifies delegation to repository."""
from unittest.mock import MagicMock
import pytest

import app.application.exportaciones.use_cases as uc_mod
from app.application.exportaciones.use_cases import (
    ExportacionesService,
    configure_service,
    exportar_reporte_pdf,
    exportar_beneficiario_pdf,
    exportar_credencial_pdf,
    exportar_comprobante_cita,
    exportar_contrato_comodato,
    exportar_beneficiarios_excel,
    exportar_reporte_excel,
)

_ALL_METHODS = [
    'exportar_reporte_pdf', 'exportar_beneficiario_pdf', 'exportar_credencial_pdf',
    'exportar_comprobante_cita', 'exportar_contrato_comodato',
    'exportar_beneficiarios_excel', 'exportar_reporte_excel',
]


def _make_repo():
    repo = MagicMock()
    for m in _ALL_METHODS:
        getattr(repo, m).return_value = b'pdf-bytes'
    return repo


class TestExportacionesServiceClass:
    def setup_method(self):
        self.repo = _make_repo()
        self.svc = ExportacionesService(self.repo)

    def test_exportar_reporte_pdf_delega(self):
        self.svc.exportar_reporte_pdf()
        self.repo.exportar_reporte_pdf.assert_called_once()

    def test_exportar_beneficiario_pdf_delega(self):
        self.svc.exportar_beneficiario_pdf('BEN-000001')
        self.repo.exportar_beneficiario_pdf.assert_called_once()

    def test_exportar_credencial_pdf_delega(self):
        self.svc.exportar_credencial_pdf('BEN-000001')
        self.repo.exportar_credencial_pdf.assert_called_once()

    def test_exportar_comprobante_cita_delega(self):
        self.svc.exportar_comprobante_cita(1)
        self.repo.exportar_comprobante_cita.assert_called_once_with(1, None)

    def test_exportar_contrato_comodato_delega(self):
        self.svc.exportar_contrato_comodato(5)
        self.repo.exportar_contrato_comodato.assert_called_once_with(5, None)

    def test_exportar_beneficiarios_excel_delega(self):
        self.svc.exportar_beneficiarios_excel()
        self.repo.exportar_beneficiarios_excel.assert_called_once()

    def test_exportar_reporte_excel_delega(self):
        self.svc.exportar_reporte_excel()
        self.repo.exportar_reporte_excel.assert_called_once()


class TestExportacionesModuleFunctions:
    def setup_method(self):
        self.repo = _make_repo()
        configure_service(ExportacionesService(self.repo))

    def teardown_method(self):
        uc_mod._service = None

    def test_exportar_reporte_pdf(self):
        exportar_reporte_pdf()
        self.repo.exportar_reporte_pdf.assert_called_once()

    def test_exportar_beneficiario_pdf(self):
        exportar_beneficiario_pdf('BEN-000001')
        self.repo.exportar_beneficiario_pdf.assert_called_once()

    def test_exportar_credencial_pdf(self):
        exportar_credencial_pdf('BEN-000001')
        self.repo.exportar_credencial_pdf.assert_called_once()

    def test_exportar_comprobante_cita(self):
        exportar_comprobante_cita(1)
        self.repo.exportar_comprobante_cita.assert_called_once()

    def test_exportar_contrato_comodato(self):
        exportar_contrato_comodato(5)
        self.repo.exportar_contrato_comodato.assert_called_once()

    def test_exportar_beneficiarios_excel(self):
        exportar_beneficiarios_excel()
        self.repo.exportar_beneficiarios_excel.assert_called_once()

    def test_exportar_reporte_excel(self):
        exportar_reporte_excel()
        self.repo.exportar_reporte_excel.assert_called_once()


class TestExportacionesServiceUnconfigured:
    def setup_method(self):
        uc_mod._service = None

    def teardown_method(self):
        uc_mod._service = None

    def test_svc_raises_cuando_no_configurado(self):
        with pytest.raises(RuntimeError, match="exportaciones service is not configured"):
            exportar_reporte_pdf()
