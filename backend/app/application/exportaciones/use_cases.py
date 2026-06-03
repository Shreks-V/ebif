from app.domain.exportaciones.ports import ExportacionesRepository
from app.domain.shared.current_user import CurrentUser

_service: "ExportacionesService | None" = None


class ExportacionesService:
    def __init__(self, repository: ExportacionesRepository) -> None:
        self._repository = repository

    def exportar_reporte_pdf(self, tipo: str = "resumen", genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, mes: int | None = None, anio: int | None = None, current_user: CurrentUser | None = None):
        return self._repository.exportar_reporte_pdf(tipo, genero, estado, tipo_espina, fecha_inicio, fecha_fin, mes, anio, current_user)

    def exportar_beneficiario_pdf(self, folio: str, current_user: CurrentUser | None = None):
        return self._repository.exportar_beneficiario_pdf(folio, current_user)

    def exportar_credencial_pdf(self, folio: str, current_user: CurrentUser | None = None):
        return self._repository.exportar_credencial_pdf(folio, current_user)

    def exportar_comprobante_cita(self, id_cita: int, current_user: CurrentUser | None = None):
        return self._repository.exportar_comprobante_cita(id_cita, current_user)

    def exportar_contrato_comodato(self, id_comodato: int, current_user: CurrentUser | None = None):
        return self._repository.exportar_contrato_comodato(id_comodato, current_user)

    def exportar_beneficiarios_excel(self, genero: str | None = None, estado: str | None = None, membresia_estatus: str | None = None, busqueda: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.exportar_beneficiarios_excel(genero, estado, membresia_estatus, busqueda, current_user)

    def exportar_reporte_excel(self, tipo: str = "resumen", fecha_inicio: str | None = None, fecha_fin: str | None = None, mes: int | None = None, anio: int | None = None, current_user: CurrentUser | None = None):
        return self._repository.exportar_reporte_excel(tipo, fecha_inicio, fecha_fin, mes, anio, current_user)


def configure_service(service: ExportacionesService) -> None:
    global _service
    _service = service


def _svc() -> ExportacionesService:
    if _service is None:
        raise RuntimeError("exportaciones service is not configured")
    return _service


def exportar_reporte_pdf(tipo: str = "resumen", genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, mes: int | None = None, anio: int | None = None, current_user: CurrentUser | None = None):
    return _svc().exportar_reporte_pdf(tipo, genero, estado, tipo_espina, fecha_inicio, fecha_fin, mes, anio, current_user)

def exportar_beneficiario_pdf(folio: str, current_user: CurrentUser | None = None):
    return _svc().exportar_beneficiario_pdf(folio, current_user)

def exportar_credencial_pdf(folio: str, current_user: CurrentUser | None = None):
    return _svc().exportar_credencial_pdf(folio, current_user)

def exportar_comprobante_cita(id_cita: int, current_user: CurrentUser | None = None):
    return _svc().exportar_comprobante_cita(id_cita, current_user)

def exportar_contrato_comodato(id_comodato: int, current_user: CurrentUser | None = None):
    return _svc().exportar_contrato_comodato(id_comodato, current_user)

def exportar_beneficiarios_excel(genero: str | None = None, estado: str | None = None, membresia_estatus: str | None = None, busqueda: str | None = None, current_user: CurrentUser | None = None):
    return _svc().exportar_beneficiarios_excel(genero, estado, membresia_estatus, busqueda, current_user)

def exportar_reporte_excel(tipo: str = "resumen", fecha_inicio: str | None = None, fecha_fin: str | None = None, mes: int | None = None, anio: int | None = None, current_user: CurrentUser | None = None):
    return _svc().exportar_reporte_excel(tipo, fecha_inicio, fecha_fin, mes, anio, current_user)
