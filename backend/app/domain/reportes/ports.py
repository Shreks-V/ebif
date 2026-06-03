from typing import Protocol

from app.domain.reportes.entities import HistorialReporte
from app.domain.shared.current_user import CurrentUser


class ReportesRepository(Protocol):
    def reporte_por_genero(
        self,
        genero: str | None = None,
        estado: str | None = None,
        tipo_espina: int | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_por_etapa_vida(
        self,
        genero: str | None = None,
        estado: str | None = None,
        tipo_espina: int | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_por_tipo_espina(
        self,
        genero: str | None = None,
        estado: str | None = None,
        tipo_espina: int | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_por_estado(
        self,
        genero: str | None = None,
        estado: str | None = None,
        tipo_espina: int | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_resumen(
        self,
        genero: str | None = None,
        estado: str | None = None,
        tipo_espina: int | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_servicios_por_tipo(
        self,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_estudios_por_tipo(
        self,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_pagos_exentos(
        self,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_consolidado_mensual(
        self,
        mes: int | None = None,
        anio: int | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def historial_reportes(
        self,
        tipo_reporte: str | None = None,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[HistorialReporte]: ...

    def reporte_por_ciudad(self, current_user: CurrentUser | None = None) -> dict: ...

    def indicadores_desempeno(
        self,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_pagos_por_metodo(self, fecha_inicio: str | None = None, fecha_fin: str | None = None, current_user: CurrentUser | None = None) -> dict: ...

    def asistencia_mensual_historico(self, meses: int = 12, current_user: CurrentUser | None = None) -> dict: ...
