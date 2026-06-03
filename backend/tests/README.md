# Pruebas Unitarias Backend — Sistema EBIF

Suite de **539 pruebas unitarias** escritas con `pytest`. No requieren conexión a Oracle — prueban la lógica de negocio de forma aislada usando mocks de repositorio.

---

## Contenido

```
backend/tests/
├── conftest.py                     # Fixtures globales y mocks de repositorio
├── test_auth.py                    # JWT, roles, login, refresh token
├── test_auth_edge_cases.py         # Expiración, tokens inválidos, ataques de fuerza bruta
├── test_almacen_dtos.py            # DTOs de almacén: validaciones, invariantes
├── test_almacen_service.py         # Servicio de inventario: entradas, salidas, variantes
├── test_beneficiarios_dtos.py      # DTOs de beneficiarios: CURP, membresía, campos opcionales
├── test_beneficiarios_services.py  # Servicio de beneficiarios: CRUD, búsqueda, credencial
├── test_citas_use_cases.py         # Casos de uso: agendar, confirmar, cancelar, completar
├── test_exportaciones_use_cases.py # PDF (ReportLab), Excel (openpyxl), credencial
├── test_preregistro_dtos.py        # DTOs de pre-registro: validaciones, estados
├── test_preregistro_use_cases.py   # Flujo de aprobación/rechazo por admin
├── test_recibos_dtos.py            # Cálculo de totales, Perdonado, Exento, métodos de pago
├── test_reportes_indicadores.py    # KPIs, asistencia mensual, promedios
├── test_reportes_use_cases.py      # Generación de reportes, filtros de fecha
├── test_router_http.py             # Endpoints REST: status codes, RBAC, payloads
├── test_router_coverage.py         # Cobertura de rutas adicionales
├── test_router_extras.py           # Casos límite de routers
├── test_router_citas_recibos.py    # Interacción entre módulos Citas y Recibos
└── test_use_cases_unit.py          # Funciones puras de dominio (Clean Architecture)
```

---

## Ejecución

```bash
# Desde la raíz del proyecto
cd backend

# Todas las pruebas (modo silencioso)
pytest tests/ -q

# Con detalle de cada test
pytest tests/ -v

# Con reporte de cobertura en terminal
pytest tests/ --cov=app --cov-report=term-missing -q

# Con reporte HTML de cobertura
pytest tests/ --cov=app --cov-report=html -q
# Abre htmlcov/index.html en el navegador

# Suite específica
pytest tests/test_auth.py -v

# Tests que coincidan con un patrón
pytest tests/ -k "beneficiario" -v

# Parar al primer fallo
pytest tests/ -x
```

---

## Cobertura actual

| Métrica | Valor |
|---|---|
| Cobertura total (SonarCloud) | **97.1 %** |
| Umbral Quality Gate | > 80 % |
| Estado | PASSED |

La cobertura se mide automáticamente en CI/CD y se reporta a SonarCloud en cada push a `main`.

---

## Estrategia de pruebas

Todos los tests son de **caja negra a nivel de casos de uso**: se llaman las interfaces públicas del dominio y la aplicación con datos de entrada, y se verifica el comportamiento observable (retornos, excepciones, cambios de estado). Los repositorios de Oracle se reemplazan por implementaciones in-memory en `conftest.py`.

```python
# Ejemplo: test de caja negra sobre un caso de uso
def test_crear_beneficiario_con_curp_invalido(beneficiario_use_case):
    with pytest.raises(ValueError, match="CURP"):
        beneficiario_use_case.crear(CrearBeneficiarioDTO(
            nombre="Juan",
            curp="INVALIDO",  # Formato incorrecto
            ...
        ))
```

---

## Requisitos

```bash
pip install -r requirements-dev.txt
```

Los tests no requieren Oracle, Google Gemini, ni ninguna variable de entorno externa. Se pueden ejecutar completamente offline.
