from typing import Any, Protocol

from app.domain.doctores.entities import Disponibilidad, Doctor
from app.domain.shared.current_user import CurrentUser


class DoctoresRepository(Protocol):
    def doctor_del_dia(self, current_user: CurrentUser | None = None) -> Doctor: ...

    def listar_doctores(
        self,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Doctor]: ...

    def obtener_disponibilidad_semana(
        self,
        current_user: CurrentUser | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[Disponibilidad]: ...

    def obtener_doctor(self, id_doctor: int, current_user: CurrentUser | None = None) -> Doctor: ...

    def crear_doctor(self, data: Any, current_user: CurrentUser | None = None) -> Doctor: ...

    def actualizar_doctor(self, id_doctor: int, data: Any, current_user: CurrentUser | None = None) -> Doctor: ...

    def desactivar_doctor(self, id_doctor: int, current_user: CurrentUser | None = None) -> None: ...

    def obtener_disponibilidad(
        self,
        id_doctor: int,
        current_user: CurrentUser | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[Disponibilidad]: ...

    def crear_disponibilidad(self, id_doctor: int, data: Any, current_user: CurrentUser | None = None) -> Disponibilidad: ...

    def eliminar_disponibilidad(
        self,
        id_doctor: int,
        id_disponibilidad: int,
        current_user: CurrentUser | None = None,
    ) -> None: ...

    def obtener_servicios_doctor(self, id_doctor: int, current_user: CurrentUser | None = None) -> list[dict]: ...
