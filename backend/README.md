# Backend — Sistema EBIF

API REST construida con **FastAPI** siguiendo **Clean Architecture** (Ports & Adapters). Base de datos **Oracle Autonomous Database** vía `python-oracledb` en modo thin (sin cliente nativo).

---

## Estructura

```
backend/
├── app/
│   ├── domain/           # Entidades, DTOs, interfaces de repositorio (sin dependencias externas)
│   │   ├── almacen/
│   │   ├── auth/
│   │   ├── beneficiarios/
│   │   ├── bitacora/
│   │   ├── citas/
│   │   ├── doctores/
│   │   ├── exportaciones/
│   │   ├── preregistro/
│   │   ├── recibos/
│   │   ├── reportes/
│   │   └── shared/
│   ├── application/      # Casos de uso y servicios de aplicación
│   │   ├── almacen/
│   │   ├── auth/
│   │   ├── beneficiarios/
│   │   ├── citas/
│   │   ├── doctores/
│   │   ├── exportaciones/
│   │   ├── geocoding/
│   │   ├── preregistro/
│   │   ├── recibos/
│   │   └── reportes/
│   ├── infrastructure/   # Implementaciones concretas (Oracle, IA, email, scheduler)
│   │   ├── ai/           # Google Gemini Vision (OCR)
│   │   ├── almacen/
│   │   ├── audit/        # Bitácora automática
│   │   ├── auth/
│   │   ├── beneficiarios/
│   │   ├── bitacora/
│   │   ├── citas/
│   │   ├── doctores/
│   │   ├── exportaciones/
│   │   ├── geocoding/
│   │   ├── persistence/  # Pool de conexiones Oracle
│   │   ├── preregistro/
│   │   ├── privacy/      # Manejo de datos sensibles
│   │   ├── recibos/
│   │   ├── reportes/
│   │   ├── scheduler/    # Tareas programadas (APScheduler)
│   │   ├── security/     # Rate limiting (SlowAPI)
│   │   └── startup/      # Inicialización de la aplicación
│   ├── presentation/
│   │   └── api/
│   │       └── routers/  # Endpoints FastAPI
│   └── core/             # Configuración, dependencias, middlewares
├── db/
│   └── migrations/       # 021 migraciones SQL numeradas
├── tests/                # 539 pruebas unitarias (pytest)
├── uploads/              # Archivos subidos (documentos OCR)
├── requirements.txt      # Dependencias de producción
├── requirements-dev.txt  # Dependencias de desarrollo + testing
├── Dockerfile
└── run.py                # Punto de entrada
```

---

## Configuración

### Variables de entorno

Crear `backend/.env` con las siguientes variables:

```env
# Oracle ADB
ORACLE_USER=ebif_user
ORACLE_PASSWORD=your_password
ORACLE_DSN=your_dsn_from_tnsnames

# Seguridad
SECRET_KEY=your-secret-key-min-32-chars
ALLOWED_HOSTS=http://localhost:4200,https://your-prod-domain.com

# Google Gemini (OCR)
GOOGLE_API_KEY=your_gemini_api_key

# QASE (opcional, solo para CI/CD)
QASE_TESTOPS_API_TOKEN=your_qase_token
```

El wallet de Oracle debe estar en `../wallet/` (relativo a `backend/`). La ruta se configura automáticamente via `TNS_ADMIN` apuntando al wallet.

### Instalación

```bash
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt   # Incluye pytest, coverage, SonarCloud
```

---

## Ejecución

```bash
# Desarrollo (hot-reload)
python run.py

# Producción
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Docker
docker build -t ebif-backend .
docker run -p 8000:8000 --env-file .env ebif-backend
```

**Endpoints de documentación:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

---

## Pruebas

```bash
# Todas las pruebas unitarias (539 tests, sin Oracle requerido)
pytest tests/ -q

# Con reporte de cobertura
pytest tests/ --cov=app --cov-report=term-missing -q

# Prueba específica
pytest tests/test_auth.py -v

# E2E integración con Oracle (requiere BD activa)
pytest ../Pruebas/ -q
```

La cobertura actual es **97.1 %** medida por SonarCloud. El umbral mínimo del Quality Gate es 80 %.

---

## Capas de Clean Architecture

| Capa | Directorio | Dependencias permitidas |
|---|---|---|
| Domain | `app/domain/` | Ninguna (Python puro) |
| Application | `app/application/` | Solo `domain/` |
| Infrastructure | `app/infrastructure/` | `domain/` + `application/` + librerías externas |
| Presentation | `app/presentation/` | `application/` + FastAPI |

La regla de dependencia fluye siempre hacia adentro: `Presentation → Application → Domain`.

---

## Principales dependencias

| Paquete | Versión | Uso |
|---|---|---|
| fastapi | 0.136.3 | Framework API REST |
| uvicorn | 0.48.0 | Servidor ASGI |
| pydantic | 2.13.4 | Validación y DTOs |
| python-oracledb | 3.4.2 | Driver Oracle (thin mode) |
| python-jose | 3.5.0 | JWT (auth) |
| argon2-cffi | 25.1.0 | Hash de contraseñas |
| google-genai | 2.x | OCR con Gemini Vision |
| reportlab | 4.5.1 | Generación de PDFs |
| openpyxl | 3.1.5 | Exportación Excel |
| slowapi | 0.1.9 | Rate limiting (120 req/min) |
| python-dotenv | 1.2.2 | Variables de entorno |
