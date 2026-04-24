from typing import Any, Optional, Protocol


class RecibosRepository(Protocol):
    def stats_ventas(self, current_user: dict | None = None) -> dict: ...

    def listar_metodos_pago(self, current_user: dict | None = None) -> list[dict]: ...

    def listar_ventas(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        id_paciente: Optional[int] = None,
        search: Optional[str] = None,
        current_user: dict | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def crear_venta(self, data: Any, current_user: dict | None = None) -> dict: ...

    def obtener_venta(self, id_venta: int, current_user: dict | None = None) -> dict: ...

    def cancelar_venta(
        self,
        id_venta: int,
        motivo: Optional[str] = None,
        current_user: dict | None = None,
    ) -> dict: ...

    def registrar_pago(
        self,
        id_venta: int,
        id_metodo_pago: int,
        monto: float,
        current_user: dict | None = None,
    ) -> dict: ...
