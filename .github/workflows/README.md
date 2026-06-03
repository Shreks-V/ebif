# CI/CD — GitHub Actions

Workflows de integración y entrega continua. Se ejecutan automáticamente en cada push o pull request a `main`.

---

## Workflows disponibles

### `pytest-qase.yml` — Principal (pytest → QASE TestOps)

El workflow más importante. Ejecuta las pruebas unitarias del backend y reporta los resultados automáticamente a QASE TestOps.

**Trigger:** push a `main`, pull request a `main`, `workflow_dispatch` (manual)

**Jobs:**

| Job | Descripción | Requiere Oracle |
|---|---|---|
| `backend-unit` | 539 pruebas unitarias (pytest `backend/tests/`) | No |
| `e2e-python` | Pruebas integración E2E (pytest `Pruebas/`) | Sí (var `ORACLE_E2E_ENABLED=true`) |

**Flujo del job `backend-unit`:**
1. `actions/checkout@v4` — clonar repositorio
2. `actions/setup-python@v5` — Python 3.12 con caché de pip
3. `pip install -r backend/requirements-dev.txt`
4. Limpieza de runs CI anteriores en QASE (mantiene solo el más reciente)
5. `pytest backend/tests/` → genera `backend-ci-results.xml`
6. Upload del XML como artefacto (fallback si QASE no está disponible)

**Secrets requeridos:**
```
QASE_TESTOPS_API_TOKEN    # Token de QASE para reportar resultados
SECRET_KEY                # Clave JWT del backend
ORACLE_USER               # (solo e2e-python)
ORACLE_PASSWORD           # (solo e2e-python)
ORACLE_DSN                # (solo e2e-python)
```

**Variables requeridas:**
```
ORACLE_E2E_ENABLED        # "true" para activar el job e2e-python
```

---

### `ci.yml` — CI básico

Workflow de verificación rápida (sin QASE). Útil como gate de PR antes de la revisión.

### `pytest.yml` — pytest standalone

Ejecución de pytest sin integración con QASE. Usado para verificaciones puntuales.

---

## Configurar en un nuevo repositorio

1. Ir a **Settings → Secrets and variables → Actions**
2. Agregar los secrets listados arriba
3. Agregar la variable `ORACLE_E2E_ENABLED = true` (en Variables, no Secrets) si se desea activar E2E con Oracle
4. El primer push a `main` disparará el workflow automáticamente

---

## Ver resultados

- **GitHub Actions:** `github.com/Shreks-V/EspinaBifidaS1 → Actions`
- **QASE:** `app.qase.io → FJ26SV → Test Runs` (buscar run con título `CI — Backend Unit+API (main)`)
- **SonarCloud:** `sonarcloud.io → Marco16005_ebif` (análisis automático en cada push)
