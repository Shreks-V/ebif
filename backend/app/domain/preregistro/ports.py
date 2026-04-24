from typing import Any, Optional, Protocol


class PreregistroRepository(Protocol):
    def listar_preregistros(
        self,
        estatus: Optional[str] = None,
        current_user: dict | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def crear_preregistro(self, data: Any) -> dict: ...

    def listar_tipos_espina_publico(self) -> list[dict]: ...

    def listar_tipos_documento_publico(self) -> list[dict]: ...

    def obtener_preregistro(self, id_paciente: int) -> dict: ...

    def actualizar_preregistro(self, id_paciente: int, data: Any) -> dict: ...

    def aprobar_preregistro(
        self,
        id_paciente: int,
        tipo_cuota: Optional[str] = None,
        current_user: dict | None = None,
    ) -> dict: ...

    async def subir_documento(
        self,
        id_paciente: int,
        id_tipo_documento: int,
        archivo: Any,
        current_user: dict | None = None,
    ) -> dict: ...

    def listar_documentos(self, id_paciente: int, limit: int = 100, offset: int = 0) -> list[dict]: ...

    def obtener_documento_archivo(self, id_paciente: int, id_documento: int) -> Any: ...

    def eliminar_documento(self, id_paciente: int, id_documento: int) -> None: ...

    def rechazar_preregistro(self, id_paciente: int, current_user: dict | None = None) -> dict: ...
