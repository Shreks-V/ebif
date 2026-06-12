from app.application.beneficiarios.dtos import BeneficiarioCreate, RenovarMembresiaCreate
from app.domain.beneficiarios.ports import BeneficiariosRepository
from app.domain.shared.current_user import CurrentUser
from app.domain.exceptions import ValidationError

_service: "BeneficiariosService | None" = None


class BeneficiariosService:
    def __init__(self, repository: BeneficiariosRepository) -> None:
        self._repository = repository

    def listar_tipos_espina(self, current_user: CurrentUser | None = None):
        return self._repository.listar_tipos_espina(current_user)

    def stats_beneficiarios(self, current_user: CurrentUser | None = None):
        return self._repository.stats_beneficiarios(current_user)

    def dashboard_stats(self, current_user: CurrentUser | None = None):
        return self._repository.dashboard_stats(current_user)

    def listar_beneficiarios(self, nombre: str | None = None, estado: str | None = None, genero: str | None = None, busqueda: str | None = None, membresia_estatus: str | None = None, tipo_cuota: str | None = None, activo: str | None = 'S', current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, activo, current_user, limit, offset)

    def obtener_beneficiario(self, folio: str, current_user: CurrentUser | None = None):
        if not folio or not folio.strip():
            raise ValidationError('El folio del beneficiario es requerido')
        return self._repository.obtener_beneficiario(folio.strip(), current_user)

    def crear_beneficiario(self, data: BeneficiarioCreate, current_user: CurrentUser | None = None):
        normalized = self._normalize_beneficiario(data)
        return self._repository.crear_beneficiario(normalized, current_user)

    def actualizar_beneficiario(self, folio: str, data: BeneficiarioCreate, current_user: CurrentUser | None = None):
        if not folio or not folio.strip():
            raise ValidationError('El folio del beneficiario es requerido')
        normalized = self._normalize_beneficiario(data)
        return self._repository.actualizar_beneficiario(folio, normalized, current_user)

    @staticmethod
    def _normalize_beneficiario(data: BeneficiarioCreate) -> BeneficiarioCreate:
        """Normalize and sanitize beneficiary input before persistence.

        Applied at use-case layer so normalization runs regardless of
        whether the call originates from the HTTP API, a scheduler, or a test.
        """
        updates: dict = {
            'nombre': data.nombre.strip(),
            'apellido_paterno': data.apellido_paterno.strip(),
            'curp': data.curp.strip().upper() if data.curp else data.curp,
        }
        if data.apellido_materno is not None:
            updates['apellido_materno'] = data.apellido_materno.strip()
        if data.correo_electronico is not None:
            updates['correo_electronico'] = data.correo_electronico.strip().lower()
        return data.model_copy(update=updates)

    def eliminar_beneficiario(self, folio: str, current_user: CurrentUser | None = None):
        return self._repository.eliminar_beneficiario(folio, current_user)

    def reactivar_beneficiario(self, folio: str, current_user: CurrentUser | None = None):
        if not folio or not folio.strip():
            raise ValidationError('El folio del beneficiario es requerido')
        return self._repository.reactivar_beneficiario(folio.strip(), current_user)

    def historial_beneficiario(self, folio: str, current_user: CurrentUser | None = None, limit_citas: int = 100, offset_citas: int = 0, limit_pagos: int = 100, offset_pagos: int = 0, limit_comodatos: int = 100, offset_comodatos: int = 0):
        return self._repository.historial_beneficiario(folio, current_user, limit_citas, offset_citas, limit_pagos, offset_pagos, limit_comodatos, offset_comodatos)

    def listar_membresias_proximas_a_vencer(self, dias: int = 30, current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
        return self._repository.listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

    def renovar_membresia(self, folio: str, data: RenovarMembresiaCreate, current_user: CurrentUser | None = None):
        return self._repository.renovar_membresia(folio, data.model_dump(), current_user)

    def mapa_beneficiarios(self, current_user: CurrentUser | None = None):
        return self._repository.mapa_beneficiarios(current_user)

    def expirar_membresias_vencidas(self) -> int:
        return self._repository.expirar_membresias_vencidas()


def configure_service(service: BeneficiariosService) -> None:
    global _service
    _service = service


def _svc() -> BeneficiariosService:
    if _service is None:
        raise RuntimeError("beneficiarios service is not configured")
    return _service


def listar_tipos_espina(current_user: CurrentUser | None = None):
    return _svc().listar_tipos_espina(current_user)

def stats_beneficiarios(current_user: CurrentUser | None = None):
    return _svc().stats_beneficiarios(current_user)

def dashboard_stats(current_user: CurrentUser | None = None):
    return _svc().dashboard_stats(current_user)

def listar_beneficiarios(nombre: str | None = None, estado: str | None = None, genero: str | None = None, busqueda: str | None = None, membresia_estatus: str | None = None, tipo_cuota: str | None = None, activo: str | None = 'S', current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, activo, current_user, limit, offset)

def obtener_beneficiario(folio: str, current_user: CurrentUser | None = None):
    return _svc().obtener_beneficiario(folio, current_user)

def crear_beneficiario(data: BeneficiarioCreate, current_user: CurrentUser | None = None):
    return _svc().crear_beneficiario(data, current_user)

def actualizar_beneficiario(folio: str, data: BeneficiarioCreate, current_user: CurrentUser | None = None):
    return _svc().actualizar_beneficiario(folio, data, current_user)

def eliminar_beneficiario(folio: str, current_user: CurrentUser | None = None):
    return _svc().eliminar_beneficiario(folio, current_user)

def reactivar_beneficiario(folio: str, current_user: CurrentUser | None = None):
    return _svc().reactivar_beneficiario(folio, current_user)

def historial_beneficiario(folio: str, current_user: CurrentUser | None = None, limit_citas: int = 100, offset_citas: int = 0, limit_pagos: int = 100, offset_pagos: int = 0, limit_comodatos: int = 100, offset_comodatos: int = 0):
    return _svc().historial_beneficiario(folio, current_user, limit_citas, offset_citas, limit_pagos, offset_pagos, limit_comodatos, offset_comodatos)

def listar_membresias_proximas_a_vencer(dias: int = 30, current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
    return _svc().listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

def renovar_membresia(folio: str, data: RenovarMembresiaCreate, current_user: CurrentUser | None = None):
    return _svc().renovar_membresia(folio, data, current_user)

def expirar_membresias_vencidas() -> int:
    return _svc().expirar_membresias_vencidas()

def mapa_beneficiarios(current_user: CurrentUser | None = None):
    return _svc().mapa_beneficiarios(current_user)
