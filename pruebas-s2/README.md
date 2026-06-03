# Pruebas de Regresión Sprint 2 — Sistema EBIF

Suite de regresión que verifica que las funcionalidades del Sprint 2 continúan operando correctamente después de los cambios del Sprint 3. Se ejecuta en CI/CD junto con las pruebas unitarias principales.

---

## Contenido

```
pruebas-s2/
├── conftest.py                       # Fixtures y configuración
├── qase_manifest.yaml                # Mapa de casos QASE para Sprint 2
├── qase_manifest_backend_full.yaml   # Mapa completo de casos backend
├── pruebas_s2_qase_ids.json          # IDs de casos QASE Sprint 2
├── qase_full_professional_ids.json   # IDs completos del proyecto
├── support_s2_memory.py              # Helpers de soporte con caché en memoria
├── qase_s2.py                        # Integración con QASE API para Sprint 2
├── test_hu09_curp.py                 # HU-09: Validación CURP
├── test_hu10_almacen.py              # HU-10: Almacén e inventario
├── test_hu11_reportes.py             # HU-11: Reportes estadísticos
├── test_hu12_notificaciones.py       # HU-12: Notificaciones WebSocket
├── test_hu13_usuarios.py             # HU-13: Administración de usuarios
├── test_hu14_comodato.py             # HU-14: Comodatos
└── test_hu15_saldo_pendiente.py      # HU-15: Saldo pendiente en cobros
```

---

## Ejecución

```bash
# Desde la raíz del proyecto
pytest pruebas-s2/ -q

# Con verbose
pytest pruebas-s2/ -v

# Suite específica (ej. almacén)
pytest pruebas-s2/test_hu10_almacen.py -v
```

**Requiere:** backend activo con Oracle ADB conectado.

---

## Cobertura

Esta suite cubre **22 tests de regresión** sobre los módulos del Sprint 2:

| HU | Módulo | Tests |
|---|---|---|
| HU-09 | Validación CURP | ~3 |
| HU-10 | Almacén | ~4 |
| HU-11 | Reportes | ~4 |
| HU-12 | Notificaciones | ~3 |
| HU-13 | Usuarios sistema | ~4 |
| HU-14 | Comodatos | ~4 |
| HU-15 | Saldo pendiente | — |
| **Total** | | **~22** |

Todos los tests pasaron en el ciclo de regresión del Sprint 3 (2026-05-28).
