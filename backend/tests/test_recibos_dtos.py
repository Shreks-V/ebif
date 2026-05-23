"""Tests for recibos DTO validators."""
import pytest
from pydantic import ValidationError

from app.application.recibos.dtos import VentaLineaCreate


class TestVentaLineaCreate:
    def test_tipo_producto_es_valido(self):
        item = VentaLineaCreate(tipo='PRODUCTO', id_referencia=1, descripcion='X', precio_unitario=10.0)
        assert item.tipo == 'PRODUCTO'

    def test_tipo_servicio_es_valido(self):
        item = VentaLineaCreate(tipo='SERVICIO', id_referencia=2, descripcion='Y', precio_unitario=5.0)
        assert item.tipo == 'SERVICIO'

    def test_tipo_invalido_es_rechazado(self):
        with pytest.raises(ValidationError):
            VentaLineaCreate(tipo='OTRO', id_referencia=1, descripcion='X', precio_unitario=10.0)

    def test_cantidad_positiva_es_aceptada(self):
        item = VentaLineaCreate(tipo='PRODUCTO', id_referencia=1, descripcion='X', precio_unitario=10.0, cantidad=3)
        assert item.cantidad == 3

    def test_cantidad_cero_es_rechazada(self):
        with pytest.raises(ValidationError):
            VentaLineaCreate(tipo='PRODUCTO', id_referencia=1, descripcion='X', precio_unitario=10.0, cantidad=0)

    def test_cantidad_negativa_es_rechazada(self):
        with pytest.raises(ValidationError):
            VentaLineaCreate(tipo='PRODUCTO', id_referencia=1, descripcion='X', precio_unitario=10.0, cantidad=-5)
