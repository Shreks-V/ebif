from typing import Optional
from app.application.preregistro.dtos import PreRegistroCreate
from app.domain.preregistro.entities import UploadedFile
from app.domain.preregistro.ports import PreregistroRepository
from app.domain.shared.current_user import CurrentUser

_service: "PreregistroService | None" = None


class PreregistroService:
    def __init__(self, repository: PreregistroRepository) -> None:
        self._repository = repository

    def listar_preregistros(self, estatus: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0) -> list[dict]:
        return self._repository.listar_preregistros(estatus, current_user, limit, offset)

    def crear_preregistro(self, data: PreRegistroCreate) -> dict:
        normalized = data.model_copy(update={
            'nombre': data.nombre.strip(),
            'apellido_paterno': data.apellido_paterno.strip(),
            'curp': data.curp.strip().upper() if data.curp else data.curp,
        })
        return self._repository.crear_preregistro(normalized)

    def listar_tipos_espina_publico(self) -> list[dict]:
        return self._repository.listar_tipos_espina_publico()

    def listar_tipos_documento_publico(self) -> list[dict]:
        return self._repository.listar_tipos_documento_publico()

    def check_curp_disponible(self, curp: str) -> dict:
        normalized = (curp or '').strip().upper()
        return self._repository.check_curp_disponible(normalized)

    def obtener_preregistro(self, id_paciente: int) -> dict:
        return self._repository.obtener_preregistro(id_paciente)

    def actualizar_preregistro(self, id_paciente: int, data: PreRegistroCreate) -> dict:
        return self._repository.actualizar_preregistro(id_paciente, data)

    def aprobar_preregistro(self, id_paciente: int, tipo_cuota: str = None, current_user: CurrentUser | None = None) -> dict:
        return self._repository.aprobar_preregistro(id_paciente, tipo_cuota, current_user)

    def subir_documento(self, id_paciente: int, id_tipo_documento: int, filename: str, content: bytes, content_type: str, current_user: CurrentUser | None = None) -> dict:
        archivo = UploadedFile(filename=filename, content=content, content_type=content_type)
        return self._repository.subir_documento(id_paciente, id_tipo_documento, archivo, current_user)

    def listar_documentos(self, id_paciente: int, limit: int = 100, offset: int = 0) -> list[dict]:
        return self._repository.listar_documentos(id_paciente, limit, offset)

    def obtener_documento_archivo(self, id_paciente: int, id_documento: int) -> UploadedFile:
        return self._repository.obtener_documento_archivo(id_paciente, id_documento)

    def eliminar_documento(self, id_paciente: int, id_documento: int) -> dict:
        return self._repository.eliminar_documento(id_paciente, id_documento)

    def rechazar_preregistro(self, id_paciente: int, current_user: CurrentUser | None = None) -> dict:
        return self._repository.rechazar_preregistro(id_paciente, current_user)


def configure_service(service: PreregistroService) -> None:
    global _service
    _service = service


def _svc() -> PreregistroService:
    if _service is None:
        raise RuntimeError("preregistro service is not configured")
    return _service


def listar_preregistros(estatus: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0) -> list[dict]:
    return _svc().listar_preregistros(estatus, current_user, limit, offset)

def crear_preregistro(data: PreRegistroCreate) -> dict:
    return _svc().crear_preregistro(data)

def listar_tipos_espina_publico() -> list[dict]:
    return _svc().listar_tipos_espina_publico()

def listar_tipos_documento_publico() -> list[dict]:
    return _svc().listar_tipos_documento_publico()

def check_curp_disponible(curp: str) -> dict:
    return _svc().check_curp_disponible(curp)

def obtener_preregistro(id_paciente: int) -> dict:
    return _svc().obtener_preregistro(id_paciente)

def actualizar_preregistro(id_paciente: int, data: PreRegistroCreate) -> dict:
    return _svc().actualizar_preregistro(id_paciente, data)

def aprobar_preregistro(id_paciente: int, tipo_cuota: str = None, current_user: CurrentUser | None = None) -> dict:
    return _svc().aprobar_preregistro(id_paciente, tipo_cuota, current_user)

def subir_documento(id_paciente: int, id_tipo_documento: int, filename: str, content: bytes, content_type: str, current_user: CurrentUser | None = None) -> dict:
    return _svc().subir_documento(id_paciente, id_tipo_documento, filename, content, content_type, current_user)

def listar_documentos(id_paciente: int, limit: int = 100, offset: int = 0) -> list[dict]:
    return _svc().listar_documentos(id_paciente, limit, offset)

def obtener_documento_archivo(id_paciente: int, id_documento: int) -> UploadedFile:
    return _svc().obtener_documento_archivo(id_paciente, id_documento)

def eliminar_documento(id_paciente: int, id_documento: int) -> dict:
    return _svc().eliminar_documento(id_paciente, id_documento)

def rechazar_preregistro(id_paciente: int, current_user: CurrentUser | None = None) -> dict:
    return _svc().rechazar_preregistro(id_paciente, current_user)
