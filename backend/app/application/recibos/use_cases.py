from app.application.recibos.dtos import VentaCreate
from app.domain.recibos.ports import RecibosRepository
from app.domain.shared.current_user import CurrentUser
from app.domain.exceptions import ValidationError

_service: "RecibosService | None" = None


class RecibosService:
    def __init__(self, repository: RecibosRepository) -> None:
        self._repository = repository

    def stats_ventas(self, current_user: CurrentUser | None = None):
        return self._repository.stats_ventas(current_user)

    def listar_metodos_pago(self, current_user: CurrentUser | None = None):
        return self._repository.listar_metodos_pago(current_user)

    def listar_ventas(self, fecha_inicio: str | None = None, fecha_fin: str | None = None, id_paciente: int | None = None, search: str | None = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0, solo_adeudos: bool = False):
        return self._repository.listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset, solo_adeudos)

    def crear_venta(self, data: VentaCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_venta(data, current_user)

    def obtener_venta(self, id_venta: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_venta(id_venta, current_user)

    def cancelar_venta(self, id_venta: int, motivo: str | None = None, current_user: CurrentUser | None = None):
        if not motivo or not motivo.strip():
            raise ValidationError('Se requiere un motivo para cancelar el recibo')
        return self._repository.cancelar_venta(id_venta, motivo.strip(), current_user)

    def registrar_pago(self, id_venta: int, id_metodo_pago: int, monto: float, current_user: CurrentUser | None = None):
        if monto <= 0:
            raise ValidationError('El monto del pago debe ser mayor a cero')
        if id_metodo_pago <= 0:
            raise ValidationError('Debe seleccionarse un método de pago válido')
        return self._repository.registrar_pago(id_venta, id_metodo_pago, monto, current_user)

    def exentar_venta(self, id_venta: int, nota: str | None = None, current_user: CurrentUser | None = None):
        nota_limpia = nota.strip() if nota else None
        return self._repository.exentar_venta(id_venta, nota_limpia, current_user)

    def listar_items_venta(self, id_venta: int, current_user: CurrentUser | None = None):
        return self._repository.listar_items_venta(id_venta, current_user)


def configure_service(service: RecibosService) -> None:
    global _service
    _service = service


def _svc() -> RecibosService:
    if _service is None:
        raise RuntimeError("recibos service is not configured")
    return _service


def stats_ventas(current_user: CurrentUser | None = None):
    return _svc().stats_ventas(current_user)

def listar_metodos_pago(current_user: CurrentUser | None = None):
    return _svc().listar_metodos_pago(current_user)

def listar_ventas(fecha_inicio: str | None = None, fecha_fin: str | None = None, id_paciente: int | None = None, search: str | None = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0, solo_adeudos: bool = False):
    return _svc().listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset, solo_adeudos)

def crear_venta(data: VentaCreate, current_user: CurrentUser | None = None):
    return _svc().crear_venta(data, current_user)

def obtener_venta(id_venta: int, current_user: CurrentUser | None = None):
    return _svc().obtener_venta(id_venta, current_user)

def cancelar_venta(id_venta: int, motivo: str | None = None, current_user: CurrentUser | None = None):
    return _svc().cancelar_venta(id_venta, motivo, current_user)

def registrar_pago(id_venta: int, id_metodo_pago: int, monto: float, current_user: CurrentUser | None = None):
    return _svc().registrar_pago(id_venta, id_metodo_pago, monto, current_user)

def exentar_venta(id_venta: int, nota: str | None = None, current_user: CurrentUser | None = None):
    return _svc().exentar_venta(id_venta, nota, current_user)

def listar_items_venta(id_venta: int, current_user: CurrentUser | None = None):
    return _svc().listar_items_venta(id_venta, current_user)
