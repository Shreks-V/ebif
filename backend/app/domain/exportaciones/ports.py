from typing import Protocol

from app.domain.exportaciones.entities import FilePayload
from app.domain.shared.current_user import CurrentUser


class ExportacionesRepository(Protocol):
    def exportar_reporte_pdf(
        self,
        tipo: str = "resumen",
        genero: str | None = None,
        estado: str | None = None,
        tipo_espina: int | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        mes: int | None = None,
        anio: int | None = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload: ...

    def exportar_beneficiario_pdf(self, folio: str, current_user: dict | None = None) -> FilePayload: ...

    def exportar_credencial_pdf(self, folio: str, current_user: dict | None = None) -> FilePayload: ...

    def exportar_comprobante_cita(self, id_cita: int, current_user: dict | None = None) -> FilePayload: ...

    def exportar_contrato_comodato(self, id_comodato: int, current_user: dict | None = None) -> FilePayload: ...

    def exportar_beneficiarios_excel(
        self,
        genero: str | None = None,
        estado: str | None = None,
        membresia_estatus: str | None = None,
        busqueda: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload: ...

    def exportar_reporte_excel(
        self,
        tipo: str = "resumen",
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        mes: int | None = None,
        anio: int | None = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload: ...
