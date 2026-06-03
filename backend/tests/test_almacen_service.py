"""
Unit tests for AlmacenService using an in-memory stub repository.

These tests verify that the service correctly delegates to the repository
and that business rules are enforced without touching the database.
"""
import pytest

from app.application.almacen.dtos import AjusteExistenciaRequest, ProductoCreate, ServicioCreate
from app.application.almacen.use_cases import AlmacenService
from app.domain.exceptions import NotFoundError


# ── Stub repository ────────────────────────────────────────────────────────────

class StubAlmacenRepository:
    """In-memory almacén store used by all service tests."""

    def __init__(self):
        self._productos = {}
        self._servicios = {}
        self._next_id = 1

    def _new_id(self):
        _id = self._next_id
        self._next_id += 1
        return _id

    # ── Productos ──

    def listar_productos(self, tipo_producto=None, busqueda=None, activo=None,
                         current_user=None, limit=100, offset=0):
        items = list(self._productos.values())
        if tipo_producto:
            items = [p for p in items if p["tipo_producto"] == tipo_producto]
        if activo:
            items = [p for p in items if p.get("activo") == activo]
        return items[offset: offset + limit]

    def obtener_producto(self, id_producto, current_user=None):
        if id_producto not in self._productos:
            raise NotFoundError(f"Producto {id_producto} no encontrado")
        return self._productos[id_producto]

    def crear_producto(self, data, current_user=None):
        _id = self._new_id()
        producto = {**data.__dict__, "id_producto": _id}
        self._productos[_id] = producto
        return producto

    def actualizar_producto(self, id_producto, data, current_user=None):
        if id_producto not in self._productos:
            raise NotFoundError(f"Producto {id_producto} no encontrado")
        self._productos[id_producto] = {**data.__dict__, "id_producto": id_producto}
        return self._productos[id_producto]

    def desactivar_producto(self, id_producto, current_user=None):
        if id_producto not in self._productos:
            raise NotFoundError(f"Producto {id_producto} no encontrado")
        self._productos[id_producto]["activo"] = "N"

    # ── Servicios ──

    def listar_servicios(self, busqueda=None, activo=None, categoria=None,
                         current_user=None, limit=100, offset=0):
        items = list(self._servicios.values())
        if categoria:
            items = [s for s in items if s.get("categoria") == categoria]
        return items[offset: offset + limit]

    def obtener_servicio(self, id_servicio, current_user=None):
        if id_servicio not in self._servicios:
            raise NotFoundError(f"Servicio {id_servicio} no encontrado")
        return self._servicios[id_servicio]

    def crear_servicio(self, data, current_user=None):
        _id = self._new_id()
        servicio = {**data.__dict__, "id_servicio": _id}
        self._servicios[_id] = servicio
        return servicio

    def actualizar_servicio(self, id_servicio, data, current_user=None):
        if id_servicio not in self._servicios:
            raise NotFoundError(f"Servicio {id_servicio} no encontrado")
        self._servicios[id_servicio] = {**data.__dict__, "id_servicio": id_servicio}
        return self._servicios[id_servicio]

    def desactivar_servicio(self, id_servicio, current_user=None):
        if id_servicio not in self._servicios:
            raise NotFoundError(f"Servicio {id_servicio} no encontrado")
        self._servicios[id_servicio]["activo"] = "N"

    # ── Comodatos / Movimientos / Stats (stubs vacíos) ──

    def listar_comodatos(self, estatus=None, busqueda=None, current_user=None, limit=100, offset=0):
        return []

    def obtener_comodato(self, id_comodato, current_user=None):
        raise NotFoundError(f"Comodato {id_comodato} no encontrado")

    def crear_comodato(self, data, current_user=None):
        return {**data.__dict__, "id_comodato": self._new_id()}

    def actualizar_comodato(self, id_comodato, data, current_user=None):
        return {**data.__dict__, "id_comodato": id_comodato}

    def listar_movimientos(self, id_producto=None, tipo_movimiento=None, busqueda=None,
                           fecha_inicio=None, fecha_fin=None, current_user=None, limit=100, offset=0):
        return []

    def almacen_stats(self, current_user=None):
        return {"total_productos": len(self._productos)}

    def ajustar_existencia(self, id_producto, stock_nuevo, motivo, current_user=None):
        if id_producto not in self._productos:
            raise NotFoundError(f"Producto {id_producto} no encontrado")
        self._productos[id_producto]["cantidad_disponible"] = stock_nuevo
        return self._productos[id_producto]


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def svc():
    return AlmacenService(repository=StubAlmacenRepository())


_PRODUCTO_BASE = {
    "clave_interna": "MED-001",
    "nombre": "Paracetamol 500mg",
    "tipo_producto": "MEDICAMENTO",
    "cantidad_disponible": 20,
    "nivel_minimo": 5,
}


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestProductos:
    def test_crear_producto_returns_with_id(self, svc):
        data = ProductoCreate(**_PRODUCTO_BASE)
        result = svc.crear_producto(data)
        assert result["id_producto"] is not None
        assert result["nombre"] == "Paracetamol 500mg"

    def test_listar_productos_returns_created(self, svc):
        svc.crear_producto(ProductoCreate(**_PRODUCTO_BASE))
        items = svc.listar_productos()
        assert len(items) == 1

    def test_listar_filtra_por_tipo(self, svc):
        svc.crear_producto(ProductoCreate(**_PRODUCTO_BASE))
        svc.crear_producto(ProductoCreate(**{**_PRODUCTO_BASE, "clave_interna": "EQ-001", "tipo_producto": "EQUIPO"}))

        medicamentos = svc.listar_productos(tipo_producto="MEDICAMENTO")
        equipos = svc.listar_productos(tipo_producto="EQUIPO")

        assert len(medicamentos) == 1
        assert len(equipos) == 1

    def test_obtener_producto_inexistente_raises_not_found(self, svc):
        with pytest.raises(NotFoundError):
            svc.obtener_producto(999)

    def test_desactivar_producto_marca_inactivo(self, svc):
        data = ProductoCreate(**_PRODUCTO_BASE)
        created = svc.crear_producto(data)
        svc.desactivar_producto(created["id_producto"])
        producto = svc.obtener_producto(created["id_producto"])
        assert producto["activo"] == "N"

    def test_ajustar_existencia_actualiza_stock(self, svc):
        created = svc.crear_producto(ProductoCreate(**_PRODUCTO_BASE))
        svc.ajustar_existencia(created["id_producto"], 50, "Reabastecimiento")
        producto = svc.obtener_producto(created["id_producto"])
        assert producto["cantidad_disponible"] == 50

    def test_ajustar_existencia_producto_inexistente_raises(self, svc):
        with pytest.raises(NotFoundError):
            svc.ajustar_existencia(999, 10, "Error esperado")


class TestServicios:
    def test_crear_servicio_laboratorio(self, svc):
        data = ServicioCreate(nombre="Hemograma", categoria="LABORATORIO", cuota_recuperacion=80.0)
        result = svc.crear_servicio(data)
        assert result["categoria"] == "LABORATORIO"
        assert result["cuota_recuperacion"] == pytest.approx(80.0)  # nosonar

    def test_listar_filtra_por_categoria(self, svc):
        svc.crear_servicio(ServicioCreate(nombre="Consulta", categoria="SERVICIO"))
        svc.crear_servicio(ServicioCreate(nombre="Rayos X", categoria="LABORATORIO"))

        labs = svc.listar_servicios(categoria="LABORATORIO")
        servicios = svc.listar_servicios(categoria="SERVICIO")

        assert len(labs) == 1
        assert len(servicios) == 1

    def test_obtener_servicio_inexistente_raises(self, svc):
        with pytest.raises(NotFoundError):
            svc.obtener_servicio(999)

    def test_almacen_stats_returns_dict(self, svc):
        svc.crear_producto(ProductoCreate(**_PRODUCTO_BASE))
        stats = svc.almacen_stats()
        assert "total_productos" in stats
        assert stats["total_productos"] == 1
