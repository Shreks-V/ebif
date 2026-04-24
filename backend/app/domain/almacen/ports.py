from typing import Any, Optional, Protocol


class AlmacenRepository(Protocol):
    def listar_productos(
        self,
        tipo_producto: Optional[str] = None,
        busqueda: Optional[str] = None,
        activo: Optional[str] = None,
        current_user: dict | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def obtener_producto(self, id_producto: int, current_user: dict | None = None) -> dict: ...

    def crear_producto(self, data: Any, current_user: dict | None = None) -> dict: ...

    def actualizar_producto(self, id_producto: int, data: Any, current_user: dict | None = None) -> dict: ...

    def desactivar_producto(self, id_producto: int, current_user: dict | None = None) -> None: ...

    def listar_servicios(
        self,
        busqueda: Optional[str] = None,
        activo: Optional[str] = None,
        current_user: dict | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def obtener_servicio(self, id_servicio: int, current_user: dict | None = None) -> dict: ...

    def crear_servicio(self, data: Any, current_user: dict | None = None) -> dict: ...

    def actualizar_servicio(self, id_servicio: int, data: Any, current_user: dict | None = None) -> dict: ...

    def desactivar_servicio(self, id_servicio: int, current_user: dict | None = None) -> None: ...

    def listar_comodatos(
        self,
        estatus: Optional[str] = None,
        busqueda: Optional[str] = None,
        current_user: dict | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def obtener_comodato(self, id_comodato: int, current_user: dict | None = None) -> dict: ...

    def crear_comodato(self, data: Any, current_user: dict | None = None) -> dict: ...

    def actualizar_comodato(self, id_comodato: int, data: Any, current_user: dict | None = None) -> dict: ...

    def listar_movimientos(
        self,
        id_producto: Optional[int] = None,
        tipo_movimiento: Optional[str] = None,
        current_user: dict | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def almacen_stats(self, current_user: dict | None = None) -> dict: ...

    def ajustar_existencia(
        self,
        id_producto: int,
        stock_nuevo: int,
        motivo: str,
        current_user: dict | None = None,
    ) -> dict: ...
