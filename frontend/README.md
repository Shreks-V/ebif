# Frontend — Sistema EBIF

Aplicación web construida con **Angular 21** usando componentes standalone. Diseño responsivo con PrimeNG y gráficas interactivas con ngx-echarts.

---

## Estructura

```
frontend/
├── src/
│   └── app/
│       ├── core/               # Guards, interceptors, servicios globales
│       ├── pages/              # Módulos de cada pantalla
│       │   ├── almacen/        # Inventario y variantes de productos
│       │   ├── beneficiarios/  # Registro y gestión de beneficiarios
│       │   ├── bitacora/       # Auditoría del sistema
│       │   ├── citas/          # Agenda médica
│       │   ├── dashboard/      # KPIs y acciones rápidas
│       │   ├── login/          # Autenticación
│       │   ├── mapa/           # Mapa geográfico de beneficiarios
│       │   ├── perfil/         # Perfil de usuario
│       │   ├── pre-registro/   # Formulario público (OCR + multi-paso)
│       │   ├── recibos/        # Cobros y historial
│       │   ├── reportes/       # Estadísticas, ECharts, exportaciones
│       │   └── usuarios-sistema/
│       └── shared/
│           ├── components/     # Componentes reutilizables
│           ├── constants/      # Constantes globales
│           ├── directives/     # Directivas personalizadas
│           ├── footer/
│           ├── kpi-card/       # Tarjeta de KPI del dashboard
│           ├── models/         # Interfaces TypeScript
│           ├── module-card/    # Tarjeta de módulo en navegación
│           ├── navbar/         # Barra de navegación con búsqueda global
│           └── utils/          # Utilidades puras (testadas con Jasmine)
├── e2e/                        # Pruebas Playwright
│   ├── fixtures/
│   ├── pages/                  # Page Object Models
│   └── specs/                  # Casos de prueba E2E
├── environments/               # Variables por ambiente (dev / prod)
├── public/                     # Assets estáticos
└── package.json
```

---

## Instalación y ejecución

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (hot-reload en localhost:4200)
npm start

# Build de producción
npm run build

# Ejecutar pruebas unitarias Jasmine
npm test

# Ejecutar pruebas E2E Playwright
npx playwright test

# Lint
npm run lint
```

---

## Variables de ambiente

Editar `src/environments/environment.ts` (desarrollo) y `environment.prod.ts` (producción):

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',   // URL del backend
};
```

---

## Pruebas

### Unitarias (Jasmine)
```bash
npm test
```
Cubre funciones puras en `shared/utils/` y servicios sin dependencias externas (e.g. `OcrMergeService`). No usa `TestBed` — tests rápidos y sin overhead de Angular.

### E2E Playwright
```bash
# Requiere backend corriendo en localhost:8000 y frontend en localhost:4200
npx playwright test

# Ver reporte HTML
npx playwright show-report
```

Los specs están en `e2e/specs/`. Cada módulo tiene su archivo: `01-login.spec.ts`, `02-dashboard.spec.ts`, etc.

---

## Principales dependencias

| Paquete | Uso |
|---|---|
| `@angular/core` ^21 | Framework |
| `primeng` | Componentes UI (tablas, modales, formularios) |
| `ngx-echarts` | Gráficas interactivas (reportes) |
| `echarts` | Motor de gráficas (ngx-echarts peer dep) |
| `leaflet` | Mapa interactivo de beneficiarios |
| `@playwright/test` | Pruebas E2E |

---

## Módulos y rutas

| Ruta | Módulo | Requiere auth |
|---|---|---|
| `/login` | LoginComponent | No |
| `/pre-registro` | PreRegistroComponent | No |
| `/dashboard` | DashboardComponent | Si |
| `/beneficiarios` | BeneficiariosComponent | Si |
| `/citas` | CitasComponent | Si |
| `/recibos` | RecibosComponent | Si |
| `/almacen` | AlmacenComponent | Si |
| `/reportes` | ReportesComponent | Si |
| `/mapa` | MapaComponent | Si |
| `/bitacora` | BitacoraComponent | Si (admin) |
| `/usuarios-sistema` | UsuariosSistemaComponent | Si (admin) |
