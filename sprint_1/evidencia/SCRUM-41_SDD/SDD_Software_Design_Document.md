# Software Design Document (SDD)
## Sistema de Gestion - Asociacion Espina Bifida de Leon A.C.

**Version:** 1.0  
**Fecha:** Abril 2026  
**Equipo:** DM, RR, MR, EP, AR

---

## 1. Introduccion

### 1.1 Proposito
Este documento describe la arquitectura y diseno del sistema de gestion para la Asociacion Espina Bifida de Leon A.C. El sistema permite administrar beneficiarios, citas medicas, almacen de productos/medicamentos, recibos de pago y reportes.

### 1.2 Alcance
El sistema cubre los siguientes modulos funcionales:
- **Autenticacion y Seguridad** (RF-SEG)
- **Gestion de Beneficiarios** (RF-BEN)
- **Gestion de Citas Medicas** (RF-CIT)
- **Almacen e Inventario** (RF-ALM)
- **Recibos y Pagos** (RF-REC)
- **Reportes y Exportaciones** (RF-REP)
- **Pre-Registro publico** (RF-PRE)
- **Dashboard** (RF-DASH)

### 1.3 Definiciones
| Termino | Definicion |
|---------|-----------|
| Beneficiario | Paciente registrado en la asociacion |
| Cuota A/B | Tipo de tarifa aplicable al beneficiario |
| Comodato | Prestamo temporal de equipo medico |
| ATP | Oracle Autonomous Transaction Processing |

---

## 2. Arquitectura del Sistema

### 2.1 Vista General

```
┌──────────────┐     HTTP/REST      ┌──────────────┐     SQL      ┌──────────────┐
│   Frontend   │ ◄──────────────── │   Backend    │ ◄────────── │  Oracle ATP  │
│  Angular 19  │     JSON + JWT     │   FastAPI    │   oracledb   │   Database   │
│  Port: 4200  │                    │  Port: 8000  │   Pool 2-10  │    Cloud     │
└──────────────┘                    └──────────────┘              └──────────────┘
```

### 2.2 Patron Arquitectonico
- **Frontend:** Single Page Application (SPA) con Angular 19 standalone components
- **Backend:** RESTful API con FastAPI (Python 3.11+)
- **Base de Datos:** Oracle Autonomous Database con acceso via wallet

### 2.3 Principios de Diseno
1. **Separacion de responsabilidades:** Frontend (UI) / Backend (logica) / BD (datos)
2. **Seguridad por defecto:** Argon2id para hashing, AES-GCM para datos sensibles, JWT para sesiones
3. **Performance:** Connection pooling, batch queries, loading states
4. **Auditoria:** Bitacora de cambios automatica en operaciones criticas

---

## 3. Diseno del Frontend

### 3.1 Estructura de Componentes

```
src/app/
├── core/
│   ├── auth.guard.ts          # Guard de rutas protegidas
│   └── auth.interceptor.ts    # Interceptor JWT automatico
├── services/
│   ├── api.service.ts         # Servicio HTTP centralizado
│   └── auth.service.ts        # Manejo de sesion/token
├── shared/
│   ├── navbar/                # Barra de navegacion
│   ├── footer/                # Pie de pagina
│   ├── kpi-card/              # Tarjeta KPI reutilizable
│   └── module-card/           # Tarjeta de modulo
└── pages/
    ├── login/                 # Pantalla de inicio de sesion
    ├── dashboard/             # Panel principal con KPIs
    ├── beneficiarios/         # CRUD de beneficiarios + preregistros
    ├── citas/                 # Gestion de citas y doctores
    ├── almacen/               # Productos, medicamentos, comodatos
    ├── recibos/               # Ventas y recibos de pago
    ├── pre-registro/          # Formulario publico multi-paso
    └── reportes/              # Graficas y exportaciones
```

### 3.2 Flujo de Autenticacion

```
Login Form ──► AuthService.login() ──► POST /api/auth/login
                                              │
                                        JWT Token
                                              │
                                    localStorage.setItem()
                                              │
                              AuthInterceptor agrega header
                              Authorization: Bearer <token>
                                              │
                                   AuthGuard verifica token
                                   en cada ruta protegida
```

### 3.3 Routing

| Ruta | Componente | Guard | Descripcion |
|------|-----------|-------|-------------|
| `/login` | LoginComponent | - | Inicio de sesion |
| `/dashboard` | DashboardComponent | AuthGuard | Panel principal |
| `/beneficiarios` | BeneficiariosComponent | AuthGuard | Gestion de pacientes |
| `/citas` | CitasComponent | AuthGuard | Citas y doctores |
| `/almacen` | AlmacenComponent | AuthGuard | Inventario |
| `/recibos` | RecibosComponent | AuthGuard | Pagos |
| `/pre-registro` | PreRegistroComponent | - | Formulario publico |
| `/reportes` | ReportesComponent | AuthGuard | Reportes |

---

## 4. Diseno del Backend

### 4.1 Estructura de Modulos

```
backend/app/
├── core/
│   ├── config.py        # Variables de entorno (Pydantic Settings)
│   ├── database.py      # Connection pool Oracle + helpers
│   ├── security.py      # Argon2, JWT, RBAC
│   ├── crypto.py        # AES-GCM para datos sensibles
│   └── bitacora.py      # Registro de auditoria
├── routers/
│   ├── auth.py          # Login, /me, seed
│   ├── beneficiarios.py # CRUD pacientes, historial
│   ├── citas.py         # CRUD citas, stats
│   ├── almacen.py       # Productos, existencias, comodatos
│   ├── recibos.py       # Ventas, metodos de pago
│   ├── doctores.py      # Doctores, disponibilidad
│   ├── preregistro.py   # Pre-registro publico, documentos
│   ├── reportes.py      # Estadisticas, graficas
│   └── exportaciones.py # PDF, Excel
├── schemas/
│   └── schemas.py       # Modelos Pydantic (request/response)
└── main.py              # App FastAPI, middlewares, lifespan
```

### 4.2 Endpoints REST (API)

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Inicio de sesion | No |
| GET | `/api/auth/me` | Datos del usuario | Si |
| GET | `/api/beneficiarios` | Listar beneficiarios | Si |
| POST | `/api/beneficiarios` | Crear beneficiario | Si |
| PUT | `/api/beneficiarios/{folio}` | Actualizar beneficiario | Si |
| DELETE | `/api/beneficiarios/{folio}` | Desactivar beneficiario | Admin |
| GET | `/api/beneficiarios/{folio}/historial` | Historial de un beneficiario | Si |
| GET | `/api/citas` | Listar citas | Si |
| POST | `/api/citas` | Crear cita | Si |
| GET | `/api/citas/hoy` | Citas del dia | Si |
| GET | `/api/doctores` | Listar doctores | Si |
| POST | `/api/doctores` | Crear doctor | Admin |
| PUT | `/api/doctores/{id}` | Actualizar doctor | Admin |
| GET | `/api/almacen/productos` | Listar productos | Si |
| POST | `/api/almacen/productos` | Crear producto | Si |
| GET | `/api/recibos` | Listar recibos | Si |
| POST | `/api/recibos` | Crear recibo | Si |
| GET | `/api/reportes/*` | Estadisticas varias | Si |
| GET | `/api/exportaciones/*` | Exportar PDF/Excel | Si |
| POST | `/api/preregistro` | Pre-registro publico | No |

### 4.3 Seguridad

#### Autenticacion
- **Hashing:** Argon2id (ganador de Password Hashing Competition)
- **Sesiones:** JWT con expiracion configurable (default 8 horas)
- **Rate Limiting:** 10 intentos de login por minuto por IP
- **Anti-enumeracion:** Mensaje de error generico en login fallido

#### Encriptacion de Datos Sensibles
- **Algoritmo:** AES-256-GCM (Galois/Counter Mode)
- **Campos encriptados:** telefono, correo, direccion, CURP, nombre_padre_madre, emergencia
- **Key derivation:** Variable de entorno `AES_KEY`

#### Control de Acceso (RBAC)
- **ADMINISTRADOR:** Acceso completo a todos los modulos
- **RECEPCIONISTA:** Acceso a operaciones de lectura y registro

#### Middlewares de Seguridad
- CORS con origenes restringidos
- Security Headers (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)
- Limite de tamano de request (10 MB)

### 4.4 Connection Pooling

```python
# Configuracion del pool Oracle
oracledb.create_pool(
    min=2,     # Conexiones minimas activas
    max=10,    # Conexiones maximas
    increment=1
)
```

El pool se inicializa al arrancar la app (lifespan) y se cierra al detener. Cada request adquiere una conexion del pool en lugar de crear una nueva (ahorro de 1-3 segundos por request).

---

## 5. Diseno de Base de Datos

### 5.1 Diagrama de Tablas Principales

```
USUARIO_SISTEMA ──── BITACORA_CAMBIOS
       │
       ├── CITA ──── DETALLE_CITA_SERVICIO ──── SERVICIO
       │     │                                      │
       │     └── CITA_DOCTOR ──── DOCTOR        DOCTOR_SERVICIO
       │                            │
       │                    DISPONIBILIDAD_DOCTOR
       │
       ├── PACIENTE ──── PACIENTE_TIPO_ESPINA ──── TIPO_ESPINA_BIFIDA
       │     │
       │     ├── VENTA ──── VENTA_METODO_PAGO ──── METODO_PAGO
       │     │
       │     ├── COMODATO ──── PRODUCTO (EQUIPO)
       │     │
       │     └── DOCUMENTO_PACIENTE ──── TIPO_DOCUMENTO
       │
       └── PRODUCTO ──── EXISTENCIA_PRODUCTO
              │                │
              ├── MEDICAMENTO  └── MOVIMIENTO_INVENTARIO
              └── EQUIPO_MEDICO
```

### 5.2 Cuota A y B

El sistema soporta dos tipos de cuota para beneficiarios:
- **Cuota A:** Tarifa reducida
- **Cuota B:** Tarifa estandar

La tabla `PACIENTE` contiene `TIPO_CUOTA` ('A' o 'B'), y las tablas `SERVICIO` y `PRODUCTO` tienen columnas `PRECIO_CUOTA_A` y `PRECIO_CUOTA_B` para diferenciar precios.

---

## 6. Patrones de Diseno Utilizados

| Patron | Donde | Proposito |
|--------|-------|-----------|
| Repository | Routers (queries SQL) | Separar logica de acceso a datos |
| Factory | `require_role()` | Crear dependencias de autorizacion |
| Singleton | Connection Pool | Una instancia global del pool |
| Observer | Angular Observables | Reactividad en UI |
| Guard | AuthGuard | Proteccion de rutas |
| Interceptor | AuthInterceptor | Inyeccion automatica de JWT |
| Strategy | Cuota A/B pricing | Precios diferenciados por tipo |

---

## 7. Decisiones de Diseno

1. **Angular Standalone Components** sobre NgModules: menor boilerplate, tree-shaking nativo
2. **Argon2id sobre bcrypt:** recomendacion OWASP, resistencia a GPU/ASIC
3. **Oracle ATP sobre PostgreSQL:** requerimiento institucional del proyecto
4. **Connection Pooling:** mejora de 7-21s a <2s en tiempo de carga
5. **Inline Templates:** componentes autocontenidos, sin archivos HTML separados
6. **Batch Queries:** eliminacion de N+1 queries en listados con joins
