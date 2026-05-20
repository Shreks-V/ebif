"""
Unit tests for almacen DTOs — validate Pydantic rules without hitting the DB.
"""
import pytest
from pydantic import ValidationError

from app.application.almacen.dtos import (
    AjusteExistenciaRequest,
    ComodatoCreate,
    ProductoCreate,
    ServicioCreate,
)


class TestProductoCreate:
    def test_valid_medicamento_passes(self):
        p = ProductoCreate(
            clave_interna="MED-001",
            nombre="Paracetamol",
            tipo_producto="MEDICAMENTO",
            cantidad_disponible=10,
            nivel_minimo=5,
        )
        assert p.tipo_producto == "MEDICAMENTO"
        assert p.activo == "S"

    def test_invalid_tipo_producto_is_rejected(self):
        with pytest.raises(ValidationError):
            ProductoCreate(
                clave_interna="X",
                nombre="Producto inválido",
                tipo_producto="CONSUMIBLE",
            )

    def test_empty_clave_interna_is_rejected(self):
        with pytest.raises(ValidationError):
            ProductoCreate(
                clave_interna="",
                nombre="Sin clave",
                tipo_producto="EQUIPO",
            )

    def test_negative_cantidad_is_rejected(self):
        with pytest.raises(ValidationError):
            ProductoCreate(
                clave_interna="EQ-001",
                nombre="Equipo",
                tipo_producto="EQUIPO",
                cantidad_disponible=-1,
            )

    def test_negative_precio_is_rejected(self):
        with pytest.raises(ValidationError):
            ProductoCreate(
                clave_interna="EQ-001",
                nombre="Equipo",
                tipo_producto="EQUIPO",
                precio_cuota_a=-5.0,
            )

    def test_optional_fields_default_to_none(self):
        p = ProductoCreate(
            clave_interna="MED-002",
            nombre="Ibuprofeno",
            tipo_producto="MEDICAMENTO",
        )
        assert p.descripcion is None
        assert p.presentacion is None
        assert p.fecha_caducidad is None


class TestServicioCreate:
    def test_valid_servicio_passes(self):
        s = ServicioCreate(nombre="Consulta General", categoria="SERVICIO")
        assert s.categoria == "SERVICIO"
        assert s.activo == "S"
        assert s.cuota_recuperacion == pytest.approx(0.0)  # nosonar

    def test_valid_laboratorio_passes(self):
        s = ServicioCreate(nombre="Rayos X", categoria="LABORATORIO", cuota_recuperacion=150.0)
        assert s.categoria == "LABORATORIO"

    def test_invalid_categoria_is_rejected(self):
        with pytest.raises(ValidationError):
            ServicioCreate(nombre="Misterio", categoria="FISIOTERAPIA")

    def test_negative_cuota_is_rejected(self):
        with pytest.raises(ValidationError):
            ServicioCreate(nombre="Negativo", cuota_recuperacion=-10.0)


class TestComodatoCreate:
    def test_valid_comodato_passes(self):
        c = ComodatoCreate(
            id_equipo=1,
            id_paciente=42,
            fecha_prestamo="2024-01-15",
        )
        assert c.estatus == "PRESTADO"
        assert c.exento_pago == "N"
        assert c.monto_total == pytest.approx(0.0)  # nosonar

    def test_missing_required_fields_rejected(self):
        with pytest.raises(ValidationError):
            ComodatoCreate(fecha_prestamo="2024-01-15")


class TestAjusteExistencia:
    def test_valid_adjustment_passes(self):
        a = AjusteExistenciaRequest(stock_nuevo=20, motivo="Recepción de mercancía")
        assert a.stock_nuevo == 20

    def test_negative_stock_is_rejected(self):
        with pytest.raises(ValidationError):
            AjusteExistenciaRequest(stock_nuevo=-1, motivo="Error intencional")

    def test_empty_motivo_is_rejected(self):
        with pytest.raises(ValidationError):
            AjusteExistenciaRequest(stock_nuevo=5, motivo="")

    def test_motivo_too_long_is_rejected(self):
        with pytest.raises(ValidationError):
            AjusteExistenciaRequest(stock_nuevo=5, motivo="x" * 301)
