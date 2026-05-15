# Refactorización del Sistema EBIF — Asociación Espina Bífida

**Referencia:** [Code Refactoring Techniques in Software Engineering — GeeksforGeeks](https://www.geeksforgeeks.org/software-engineering/code-refactoring-techniques-in-software-engineering/)

---

## Preguntas transversales

### 1. ¿Se pueden aplicar las mismas técnicas al frontend y al backend?

**Sí, todas las técnicas son aplicables a ambas capas**, aunque el vocabulario y los artefactos difieren:

| Técnica | Backend (Python/FastAPI) | Frontend (Angular/TypeScript) |
|---|---|---|
| Red-Green Refactoring | `pytest` + `TestClient` + stubs | Jasmine/Karma + spies |
| Refactoring by Abstraction | Clases de servicio, puertos (protocolos), entidades de dominio | Services de Angular, interceptores, componentes reutilizables |
| Composing Method | Extraer funciones privadas de métodos largos | Extraer métodos privados en componentes |
| Simplifying Methods | Reemplazar if-elif con diccionarios | Reemplazar cadenas de condiciones con maps/enums |
| Moving Features Between Objects | Mover lógica a la capa `application/` | Mover lógica de componentes a servicios Angular |
| Preparatory Refactoring | Arquitectura limpia que habilita nuevas features | Estructura de módulos que facilita el testing |
| UI Refactoring | N/A directo (backend no tiene UI propia) | Consistencia en modales, descargas, mensajes de error |

La diferencia principal es el **contexto de ejecución**: el backend refactoriza para testabilidad, separación de capas y mantenibilidad de la lógica de negocio; el frontend refactoriza también para la consistencia de la experiencia de usuario y el ciclo de vida de los componentes.

---

### 2. ¿La interfaz de usuario influye en la técnica a utilizar?

**Sí, de dos formas:**

1. **Composing Method y Moving Features** se vuelven urgentes cuando varios componentes de la UI deben producir el mismo comportamiento observable (p. ej. descargar un archivo): si la lógica no está centralizada, un bug afecta unos componentes sí y otros no, lo cual el usuario detecta inmediatamente.

2. **UI Refactoring** es una técnica exclusiva del frontend, impulsada directamente por lo que el usuario ve: inconsistencias en mensajes de error, modales, formatos de fecha o botones de acción son observables visualmente y pueden deteriorar la confianza aunque el backend sea correcto.

En el backend, la UI es transparente: no importa si hay un solo cliente o diez; la refactorización responde a la lógica de negocio, no a lo que el usuario percibe en pantalla.

---

## Técnica 1 — Red-Green Refactoring

> Escribir la prueba primero (roja), luego hacer el código mínimo para pasarla (verde), luego refactorizar sin romper la prueba.

### Contexto

Durante esta sesión se construyeron dos suites de prueba: `backend/tests/` (nueva, limpia) y `Pruebas/` (existente, rota). El ciclo rojo → verde → refactorizar es exactamente lo que ocurrió en ambas.

### Ejemplo A — Suite nueva `backend/tests/`

**Rojo:** Se identificaron los casos de uso de autenticación y se escribieron las pruebas antes de validar el comportamiento:

```python
# backend/tests/test_auth.py
def test_login_exitoso(client, admin_token):
    """El token debe decodificarse y contener el correo del admin."""
    resp = client.post("/api/auth/login",
                       json={"correo": "admin@test.com", "contrasena": "admin1234"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

def test_login_contrasena_incorrecta(client):
    resp = client.post("/api/auth/login",
                       json={"correo": "admin@test.com", "contrasena": "mal"})
    assert resp.status_code == 401
```

**Verde:** El `StubUserRepository` en `backend/tests/conftest.py` provee usuarios en memoria para que el servicio `AuthService` pueda responder sin Oracle:

```python
# backend/tests/conftest.py
class StubUserRepository:
    """In-memory user store used by all tests."""
    def __init__(self):
        hasher = SecurityPasswordHasher()
        self._users: list[User] = [
            User(id_usuario=1, correo="admin@test.com",
                 hashed_password=hasher.hash("admin1234"),
                 rol="ADMINISTRADOR", estatus="ACTIVO", ...),
        ]

    def find_by_email(self, correo: str) -> User | None:
        return next((u for u in self._users if u.correo == correo), None)
```

**Refactorizar:** Una vez verde, el patrón `StubUserRepository` se volvió el modelo para los repositorios en `Pruebas/support_auth.py`, eliminando duplicación.

### Ejemplo B — Corrección de `Pruebas/` (rojo → verde)

Las pruebas existentes fallaban con `AttributeError` porque llamaban a una función que ya no existía:

```python
# ANTES (rojo — AttributeError: module has no attribute 'configure_repository')
from app.application.beneficiarios import use_cases as ben_uc
ben_repo = InMemoryBeneficiariosRepository(...)
ben_uc.configure_repository(ben_repo)   # función inexistente tras la refactorización
```

```python
# DESPUÉS (verde — patrón correcto)
from app.application.beneficiarios.use_cases import BeneficiariosService, configure_service as configure_beneficiarios
ben_repo = InMemoryBeneficiariosRepository(default_seed_patients())
configure_beneficiarios(BeneficiariosService(ben_repo))
```

Resultado: 29 errores → 4 fallos → **44 pruebas pasando**.

---

## Técnica 2 — Refactoring by Abstraction

> Introducir abstracciones (clases, interfaces, herencia) para eliminar código duplicado entre estructuras similares.

### Ejemplo A — Funciones auxiliares PDF/Excel (`backend`)

El módulo `exportaciones/repository.py` repite la misma secuencia `buffer.seek(0) → leer bytes → construir FilePayload` en cada función de exportación. Se extrajo en dos helpers:

```python
# ANTES — repetido en cada función
buf.seek(0)
return FilePayload(
    content=buf.read(),
    media_type='application/pdf',
    filename=f'reporte_{tipo}_{datetime.now().strftime("%Y%m%d")}.pdf'
)
```

```python
# DESPUÉS — abstraído en helpers reutilizables
# backend/app/infrastructure/exportaciones/repository.py  líneas 38-44

def _pdf_payload(buffer: io.BytesIO, filename: str) -> FilePayload:
    buffer.seek(0)
    return FilePayload(content=buffer.read(), media_type='application/pdf', filename=filename)

def _excel_payload(buffer: io.BytesIO, filename: str) -> FilePayload:
    buffer.seek(0)
    return FilePayload(
        content=buffer.read(),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename=filename
    )
```

### Ejemplo B — `AuthService._to_user_response()` (`backend`)

La conversión de una entidad `User` a un dict de respuesta se repetía en cada método público de `AuthService`. Se abstrajo como método estático:

```python
# ANTES — duplicado en get_me, create_user, update_user, list_users
return {
    "id_usuario": user.id_usuario,
    "nombre": (user.nombre or "").strip(),
    "correo": (user.correo or "").strip(),
    "rol": normalize_role(user.rol),
    ...
}
```

```python
# DESPUÉS — backend/app/application/auth/use_cases.py  línea 177
@staticmethod
def _to_user_response(user: User) -> dict:
    return {
        "id_usuario": user.id_usuario,
        "nombre": (user.nombre or "").strip(),
        "apellido_paterno": (user.apellido_paterno or "").strip() or None,
        "apellido_materno": (user.apellido_materno or "").strip() or None,
        "correo": (user.correo or "").strip(),
        "rol": normalize_role(user.rol),
        "estatus": (user.estatus or "").strip(),
    }

# Uso en todos los métodos:
return self._to_user_response(created)
return [self._to_user_response(u) for u in self._user_repository.list_all()]
```

### Ejemplo C — Funciones auxiliares del interceptor (`frontend`)

El interceptor de autenticación tenía condicionales complejos dispersos. Se abstrajeron en funciones con nombres descriptivos:

```python
# frontend/src/app/core/auth.interceptor.ts  líneas 22-65

function isPublicPreregistroUrl(url: string, method: string): boolean { ... }
function isScopedPreregistroResourceUrl(url: string): boolean { ... }
function getAuthToken(): string | null { ... }

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getAuthToken();  // abstracción: lógica de migración localStorage→sessionStorage oculta
  ...
};
```

---

## Técnica 3 — Composing Method

> Dividir un método largo en métodos más pequeños, cada uno con una responsabilidad clara.

### Ejemplo A — `descargar()` en componentes Angular (`frontend`)

Cuatro componentes tenían el mismo bloque inline para descargar un blob. La lógica era propensa a bugs (URL revocada antes de que el click ocurriera, link no adjunto al DOM en Firefox).

```typescript
// ANTES — inline en beneficiarios.component.ts, citas.component.ts,
//          almacen.component.ts, recibos.component.ts (repetido 4 veces)
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();                         // bug Firefox: no adjunto al DOM
URL.revokeObjectURL(url);          // bug: revocado antes de que el navegador lea el blob
```

```typescript
// DESPUÉS — método privado en cada componente
// frontend/src/app/pages/reportes/reportes.component.ts  líneas 297-306
private descargar(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);   // necesario en Firefox
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 150);  // dar tiempo al navegador
}

// Uso limpio en cada método de exportación:
exportarExcelResumen(): void {
  this.api.exportarReporteExcel('all', { ... }).subscribe({
    next: (blob) => this.descargar(blob, `reportes_${this.sec1FechaInicio}.xlsx`),
    error: () => alert('Error al generar Excel'),
  });
}
```

### Ejemplo B — `_authenticate_user()` en `AuthService` (`backend`)

El método `login()` hacía demasiado: buscar usuario, verificar contraseña, verificar estatus, emitir token, registrar intento. Se compuso extrayendo la autenticación a un método separado:

```python
# ANTES — todo en login()
def login(self, correo, password):
    user = self._user_repository.find_by_email(correo)
    if user.estatus.strip().upper() != 'ACTIVO':
        self._user_repository.log_login_attempt(user.id_usuario, success=False)
        raise LoginError()
    if not self._password_hasher.verify(password, user.hashed_password):
        self._user_repository.log_login_attempt(user.id_usuario, success=False)
        raise LoginError()
    token = self._token_issuer.issue({"sub": user.correo, "rol": ...})
    self._user_repository.log_login_attempt(user.id_usuario, success=True)
    return AuthenticatedUser(access_token=token)
```

```python
# DESPUÉS — backend/app/application/auth/use_cases.py  líneas 43-61 y 156-175
def login(self, correo: str, password: str) -> AuthenticatedUser:
    db_user = self._user_repository.find_by_email(correo)
    if db_user is not None:
        try:
            return self._authenticate_user(db_user, password)  # método compuesto
        except AuthError:
            self._user_repository.log_login_attempt(db_user.id_usuario, success=False)
            raise LoginError()
    ...

def _authenticate_user(self, user: User, password: str) -> AuthenticatedUser:
    if (user.estatus or "").strip().upper() != "ACTIVO":
        raise AuthError()
    if not self._password_hasher.verify(password, user.hashed_password):
        raise AuthError()
    access_token = self._token_issuer.issue({
        "sub": (user.correo or "").strip(),
        "rol": normalize_role(user.rol),
        ...
    })
    self._user_repository.log_login_attempt(user.id_usuario, success=True)
    return AuthenticatedUser(access_token=access_token)
```

---

## Técnica 4 — Simplifying Methods

> Simplificar condicionales complejos y llamadas a métodos para mejorar la legibilidad.

### Ejemplo A — Dict de funciones en lugar de if-elif (`backend`)

```python
# ANTES — cadena if-elif en exportar_reporte_pdf()
if tipo == 'por-genero':
    data = reporte_por_genero(**kwargs)
elif tipo == 'por-etapa-vida':
    data = reporte_por_etapa_vida(**kwargs)
elif tipo == 'por-estado':
    data = reporte_por_estado(**kwargs)
elif tipo == 'por-tipo-espina':
    data = reporte_por_tipo_espina(**kwargs)
else:
    raise ValidationError(f'Tipo no válido: {tipo}')
```

```python
# DESPUÉS — backend/app/infrastructure/exportaciones/repository.py  líneas 70-74
report_funcs = {
    'por-genero':     reporte_por_genero,
    'por-etapa-vida': reporte_por_etapa_vida,
    'por-estado':     reporte_por_estado,
    'por-tipo-espina':reporte_por_tipo_espina,
}
func = report_funcs.get(tipo)
if not func:
    raise ValidationError(f'Tipo de reporte no válido: {tipo}')
data = func(**kwargs)
```

### Ejemplo B — Consolidar lógica del interceptor en funciones nombradas (`frontend`)

```typescript
// ANTES — condición larga inline en el interceptor
if (req.url.includes('/login') ||
    (req.url.includes('/preregistro') &&
     (req.url.includes('/tipos-espina') || req.url.includes('/tipos-documento') ||
      /\/preregistro\/\d+\/documentos/.test(req.url) ||
      (req.method === 'POST' && /\/preregistro\/?$/.test(req.url)) || ...))) {
  // no adjuntar token
}
```

```typescript
// DESPUÉS — frontend/src/app/core/auth.interceptor.ts  líneas 22-43
function isPublicPreregistroUrl(url: string, method: string): boolean {
  if (url.includes('/login')) return true;
  if (!url.includes('/preregistro')) return false;
  if (url.includes('/tipos-espina') || url.includes('/tipos-documento')) return true;
  if (/\/preregistro\/\d+\/documentos/.test(url)) return true;
  if (method === 'POST' && /\/preregistro\/?$/.test(url)) return true;
  if ((method === 'PUT' || method === 'GET') && /\/preregistro\/\d+\/?$/.test(url)) return true;
  return false;
}

// El interceptor queda simple:
if (token && !isPublicPreregistroUrl(req.url, req.method)) {
  req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
```

### Ejemplo C — Escaping de template literal en Angular (`frontend`)

```typescript
// ANTES — el parser de TypeScript interpretaba ${{ }} como interpolación JS
// frontend/src/app/pages/reportes/reportes.component.html (dentro de backticks)
`Monto: ${{ consol4Data.monto_servicios }}`  // SyntaxError en build
```

```typescript
// DESPUÉS — escape correcto para que Angular lo interprete, no TypeScript
`Monto: \${{ consol4Data.monto_servicios }}`
```

---

## Técnica 5 — Moving Features Between Objects

> Mover responsabilidades al objeto que tiene la información necesaria para cumplirlas.

### Ejemplo A — Centralizar la lógica de negocio en `AuthService` (`backend`)

Antes de la refactorización de arquitectura limpia, la validación de roles y contraseñas estaba dispersa en los routers de FastAPI (capa de presentación). Se movió al objeto correcto: la clase de servicio en la capa de aplicación.

```python
# ANTES — validación de rol en el router (capa incorrecta)
# backend/app/presentation/api/routers/auth.py
@router.get("/usuarios")
async def listar_usuarios(current_user=Depends(get_current_user)):
    if current_user.get("rol") != "ADMINISTRADOR":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return user_repository.list_all()
```

```python
# DESPUÉS — validación en AuthService (capa correcta)
# backend/app/application/auth/use_cases.py  líneas 89-92
def list_users(self, current_user: dict) -> list[dict]:
    if normalize_role(current_user.get("rol")) != "ADMINISTRADOR":
        raise ForbiddenError()  # excepción de dominio, no HTTP
    return [self._to_user_response(u) for u in self._user_repository.list_all()]

# El router solo delega:
# backend/app/presentation/api/routers/auth.py
@router.get("/usuarios")
async def listar_usuarios(current_user=Depends(get_current_user),
                          svc=Depends(get_auth_service)):
    return svc.list_users(current_user)
```

### Ejemplo B — Mover la lógica de descarga del DOM a un método del componente (`frontend`)

```typescript
// ANTES — la lógica de creación del enlace de descarga vivía
//         repetida en cada método exportar*() del componente
exportarExcelResumen(): void {
  this.api.exportarReporteExcel('all', {...}).subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(blob);    // lógica de DOM mezclada
      const a = document.createElement('a');   // con lógica de negocio
      a.href = url;
      a.download = `reportes_${this.sec1FechaInicio}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
```

```typescript
// DESPUÉS — la lógica del DOM vive en el objeto correcto: el método privado
// frontend/src/app/pages/reportes/reportes.component.ts  líneas 219-225
exportarExcelResumen(): void {
  this.api.exportarReporteExcel('all', { fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin })
    .subscribe({
      next: (blob) => this.descargar(blob, `reportes_${this.sec1FechaInicio}_${this.sec1FechaFin}.xlsx`),
      error: () => alert('Error al generar Excel'),
    });
}

private descargar(blob: Blob, filename: string): void { ... }  // único dueño de la lógica DOM
```

---

## Técnica 6 — Preparatory Refactoring

> Refactorizar el código existente para que la nueva funcionalidad sea fácil de agregar, antes de agregarla.

### Ejemplo A — `configure_service()` habilita inyección en tests (`backend`)

El patrón `configure_service()` fue una refactorización preparatoria: en lugar de conectar los casos de uso directamente al repositorio Oracle, se introdujo un mecanismo de inyección que permite sustituir el repositorio en tests.

```python
# Patrón en cada módulo de aplicación
# backend/app/application/beneficiarios/use_cases.py
_service: BeneficiariosService | None = None

def configure_service(svc: BeneficiariosService) -> None:
    global _service
    _service = svc

def get_service() -> BeneficiariosService:
    if _service is None:
        raise RuntimeError("BeneficiariosService not configured")
    return _service
```

```python
# En producción: conectar al repositorio Oracle real
# En tests: conectar al repositorio en memoria
configure_beneficiarios(BeneficiariosService(InMemoryBeneficiariosRepository(...)))
```

Sin esta refactorización preparatoria, agregar cualquier test nuevo requeriría una conexión a Oracle.

### Ejemplo B — `.env.example` como preparación para nuevos colaboradores (`backend`)

Antes de agregar nuevas variables de entorno (SMTP, wallet de Oracle, cifrado), se creó el archivo `.env.example` como refactorización preparatoria: documenta el contrato de configuración y hace que agregar nuevas vars sea un proceso explícito.

```bash
# backend/.env.example
DEBUG=false
SECRET_KEY=cambia-esto-en-produccion

# Oracle
ORACLE_USER=EBIF_USER
ORACLE_PASSWORD=tu_password
ORACLE_DSN=localhost:1521/XEPDB1

# SMTP (opcional — para recuperación de contraseña)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Cifrado de datos sensibles
DATA_ENCRYPTION_KEY=
```

### Ejemplo C — Arquitectura limpia como preparación permanente (`backend`)

La separación `domain/ → application/ → infrastructure/ → presentation/` es en sí misma una refactorización preparatoria que se hizo antes de agregar los módulos de reportes y exportaciones:

```
backend/app/
├── domain/          # entidades y puertos (sin dependencias externas)
├── application/     # casos de uso (solo depende de domain/)
├── infrastructure/  # Oracle, reportlab, openpyxl (implementaciones concretas)
└── presentation/    # FastAPI routers (solo delega a application/)
```

Cuando se agregó el módulo de exportaciones PDF/Excel, no fue necesario tocar la capa de dominio ni los routers existentes.

---

## Técnica 7 — User Interface Refactoring

> Mejorar la consistencia y usabilidad de la interfaz de usuario sin cambiar la lógica de negocio.

### Ejemplo A — Estandarizar el comportamiento de descarga de archivos (`frontend`)

Antes de la refactorización, cada componente tenía su propia variante del flujo de descarga, produciendo comportamientos inconsistentes entre páginas (en Firefox los archivos no se descargaban, en algunos componentes la URL se revocaba antes de tiempo).

```typescript
// ANTES — variante en citas.component.ts (incorrecta)
descargarComprobante(id: number): void {
  this.api.descargarComprobanteCita(id).subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante_cita_${id}.pdf`;
      link.click();                    // bug: no adjunto al DOM
      URL.revokeObjectURL(url);        // bug: inmediato, antes de la descarga
    },
  });
}
```

```typescript
// DESPUÉS — método private descargar() idéntico en los 4 componentes
// frontend/src/app/pages/*/  (beneficiarios, citas, almacen, reportes)
private descargar(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);         // necesario en Firefox
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 150);  // dar tiempo al navegador
}
```

El usuario ahora recibe el mismo comportamiento de descarga en todas las páginas, independientemente de si descarga una credencial, un comprobante de cita, o un reporte en Excel.

### Ejemplo B — Corrección del tipo exportado para el consolidado mensual (`frontend`)

El botón "Exportar Excel" del reporte consolidado mensual enviaba el parámetro incorrecto al backend, resultando en que el usuario recibía un reporte de resumen genérico en lugar del consolidado mensual.

```typescript
// ANTES — bug silencioso: el backend recibía 'mensual' y usaba el fallback
exportarConsolidadoExcel(): void {
  this.api.exportarReporteExcel('mensual', { mes: this.consol4Mes, anio: this.consol4Anio })
    ...
}
```

```typescript
// DESPUÉS — frontend/src/app/pages/reportes/reportes.component.ts  línea 290
exportarConsolidadoExcel(): void {
  this.api.exportarReporteExcel('consolidado-mensual', { mes: this.consol4Mes, anio: this.consol4Anio })
    .subscribe({
      next: (blob) => this.descargar(blob, `consolidado_${this.consol4NombreMes(this.consol4Mes)}_${this.consol4Anio}.xlsx`),
      error: () => alert('Error al generar Excel'),
    });
}
```

Desde la perspectiva del usuario, el cambio es que el Excel descargado ahora contiene los datos del mes seleccionado, no un resumen genérico. La UI no cambió visualmente, pero el comportamiento observable es correcto.

### Ejemplo C — Manejo de sesión expirada con logout automático (`frontend`)

Sin esta refactorización, cuando el token JWT expiraba el usuario veía errores HTTP 401 sin explicación. Ahora la UI responde coherentemente: logout automático y redirección al login.

```typescript
// ANTES — errores 401 llegaban a cada componente sin manejo centralizado
// El usuario veía spinners infinitos o mensajes de error crudos

// DESPUÉS — frontend/src/app/core/auth.interceptor.ts  líneas 83-90
return next(req).pipe(
  catchError((err) => {
    if (err.status === 401 && !isPublicPreregistroUrl(req.url, req.method)) {
      inject(AuthService).logout();  // redirige al login, limpia sesión
    }
    return throwError(() => err);
  }),
);
```

Desde la perspectiva del usuario: en lugar de una pantalla rota, al expirar la sesión aparece directamente la pantalla de login, que es el comportamiento esperado en cualquier sistema web.

---

## Resumen de cambios realizados

| Técnica | Archivos modificados | Impacto |
|---|---|---|
| Red-Green | `backend/tests/`, `Pruebas/conftest.py` | 44 pruebas pasando, 0 fallos |
| Refactoring by Abstraction | `exportaciones/repository.py`, `auth/use_cases.py`, `auth.interceptor.ts` | Eliminación de código duplicado |
| Composing Method | Los 4 componentes de reportes/citas/almacen/beneficiarios | Bug de descarga corregido en todos |
| Simplifying Methods | `exportaciones/repository.py`, `auth.interceptor.ts` | Legibilidad y mantenibilidad |
| Moving Features | `auth/use_cases.py`, componentes Angular | Responsabilidades en la capa correcta |
| Preparatory Refactoring | `configure_service()`, `.env.example`, arquitectura limpia | Testabilidad y extensibilidad |
| UI Refactoring | `reportes.component.ts`, `auth.interceptor.ts` | UX consistente entre páginas |
