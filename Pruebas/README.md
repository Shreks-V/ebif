# Pruebas E2E de Integración — Sistema EBIF

Suite de pruebas de integración end-to-end escritas en Python con `pytest`. Prueban flujos completos del sistema haciendo peticiones HTTP reales al backend con una base de datos Oracle ADB activa.

---

## Contenido

```
Pruebas/
├── conftest.py                      # Fixtures compartidas (auth, cleanup, configuración)
├── support_auth.py                  # Helpers de autenticación
├── support_beneficiarios.py         # Helpers de beneficiarios
├── support_citas.py                 # Helpers de citas
├── support_preregistro.py           # Helpers de pre-registro
├── support_recibos.py               # Helpers de recibos
├── test_acceso_sesion.py            # Autenticación, JWT, roles
├── test_acciones_rapidas.py         # Acciones del dashboard
├── test_aceptacion_cliente.py       # Flujos validados en UAT con el cliente
├── test_beneficiarios.py            # CRUD de beneficiarios
├── test_citas.py                    # Agenda médica y disponibilidad
├── test_doctores_bitacora.py        # Médicos y bitácora de auditoría
├── test_edge_cases_borde.py         # Casos límite y escenarios de error
├── test_features_avanzados.py       # OCR, mapa, variantes, WebSocket
├── test_ocr.py                      # OCR con Google Gemini Vision
├── test_preregistro.py              # Pre-registro público
├── test_recibos.py                  # Cobros, recibos, métodos de pago
├── qase_decorators.py               # Decoradores para vincular tests con QASE
├── qase_manifest_aceptacion.yaml    # Mapa de casos AT en QASE
├── evidencias/                      # Capturas y reportes de evidencia
└── scripts/                         # Scripts de administración QASE
    ├── completar_cobertura_aceptacion.py
    └── recrear_runs_aceptacion.py
```

---

## Requisitos previos

- Backend corriendo localmente en `http://localhost:8000` **o** URL de producción configurada
- Oracle ADB accesible (credenciales en `backend/.env`)
- Variables de entorno del backend activas
- Dependencias instaladas: `pip install -r ../backend/requirements-dev.txt`

---

## Ejecución

```bash
# Desde la raíz del proyecto
cd /ruta/a/ebif

# Todas las pruebas E2E
pytest Pruebas/ -q

# Suite específica
pytest Pruebas/test_beneficiarios.py -v

# Pruebas de aceptación (flujos UAT)
pytest Pruebas/test_aceptacion_cliente.py -v

# Con reporte XML (para CI)
pytest Pruebas/ --junit-xml=e2e-results.xml -q

# Casos de borde solamente
pytest Pruebas/test_edge_cases_borde.py -v
```

---

## Integración con QASE

Los tests usan decoradores de `qase_decorators.py` para vincular cada función de prueba con su caso en QASE TestOps (proyecto `FJ26SV`). En CI/CD, los resultados se envían automáticamente al run activo.

```python
from qase_decorators import qase_case

@qase_case(case_id=1490)   # AT-20 — Generar credencial PDF
def test_credencial_pdf():
    ...
```

El manifiesto `qase_manifest_aceptacion.yaml` mapea cada test a su suite y caso AT correspondiente.

---

## Estructura de un test típico

```python
def test_crear_beneficiario(auth_token, cleanup_beneficiario):
    """Flujo completo: crear → verificar → limpiar."""
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "nombre": "Test User",
        "curp": "TETU000101HMNSTS09",
        ...
    }
    r = requests.post(f"{BASE_URL}/api/beneficiarios/", json=payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["folio"] is not None
    cleanup_beneficiario(data["id"])   # Fixture de limpieza automática
```

---

## Reporte de resultados

El archivo `reporte-resumen-pruebas-ebif.md` contiene el resumen consolidado de resultados con métricas por módulo. El archivo `.html` es la versión renderizada para presentación.

| Módulo | Tests | Resultado |
|---|---|---|
| Autenticación y sesión | ~15 | Todos PASS |
| Beneficiarios | ~20 | Todos PASS |
| Pre-registro | ~12 | Todos PASS |
| Citas y agenda | ~18 | Todos PASS |
| Recibos y cobros | ~15 | Todos PASS |
| Features avanzados (OCR, mapa) | ~15 | Todos PASS |
| Casos de borde | ~12 | Todos PASS |
| **Total** | **~127** | **PASSED** |
