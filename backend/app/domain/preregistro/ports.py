from typing import Protocol

from app.domain.preregistro.entities import (
    DocumentoPaciente, PreRegistroInput, Preregistro, UploadedFile,
)
from app.domain.shared.current_user import CurrentUser


class PreregistroRepository(Protocol):
    def listar_preregistros(
        self,
        estatus: str | None = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Preregistro]: ...

    def crear_preregistro(self, data: PreRegistroInput) -> Preregistro: ...

    def listar_tipos_espina_publico(self) -> list[dict]: ...

    def listar_tipos_documento_publico(self) -> list[dict]: ...

    def obtener_preregistro(self, id_paciente: int) -> Preregistro: ...

    def actualizar_preregistro(self, id_paciente: int, data: PreRegistroInput) -> Preregistro: ...

    def aprobar_preregistro(
        self,
        id_paciente: int,
        tipo_cuota: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def subir_documento(
        self,
        id_paciente: int,
        id_tipo_documento: int,
        archivo: UploadedFile,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def listar_documentos(self, id_paciente: int, limit: int = 100, offset: int = 0) -> list[DocumentoPaciente]: ...

    def obtener_documento_archivo(self, id_paciente: int, id_documento: int) -> UploadedFile: ...

    def eliminar_documento(self, id_paciente: int, id_documento: int) -> dict: ...

    def rechazar_preregistro(self, id_paciente: int, current_user: CurrentUser | None = None) -> dict: ...

    def check_curp_disponible(self, curp: str) -> dict: ...
