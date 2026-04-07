# Sprint 1 - Proyecto Ejecutable + Evidencia

## Sistema de Gestion - Asociacion Espina Bifida de Leon A.C.

Esta carpeta contiene una **copia ejecutable** del proyecto mostrando unicamente los modulos del Sprint 1, mas la evidencia documental de cada tarea SCRUM. **Los archivos originales no fueron modificados.**

---

## Como ejecutar el Sprint 1

### Backend
```bash
cd sprint_1/backend
python -m venv venv
source venv/bin/activate    # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
# Backend en http://localhost:8000
```

### Frontend
```bash
cd sprint_1/frontend
npm install --legacy-peer-deps
ng serve
# Frontend en http://localhost:4200
```

### Credenciales de prueba
| Usuario | Correo | Contrasena | Rol |
|---------|--------|------------|-----|
| Admin | admin@espinabifida.org | admin123 | ADMINISTRADOR |
| Operativo | operativo@espinabifida.org | op123 | RECEPCIONISTA |

### Modulos visibles en Sprint 1
- **Login** - Pantalla de inicio de sesion
- **Dashboard** - Panel con KPIs y accesos rapidos (solo a modulos Sprint 1)
- **Pre-Registro** - Formulario publico multi-paso (accesible sin login en `/preregistro`)
- **Almacen** - Gestion basica de productos, existencias y comodatos

> Los demas modulos (Beneficiarios, Citas, Recibos, Reportes) estan disponibles en el proyecto completo.

---

## Evidencia documental

La carpeta `evidencia/` contiene archivos organizados por tarea SCRUM:

---

## Mapeo de Tareas SCRUM

| ID | Tarea | Carpeta | Archivos Clave | Estado |
|----|-------|---------|----------------|--------|
| SCRUM-21 | Frontend Login | `SCRUM-21_Frontend_Login/` | `login.component.ts`, `auth.service.ts`, `auth.guard.ts`, `auth.interceptor.ts`, `app.routes.ts` | Completado |
| SCRUM-22 | Endpoints Inicio de sesion | `SCRUM-22_Endpoints_Inicio_Sesion/` | `auth.py` - endpoints: POST `/login`, GET `/me`, POST `/seed` | Completado |
| SCRUM-23 | Backend basico Login | `SCRUM-23_Backend_Basico_Login/` | `security.py` (Argon2id, JWT, RBAC), `config.py`, `crypto.py` (AES-GCM) | Completado |
| SCRUM-25 | Datos Dummys | `SCRUM-25_Datos_Dummys/` | `seed_data.py` - genera datos de prueba para todas las tablas | Completado |
| SCRUM-27 | Repositories Implementations | `SCRUM-27_28_Repositories_Backend/` | `routers/` con implementaciones completas de cada modulo | Completado |
| SCRUM-28 | Repositories Backend | `SCRUM-27_28_Repositories_Backend/` | `core/database.py` (pool, helpers), `core/bitacora.py`, `schemas/schemas.py` | Completado |
| SCRUM-29 | Frontend Dashboard | `SCRUM-29_Frontend_Dashboard/` | `dashboard.component.ts` con KPIs, graficas, citas del dia, acceso rapido | Completado |
| SCRUM-31 | Frontend Preregistro | `SCRUM-31_Frontend_Preregistro/` | `pre-registro.component.ts` - formulario publico multi-paso | Completado |
| SCRUM-33 | Recepcion documentos Preregistro | `SCRUM-33_Recepcion_Documentos_Preregistro/` | `preregistro.py` - endpoints de carga/descarga de documentos (CURP, acta, etc.) | Completado |
| SCRUM-34 | Generacion pruebas Login | `SCRUM-34_Pruebas_Login/` | `test_auth.py` - 15+ pruebas: hashing, JWT, endpoints, RBAC, seguridad | Completado |
| SCRUM-35 | Backend Dashboard | `SCRUM-35_Backend_Dashboard/` | `reportes.py`, `beneficiarios.py`, `citas.py`, `recibos.py` - endpoints de estadisticas | Completado |
| SCRUM-36 | Configuracion ambiente de pruebas | `SCRUM-36_Ambiente_Pruebas/` | `docker-compose.yml`, `Dockerfile`, `requirements.txt`, `README_ambiente.md` | Completado |
| SCRUM-41 | Crear SDD | `SCRUM-41_SDD/` | `SDD_Software_Design_Document.md` - arquitectura, diseno, seguridad, BD | Completado |
| SCRUM-42 | Actualizar BD (cuota A y B) | `SCRUM-42_Base_Datos_Cuota/` | `schemas.py` (modelos con cuota A/B), `esquema_cuota_ab.sql` | Completado |
| SCRUM-43 | Implementar almacen basico | `SCRUM-43_Almacen_Basico/` | `frontend/almacen.component.ts`, `backend/almacen.py` - CRUD productos, existencias, comodatos | Completado |

---

## Descripcion por Tarea

### SCRUM-21: Frontend Login
Componente Angular standalone con formulario de inicio de sesion. Incluye validacion de campos, manejo de errores, almacenamiento de token JWT en localStorage, y redireccion al dashboard tras login exitoso.

### SCRUM-22: Endpoints Inicio de Sesion
API REST con 3 endpoints: `POST /api/auth/login` (autenticacion con rate limiting), `GET /api/auth/me` (datos del usuario autenticado), `POST /api/auth/seed` (insertar usuarios por defecto). Incluye fallback a usuarios mock cuando la BD no tiene registros.

### SCRUM-23: Backend Basico Login
Capa de seguridad completa: hashing Argon2id para contrasenas, generacion/validacion de JWT, middleware RBAC con `require_role()`, encriptacion AES-256-GCM para datos sensibles.

### SCRUM-25: Datos Dummys
Script `seed_data.py` que genera datos de prueba para: usuarios del sistema, beneficiarios (50), doctores (10), servicios medicos, productos, citas, ventas, comodatos, y disponibilidad de doctores.

### SCRUM-27/28: Repositories Backend
Implementacion completa del patron repositorio: `database.py` con connection pooling Oracle (2-10 conexiones), helpers `row_to_dict`/`rows_to_dicts`, sistema de bitacora para auditoria, y schemas Pydantic para validacion de datos.

### SCRUM-29: Frontend Dashboard
Panel principal con: 6 KPIs (beneficiarios, citas, ingresos, inventario), graficas de tendencia, listado de citas del dia, acceso rapido a modulos, doctor del dia. Carga paralela con `forkJoin` y skeleton loading.

### SCRUM-31: Frontend Preregistro
Formulario publico multi-paso (sin autenticacion requerida) que permite a familias pre-registrar beneficiarios. Incluye: datos personales, direccion, contacto, informacion medica, y carga de documentos.

### SCRUM-33: Funcionalidad de Recepcion de Documentos Preregistro
Endpoints para subir y gestionar documentos del beneficiario: CURP, acta de nacimiento, comprobante de domicilio, etc. Almacenamiento seguro en servidor con registro en BD.

### SCRUM-34: Generacion Pruebas Login
Suite de pruebas con pytest que cubre: hashing de contrasenas (4 tests), JWT (3 tests), endpoint login (4 tests), endpoint /me (2 tests), RBAC (2 tests), seguridad (2 tests). Total: 17 casos de prueba.

### SCRUM-35: Backend Dashboard
Endpoints de estadisticas para el dashboard: conteo de beneficiarios activos, citas del dia, ingresos del mes, alertas de inventario bajo, comparativa mensual, y tendencias.

### SCRUM-36: Configuracion de Ambiente de Pruebas
Configuracion Docker completa: `docker-compose.yml` con servicios backend + frontend, `Dockerfile` para el backend, `requirements.txt` con dependencias, documentacion de setup local.

### SCRUM-41: Crear SDD
Software Design Document que describe: arquitectura cliente-servidor, diseno de frontend (componentes, routing, autenticacion), diseno de backend (estructura, endpoints, seguridad), esquema de BD, y patrones de diseno utilizados.

### SCRUM-42: Actualizar Base de Datos (Cuota A y B)
Implementacion de cuota diferenciada: campo `TIPO_CUOTA` en tabla PACIENTE, columnas `PRECIO_CUOTA_A` y `PRECIO_CUOTA_B` en tablas SERVICIO y PRODUCTO. Schemas Pydantic actualizados.

### SCRUM-43: Implementar Almacen Basico
Modulo completo de inventario: CRUD de productos (medicamentos y equipos), control de existencias con alertas de nivel minimo, gestion de comodatos (prestamos de equipo), movimientos de inventario, y generacion de contratos PDF.
