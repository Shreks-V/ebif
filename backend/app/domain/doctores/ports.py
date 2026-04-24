from typing import Any, Protocol


class DoctoresRepository(Protocol):
    def doctor_del_dia(self, current_user: dict | None = None) -> dict: ...

    def listar_doctores(
        self,
        current_user: dict | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]: ...

    def obtener_disponibilidad_semana(
        self,
        current_user: dict | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[dict]: ...

    def obtener_doctor(self, id_doctor: int, current_user: dict | None = None) -> dict: ...

    def crear_doctor(self, data: Any, current_user: dict | None = None) -> dict: ...

    def actualizar_doctor(self, id_doctor: int, data: Any, current_user: dict | None = None) -> dict: ...

    def desactivar_doctor(self, id_doctor: int, current_user: dict | None = None) -> None: ...

    def obtener_disponibilidad(
        self,
        id_doctor: int,
        current_user: dict | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[dict]: ...

    def crear_disponibilidad(self, id_doctor: int, data: Any, current_user: dict | None = None) -> dict: ...

    def eliminar_disponibilidad(
        self,
        id_doctor: int,
        id_disponibilidad: int,
        current_user: dict | None = None,
    ) -> None: ...

    def obtener_servicios_doctor(self, id_doctor: int, current_user: dict | None = None) -> list[dict]: ...
