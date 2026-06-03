# Sistema EBIF — Asociación de Espina Bífida de Monterrey, A.C.

Plataforma de gestión integral para la Asociación de Espina Bífida de Monterrey. Cubre el ciclo completo de operación: beneficiarios, citas médicas, cobros, inventario, comodatos, reportes con IA y mapa geográfico.

---

## Arquitectura

```
ebif/
├── backend/        # FastAPI + Clean Architecture (Python 3.12)
├── frontend/       # Angular 21 (standalone components)
├── Pruebas/        # Pruebas de integración E2E (pytest + Oracle)
├── pruebas-s2/     # Suite de regresión Sprint 2
├── docs/           # Documentación: SDD, calidad, manual de usuario
├── scripts/        # Utilidades QASE y administración
├── wallet/         # Credenciales Oracle ADB (OCI Wallet)
└── .github/        # CI/CD GitHub Actions → QASE
```

**Stack tecnológico:**

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular (standalone) | 21.x |
| Backend | FastAPI + Uvicorn | 0.136 / 0.48 |
| Base de datos | Oracle Autonomous Database | ADB-S |
| ORM/Driver | python-oracledb (thin mode) | 3.x |
| Auth | JWT + Argon2 | — |
| IA / OCR | Google Gemini Vision (google-genai) | 2.x |
| Exportaciones | ReportLab (PDF) + OpenPyXL (Excel) | — |
| Pruebas backend | pytest | 8.x |
| Pruebas frontend | Jasmine + Playwright | — |
| Calidad de código | SonarCloud | — |
| Gestión de pruebas | QASE TestOps (proyecto `FJ26SV`) | — |

---

## Inicio rápido

### Requisitos previos

- Python 3.12+
- Node.js 20+ / npm
- Acceso a Oracle ADB (wallet en `wallet/`)
- Variables de entorno configuradas (ver `backend/.env.example`)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Llenar con credenciales reales
python run.py
```

API disponible en: `http://localhost:8000`
Documentación interactiva: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm start
```

Aplicación disponible en: `http://localhost:4200`

### Con Docker (backend)

```bash
cd backend
docker build -t ebif-backend .
docker run -p 8000:8000 --env-file .env ebif-backend
```

---

## Módulos del sistema

| Módulo | Ruta UI | Endpoint API |
|---|---|---|
| Autenticación | `/login` | `/api/auth/` |
| Dashboard | `/dashboard` | `/api/reportes/` |
| Beneficiarios | `/beneficiarios` | `/api/beneficiarios/` |
| Pre-registro público | `/pre-registro` | `/api/preregistro/` |
| Citas médicas | `/citas` | `/api/citas/` |
| Médicos | — | `/api/doctores/` |
| Recibos y cobros | `/recibos` | `/api/recibos/` |
| Almacén e inventario | `/almacen` | `/api/almacen/` |
| Comodatos | — | `/api/comodatos/` |
| Reportes + Mapa | `/reportes` | `/api/reportes/` |
| Exportaciones (PDF/Excel) | — | `/api/exportaciones/` |
| Usuarios del sistema | `/usuarios-sistema` | `/api/usuarios/` |
| Bitácora de auditoría | `/bitacora` | `/api/bitacora/` |
| OCR con IA | — | `/api/preregistro/ocr/` |

---

## Pruebas

```bash
# Unitarias backend (539 tests, no requiere Oracle)
cd backend
pytest tests/ -q

# E2E integración Python (requiere Oracle ADB activo)
pytest Pruebas/ -q

# Regresión Sprint 2
pytest pruebas-s2/ -q

# E2E Playwright (requiere backend + frontend corriendo)
cd frontend
npx playwright test
```

Cobertura actual: **97.1 %** · Quality Gate SonarCloud: **PASSED** · Issues activos: **0**

---

## Migraciones de base de datos

Las migraciones SQL se aplican en orden sobre Oracle ADB:

```bash
# Aplicar todas las migraciones en orden
cd backend/db/migrations
# Ejecutar 001_*.sql → 021_*.sql en secuencia vía SQL*Plus o DBeaver
```

Ver [`backend/db/migrations/README.md`](backend/db/migrations/README.md) para instrucciones detalladas.

---

## Documentación

| Documento | Archivo |
|---|---|
| Software Design Document (SDD) | [`docs/sdd.md`](docs/sdd.md) / [`docs/sdd.docx`](docs/sdd.docx) |
| Documento de Calidad (proyecto completo) | [`docs/calidad_proyecto.md`](docs/calidad_proyecto.md) |
| Manual de Usuario | [`docs/manual-de-usuario.md`](docs/manual-de-usuario.md) |

---

## CI/CD

Cada push a `main` ejecuta automáticamente:
1. **pytest** sobre `backend/tests/` → reporte a QASE (run CI)
2. **SonarCloud** análisis estático + cobertura
3. (Condicional) pytest E2E sobre `Pruebas/` si `ORACLE_E2E_ENABLED=true`

Ver [`.github/workflows/`](.github/workflows/) para la configuración completa.

---

## Equipo

| Nombre | Matrícula | Rol |
|---|---|---|
| Emilio Antonio Peralta Montiel | A01712354 | Desarrollo |
| Ricardo Bastida Rodríguez | A00839429 | Desarrollo |
| Marco Antonio Torres Ramírez | A00839451 | Desarrollo |
| Andrés Huerta Robinson | A00838626 | Desarrollo |
| Diego Guadiana Manjarrez | A01285889 | Desarrollo |

**Institución:** Tecnológico de Monterrey, Campus Monterrey — Planeación de Sistemas de Software (Gpo. 107)
**Socio formador:** Accenture
**Cliente:** Asociación de Espina Bífida de Monterrey, A.C.
