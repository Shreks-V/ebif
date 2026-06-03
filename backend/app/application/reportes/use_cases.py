from app.domain.reportes.ports import ReportesRepository
from app.domain.shared.current_user import CurrentUser

_service: "ReportesService | None" = None


class ReportesService:
    def __init__(self, repository: ReportesRepository) -> None:
        self._repository = repository

    def reporte_por_genero(self, genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_etapa_vida(self, genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_tipo_espina(self, genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_estado(self, genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_resumen(self, genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_servicios_por_tipo(self, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

    def reporte_estudios_por_tipo(self, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

    def reporte_pagos_exentos(self, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

    def reporte_consolidado_mensual(self, mes: int | None = None, anio: int | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_consolidado_mensual(mes, anio, current_user)

    def historial_reportes(self, tipo_reporte: str | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)

    def reporte_por_ciudad(self, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_ciudad(current_user)

    def indicadores_desempeno(self, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.indicadores_desempeno(fecha_inicio, fecha_fin, current_user)

    def reporte_pagos_por_metodo(self, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_pagos_por_metodo(fecha_inicio, fecha_fin, current_user)

    def asistencia_mensual_historico(self, meses: int = 12, current_user: CurrentUser | None = None):
        return self._repository.asistencia_mensual_historico(meses, current_user)


def configure_service(service: ReportesService) -> None:
    global _service
    _service = service


def _svc() -> ReportesService:
    if _service is None:
        raise RuntimeError("reportes service is not configured")
    return _service


def reporte_por_genero(genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_etapa_vida(genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_tipo_espina(genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_estado(genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_resumen(genero: str | None = None, estado: str | None = None, tipo_espina: int | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_servicios_por_tipo(fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

def reporte_estudios_por_tipo(fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

def reporte_pagos_exentos(fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

def reporte_consolidado_mensual(mes: int | None = None, anio: int | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_consolidado_mensual(mes, anio, current_user)

def historial_reportes(tipo_reporte: str | None = None, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)

def reporte_por_ciudad(current_user: CurrentUser | None = None):
    return _svc().reporte_por_ciudad(current_user)

def indicadores_desempeno(fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().indicadores_desempeno(fecha_inicio, fecha_fin, current_user)

def reporte_pagos_por_metodo(fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None):
    return _svc().reporte_pagos_por_metodo(fecha_inicio, fecha_fin, current_user)

def asistencia_mensual_historico(meses: int = 12, current_user: CurrentUser | None = None):
    return _svc().asistencia_mensual_historico(meses, current_user)
