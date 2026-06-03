# Diagramas de Arquitectura — Sistema EBIF

Documentación visual de la arquitectura del sistema siguiendo el **C4 Model** (Context, Container, Component, Code).

---

## C4 Model — Niveles implementados

### Nivel 1 — Contexto del sistema

Muestra el sistema EBIF en relación con sus usuarios y sistemas externos:

- **Usuarios:** Recepcionista, Médico, Administrador, Beneficiario (pre-registro público)
- **Sistemas externos:** Oracle ADB (OCI), Google Gemini Vision (OCR), Leaflet (mapas), SMTP (email)

### Nivel 2 — Contenedores

Los contenedores principales del sistema:

| Contenedor | Tecnología | Propósito |
|---|---|---|
| Aplicación Web (SPA) | Angular 21 | Interfaz de usuario |
| API REST | FastAPI + Uvicorn | Lógica de negocio y acceso a datos |
| Base de datos | Oracle ADB-S | Persistencia principal |
| Worker de notificaciones | WebSocket (FastAPI) | Notificaciones en tiempo real |

### Nivel 3 — Componentes (Backend)

La API está organizada en capas de Clean Architecture:

```
Presentation (FastAPI Routers)
    ↓ usa
Application (Use Cases + Services)
    ↓ usa
Domain (Entities + DTOs + Repository Interfaces)
    ↑ implementada por
Infrastructure (Oracle Repositories + AI + Scheduler)
```

Cada módulo de negocio (beneficiarios, citas, almacén, etc.) tiene sus cuatro capas independientes.

---

## Archivos en este directorio

Los diagramas se generan con [Structurizr](https://structurizr.com/) y [PlantUML](https://plantuml.com/). Ver también [`../structurizr/`](../structurizr/) para los archivos DSL fuente.

---

## Decisiones de arquitectura clave

| Decisión | Justificación |
|---|---|
| Clean Architecture (Ports & Adapters) | Permite cambiar Oracle por otro motor de BD sin tocar lógica de negocio |
| Python-oracledb thin mode | Sin dependencia de Oracle Instant Client en el servidor |
| Componentes Angular standalone | Reduce bundle size, mejor tree-shaking |
| WebSocket para notificaciones | Latencia < 1 s vs. polling HTTP |
| Fallback HTTP en exportación PDF | El hosting de producción no soporta WebSocket persistente |

Para el modelo relacional completo, ver [`docs/sdd.md`](../../../../docs/sdd.md) §7.2.
