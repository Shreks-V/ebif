"""Tests for PreregistroService — verifies delegation and data normalization."""
from unittest.mock import MagicMock
import pytest

from app.application.preregistro.dtos import PreRegistroCreate
from app.domain.preregistro.entities import UploadedFile
import app.application.preregistro.use_cases as uc_mod
from app.application.preregistro.use_cases import (
    PreregistroService,
    configure_service,
    listar_preregistros,
    crear_preregistro,
    listar_tipos_espina_publico,
    listar_tipos_documento_publico,
    check_curp_disponible,
    obtener_preregistro,
    actualizar_preregistro,
    aprobar_preregistro,
    subir_documento,
    listar_documentos,
    obtener_documento_archivo,
    eliminar_documento,
    rechazar_preregistro,
)

_VALID_CURP = "AABA010101HNLBCD09"


def _make_data(**kw):
    defaults = dict(nombre="Ada", apellido_paterno="Lovelace", curp=_VALID_CURP, tipos_espina=[1])
    defaults.update(kw)
    return PreRegistroCreate(**defaults)


class TestPreregistroServiceClass:
    def setup_method(self):
        self.repo = MagicMock()
        self.svc = PreregistroService(self.repo)

    def test_listar_delega_al_repo(self):
        self.repo.listar_preregistros.return_value = []
        assert self.svc.listar_preregistros() == []
        self.repo.listar_preregistros.assert_called_once()

    def test_crear_normaliza_espacios_y_curp(self):
        data = _make_data(nombre="  Ada  ", apellido_paterno="  Lovelace  ")
        self.repo.crear_preregistro.return_value = MagicMock()
        self.svc.crear_preregistro(data)
        sent = self.repo.crear_preregistro.call_args[0][0]
        assert sent.nombre == "Ada"
        assert sent.apellido_paterno == "Lovelace"
        assert sent.curp == _VALID_CURP

    def test_listar_tipos_espina_publico_delega(self):
        self.repo.listar_tipos_espina_publico.return_value = [{'id': 1}]
        assert self.svc.listar_tipos_espina_publico() == [{'id': 1}]

    def test_listar_tipos_documento_publico_delega(self):
        self.repo.listar_tipos_documento_publico.return_value = []
        assert self.svc.listar_tipos_documento_publico() == []

    def test_check_curp_disponible_normaliza_y_delega(self):
        self.repo.check_curp_disponible.return_value = {'disponible': True}
        self.svc.check_curp_disponible(f'  {_VALID_CURP.lower()}  ')
        self.repo.check_curp_disponible.assert_called_once_with(_VALID_CURP)

    def test_obtener_preregistro_delega(self):
        self.repo.obtener_preregistro.return_value = MagicMock()
        self.svc.obtener_preregistro(1)
        self.repo.obtener_preregistro.assert_called_once_with(1)

    def test_actualizar_preregistro_delega(self):
        self.repo.actualizar_preregistro.return_value = MagicMock()
        self.svc.actualizar_preregistro(1, _make_data())
        self.repo.actualizar_preregistro.assert_called_once()

    def test_aprobar_preregistro_delega(self):
        self.repo.aprobar_preregistro.return_value = {'message': 'ok'}
        assert self.svc.aprobar_preregistro(1, 'CUOTA A') == {'message': 'ok'}

    def test_subir_documento_construye_uploaded_file(self):
        self.repo.subir_documento.return_value = {'id_documento': 5}
        self.svc.subir_documento(1, 2, 'doc.pdf', b'bytes', 'application/pdf')
        archivo: UploadedFile = self.repo.subir_documento.call_args[0][2]
        assert archivo.filename == 'doc.pdf'
        assert archivo.content == b'bytes'
        assert archivo.content_type == 'application/pdf'

    def test_listar_documentos_delega(self):
        self.repo.listar_documentos.return_value = []
        assert self.svc.listar_documentos(1) == []

    def test_obtener_documento_archivo_delega(self):
        self.repo.obtener_documento_archivo.return_value = MagicMock()
        self.svc.obtener_documento_archivo(1, 2)
        self.repo.obtener_documento_archivo.assert_called_once_with(1, 2)

    def test_eliminar_documento_delega(self):
        self.repo.eliminar_documento.return_value = {'message': 'deleted'}
        assert self.svc.eliminar_documento(1, 2) == {'message': 'deleted'}

    def test_rechazar_preregistro_delega(self):
        self.repo.rechazar_preregistro.return_value = {'message': 'rechazado'}
        assert self.svc.rechazar_preregistro(1) == {'message': 'rechazado'}


class TestPreregistroModuleFunctions:
    def setup_method(self):
        self.repo = MagicMock()
        self.repo.listar_preregistros.return_value = []
        self.repo.crear_preregistro.return_value = MagicMock()
        self.repo.listar_tipos_espina_publico.return_value = []
        self.repo.listar_tipos_documento_publico.return_value = []
        self.repo.check_curp_disponible.return_value = {'disponible': True}
        self.repo.obtener_preregistro.return_value = MagicMock()
        self.repo.actualizar_preregistro.return_value = MagicMock()
        self.repo.aprobar_preregistro.return_value = {'message': 'ok'}
        self.repo.subir_documento.return_value = {'id_documento': 1}
        self.repo.listar_documentos.return_value = []
        self.repo.obtener_documento_archivo.return_value = MagicMock()
        self.repo.eliminar_documento.return_value = {'message': 'ok'}
        self.repo.rechazar_preregistro.return_value = {'message': 'ok'}
        configure_service(PreregistroService(self.repo))

    def teardown_method(self):
        uc_mod._service = None

    def test_listar_preregistros(self):
        assert listar_preregistros() == []

    def test_crear_preregistro(self):
        crear_preregistro(_make_data())
        self.repo.crear_preregistro.assert_called_once()

    def test_listar_tipos_espina_publico(self):
        assert listar_tipos_espina_publico() == []

    def test_listar_tipos_documento_publico(self):
        assert listar_tipos_documento_publico() == []

    def test_check_curp_disponible(self):
        assert check_curp_disponible(_VALID_CURP) == {'disponible': True}

    def test_obtener_preregistro(self):
        obtener_preregistro(1)
        self.repo.obtener_preregistro.assert_called_once()

    def test_actualizar_preregistro(self):
        actualizar_preregistro(1, _make_data())
        self.repo.actualizar_preregistro.assert_called_once()

    def test_aprobar_preregistro(self):
        assert aprobar_preregistro(1) == {'message': 'ok'}

    def test_subir_documento(self):
        subir_documento(1, 2, 'f.pdf', b'data', 'application/pdf')
        self.repo.subir_documento.assert_called_once()

    def test_listar_documentos(self):
        assert listar_documentos(1) == []

    def test_obtener_documento_archivo(self):
        obtener_documento_archivo(1, 2)
        self.repo.obtener_documento_archivo.assert_called_once()

    def test_eliminar_documento(self):
        assert eliminar_documento(1, 2) == {'message': 'ok'}

    def test_rechazar_preregistro(self):
        assert rechazar_preregistro(1) == {'message': 'ok'}


class TestPreregistroServiceUnconfigured:
    def setup_method(self):
        uc_mod._service = None

    def teardown_method(self):
        uc_mod._service = None

    def test_svc_raises_cuando_no_configurado(self):
        with pytest.raises(RuntimeError, match="preregistro service is not configured"):
            listar_preregistros()
