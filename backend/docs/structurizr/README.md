# Structurizr DSL — Sistema EBIF

Archivos fuente en [Structurizr DSL](https://structurizr.com/dsl) para generar los diagramas de arquitectura C4 del sistema.

---

## ¿Qué es Structurizr DSL?

Un lenguaje de definición de arquitectura que permite describir el modelo C4 (Context, Container, Component, Code) en texto plano y generar diagramas visuales automáticamente. Facilita mantener los diagramas actualizados junto al código.

---

## Uso con Structurizr Lite (local)

```bash
# Instalar Structurizr Lite vía Docker
docker pull structurizr/lite

# Ejecutar apuntando a este directorio
docker run -it --rm -p 8080:8080 \
  -v "$(pwd)/backend/docs/structurizr:/usr/local/structurizr" \
  structurizr/lite
```

Abrir `http://localhost:8080` para ver los diagramas interactivos.

---

## Archivos DSL

Los archivos `.dsl` en este directorio definen:

- **workspace.dsl** — Modelo completo: personas, sistemas, contenedores, componentes y vistas
- Cada vista genera un diagrama exportable a PNG/SVG

---

## Exportar diagramas

Desde la interfaz de Structurizr Lite:
1. Seleccionar la vista deseada (Context, Container, Component)
2. Usar el botón Export → PNG o SVG
3. Guardar en [`backend/docs/architecture/`](../architecture/)

Los diagramas exportados se incluyen en el SDD (`docs/sdd.md`).

---

## Referencia C4

| Vista | Descripción | Audiencia |
|---|---|---|
| System Context | EBIF y sus actores/sistemas externos | Stakeholders, cliente |
| Container | Frontend, API, BD, Workers | Arquitectos, devops |
| Component | Capas de Clean Architecture por módulo | Desarrolladores |
| Code | Clases y relaciones internas | Desarrolladores |
