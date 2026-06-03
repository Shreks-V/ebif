from typing import Any, Protocol

from app.domain.recibos.entities import MetodoPago, Venta, VentaLinea
from app.domain.shared.current_user import CurrentUser


class RecibosRepository(Protocol):
    def stats_ventas(self, current_user: CurrentUser | None = None) -> dict: ...

    def listar_metodos_pago(self, current_user: CurrentUser | None = None) -> list[MetodoPago]: ...

    def listar_ventas(
        self,
        fecha_inicio: str | None = None,
        fecha_fin: str | None = None,
        id_paciente: int | None = None,
        search: str | None = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
        solo_adeudos: bool = False,
    ) -> list[Venta]: ...

    def crear_venta(self, data: Any, current_user: CurrentUser | None = None) -> Venta: ...

    def obtener_venta(self, id_venta: int, current_user: CurrentUser | None = None) -> Venta: ...

    def cancelar_venta(
        self,
        id_venta: int,
        motivo: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> Venta: ...

    def registrar_pago(
        self,
        id_venta: int,
        id_metodo_pago: int,
        monto: float,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def exentar_venta(
        self,
        id_venta: int,
        nota: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def listar_items_venta(
        self,
        id_venta: int,
        current_user: CurrentUser | None = None,
    ) -> list[VentaLinea]: ...
