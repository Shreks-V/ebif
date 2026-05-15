# Avance del Proyecto — Sistema EBIF
### Asociación Espina Bífida de Nuevo León ABP
**Última actualización:** Jueves 15 de mayo de 2026  
**Próxima entrega:** Martes 19 de mayo de 2026  
**Entrega final al socio formador:** ~Viernes 12 de junio de 2026  
**Meta interna (done):** Viernes 5 de junio de 2026

---

## Resumen ejecutivo

| Indicador | Valor |
|---|---|
| Módulos funcionales terminados | 9 / 12 |
| Endpoints backend implementados | 62 |
| Pruebas automatizadas pasando | 44 (Pruebas/) + 17 (backend/tests/) = **61 total** |
| Casos de prueba cubiertos (sv#) | sv1–sv50 |
| Exportaciones funcionando | 7 (5 PDF + 2 Excel) |
| Funcionalidades IA integradas | 0 / 4 planeadas |
| Documentación técnica | Refactorizacion.md ✓ |

---

## Timeline general

```
Sem 6  |  Lun 13  |  Mar 14  |  Mié 15  |  Jue 16  |  Vie 17  |
       |          |          |  HOY ◄   |          |          |

Sprint 3 (IA + pendientes):  15 mayo → 5 junio
Revisión y entrega SF:        8 junio → 12 junio
```

| Fecha | Entrega | Contenido clave |
|---|---|---|
| **Jue 15 may** | ← HOY | Doc refactorización + tests 100% verdes |
| Mar 19 may | Status #1 | IA: endpoint recomendaciones citas |
| Jue 22 may | Status #2 | IA: alertas inteligentes + predicción inventario |
| Mar 26 may | Status #3 | IA: resumen automático de reportes |
| Jue 29 may | Status #4 | Recuperación de contraseña + doctores frontend |
| Mar 2 jun | Status #5 | E2E tests (citas, almacén, reportes) |
| Jue 5 jun | **DONE** | Código congelado — todos los módulos funcionales |
| Mar 9 jun | Status #6 | Manual de usuario + guía de despliegue |
| Jue 12 jun | **Entrega SF** | Demo + documentación completa |

---

## HECHO ✅

### Sprint 1 — Fundamentos y Beneficiarios

| # | Módulo / Feature | Notas |
|---|---|---|
| ✅ | **Autenticación JWT** | Login, logout, roles ADMINISTRADOR / RECEPCIONISTA |
| ✅ | **Rate limiting** en login | SlowAPI, máx 10 req/min |
| ✅ | **Manejo automático de 401** | Interceptor Angular: sesión expirada → redirect al login |
| ✅ | **Gestión de usuarios del sistema** | CRUD completo por admin, reset de contraseña |
| ✅ | **Perfil de usuario** | Cambio de contraseña propio |
| ✅ | **Dashboard** | KPIs, acciones rápidas, gráficas de distribución |
| ✅ | **Beneficiarios — CRUD completo** | Alta, edición, baja lógica, detalle |
| ✅ | **Beneficiarios — filtros** | Por nombre, CURP, folio, estatus, tipo espina, ciudad, estado |
| ✅ | **Historial del beneficiario** | Citas, pagos, comodatos en una sola vista |
| ✅ | **Membresías** | Renovación manual + scheduler automático 24h (expira vencidas) |
| ✅ | **Cifrado AES-256-GCM** | CURP, domicilio, datos médicos sensibles cifrados en Oracle |

### Sprint 2 — Módulos operativos

| # | Módulo / Feature | Notas |
|---|---|---|
| ✅ | **Pre-Registro público** | Formulario multistep sin login, token X-Preregistro-Token |
| ✅ | **Pre-Registro — aprobación/rechazo** | Flujo interno de revisión, convierte a beneficiario |
| ✅ | **Subida de documentos** | PDF, imágenes en pre-registro y expediente |
| ✅ | **Citas — agenda completa** | Crear, iniciar, completar, cancelar; filtros, stats |
| ✅ | **Citas de hoy** | Vista rápida del día con estado de cada cita |
| ✅ | **Doctores — CRUD** | Alta y edición de doctores |
| ✅ | **Disponibilidad de doctores** | Horarios semanales + excepciones especiales |
| ✅ | **Almacén — productos** | CRUD, control de existencias, alertas stock bajo/caducidad |
| ✅ | **Almacén — servicios** | Catálogo de servicios médicos |
| ✅ | **Almacén — comodatos** | Préstamo de equipo con contrato PDF |
| ✅ | **Almacén — movimientos** | Registro de entradas y salidas |
| ✅ | **Recibos / Cobros** | Multi-método de pago, casos exentos, cancelación |
| ✅ | **Notificaciones unificadas** | Citas hoy, próximas (7d), membresías (30d), stock bajo, caducidad |

### Reportes y exportaciones

| # | Feature | Endpoint |
|---|---|---|
| ✅ | Resumen de periodo (servicios, pagos, género, edades, ciudades) | GET /api/reportes/resumen |
| ✅ | Indicadores de desempeño con tablas cruzadas | GET /api/reportes/indicadores |
| ✅ | Segmentación demográfica (género, etapa vida, tipo espina, estado) | GET /api/reportes/* |
| ✅ | Reporte consolidado mensual | GET /api/reportes/consolidado-mensual |
| ✅ | Historial de reportes generados | GET /api/reportes/historial |
| ✅ | **PDF** reporte estadístico | GET /api/exportaciones/reportes/pdf |
| ✅ | **PDF** expediente del beneficiario | GET /api/exportaciones/beneficiario/{folio}/pdf |
| ✅ | **PDF** credencial del beneficiario | GET /api/exportaciones/beneficiario/{folio}/credencial |
| ✅ | **PDF** comprobante de cita | GET /api/exportaciones/cita/{id}/comprobante |
| ✅ | **PDF** contrato de comodato | GET /api/exportaciones/comodato/{id}/contrato |
| ✅ | **Excel** lista de beneficiarios filtrada | GET /api/exportaciones/beneficiarios/excel |
| ✅ | **Excel** reportes (general + consolidado mensual) | GET /api/exportaciones/reportes/excel |

### Infraestructura y calidad

| # | Feature | Notas |
|---|---|---|
| ✅ | **Arquitectura limpia** | domain → application → infrastructure → presentation |
| ✅ | **Oracle DB + wallet** | Conexión cifrada, pool de conexiones |
| ✅ | **Docker Compose** | Backend FastAPI + Frontend Angular + volúmenes |
| ✅ | **.env.example** | Todas las variables de entorno documentadas |
| ✅ | **Bitácora de accesos** | Registro de intentos de login (éxito/fallo) |
| ✅ | **Pruebas automatizadas — Pruebas/** | 44 pruebas, sv1–sv50, en memoria (sin Oracle) |
| ✅ | **Pruebas automatizadas — backend/tests/** | 17 unit tests de AuthService |
| ✅ | **Documento de refactorización** | 7 técnicas con ejemplos del código real |
| ✅ | **CORS + ALLOWED_HOSTS** | Configurados para desarrollo y producción |

---

## POR HACER 🔲

### Sprint 3A — Funcionalidades de IA (15–29 mayo)

Estas son las cuatro funcionalidades de IA priorizadas por impacto y viabilidad con los datos que ya existen en el sistema.

| Prioridad | Feature IA | Descripción | Módulo |
|---|---|---|---|
| 🔴 Alta | **Recomendación de cita inteligente** | Dado un beneficiario, recomendar tipo de servicio y doctor basado en historial de citas previas, tipo de espina y tiempo desde última consulta | Citas |
| 🔴 Alta | **Alertas predictivas de salud** | Detectar beneficiarios "en riesgo administrativo": sin cita en >6 meses, membresía por vencer, sin renovar comodato vigente | Dashboard |
| 🟡 Media | **Predicción de ruptura de stock** | Basado en movimientos de inventario históricos, estimar cuándo un producto llegará a stock mínimo | Almacén |
| 🟡 Media | **Resumen narrativo de reportes** | Generar automáticamente un párrafo de interpretación de los datos estadísticos de cada reporte usando Claude API | Reportes |

**Implementación técnica propuesta:**

```
backend/app/application/ia/
    ├── recomendaciones.py      # Lógica de scoring para citas
    ├── alertas_predictivas.py  # Reglas + ML simple para riesgo
    ├── prediccion_stock.py     # Regresión lineal sobre movimientos
    └── resumen_reportes.py     # Llamada a Claude API (Anthropic SDK)

GET /api/ia/recomendaciones/{folio}       # recomendaciones de cita
GET /api/ia/alertas-predictivas           # beneficiarios en riesgo
GET /api/ia/prediccion-stock              # proyección de inventario
POST /api/ia/resumen-reporte              # texto interpretativo del reporte
```

### Sprint 3B — Pendientes funcionales (22 mayo–5 junio)

| Estado | Feature | Módulo | Notas |
|---|---|---|---|
| 🔲 | **Recuperación de contraseña por correo** | Auth | Endpoints comentados; requiere SMTP_HOST configurado |
| 🔲 | **Página frontend de Doctores** | Frontend | API completa, falta página Angular con CRUD visual |
| 🔲 | **Búsqueda global / smart search** | Frontend | Búsqueda unificada de beneficiarios desde navbar |
| 🔲 | **Detección de duplicados en pre-registro** | Pre-registro | Comparar CURP y nombre antes de crear; alertar al admin |
| 🔲 | **Vista de comodatos activos por beneficiario** | Almacén | Actualmente solo en historial general |
| 🔲 | **Exportación de lista de comodatos** | Almacén | Excel con filtros de estado/fecha |
| 🔲 | **Gráficas en dashboard IA** | Dashboard | Mostrar alertas predictivas y recomendaciones en KPIs |

### Sprint 3C — Testing y calidad (29 mayo–5 junio)

| Estado | Suite de pruebas | Cobertura actual | Meta |
|---|---|---|---|
| 🔲 | Pruebas almacén (sv18–sv23) | ❌ Sin tests | Pruebas/test_almacen.py |
| 🔲 | Pruebas doctores (sv36+) | ❌ Sin tests | Pruebas/test_doctores.py |
| 🔲 | Pruebas reportes/exportaciones | ❌ Sin tests | Pruebas/test_reportes.py |
| 🔲 | Pruebas funcionalidades IA | ❌ Sin tests | backend/tests/test_ia.py |
| 🔲 | Tests frontend (Jasmine/Karma) | ❌ Sin tests | Componentes críticos |

### Sprint 3D — Despliegue y documentación (5–12 junio)

| Estado | Tarea | Notas |
|---|---|---|
| 🔲 | **Manual de usuario** | Guía por rol: admin vs recepcionista |
| 🔲 | **Guía de instalación / administración** | Variables de entorno, wallet Oracle, primer arranque |
| 🔲 | **Guía de despliegue en producción** | Docker Compose, HTTPS, nginx reverse proxy |
| 🔲 | **Presentación final** | Demo funcional al socio formador |
| 🔲 | **Migración/semilla de datos iniciales** | Script SQL para datos de catálogo en producción |
| 🟡 Opcional | **HTTPS + nginx en docker-compose** | Para entorno de producción real |
| 🟡 Opcional | **Monitoreo de errores (Sentry)** | Logging centralizado en producción |

---

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Oracle wallet no disponible en máquina del SF | Alta | Alto | Documentar configuración, preparar demo con datos de prueba |
| Tiempo insuficiente para 4 features IA | Media | Medio | Priorizar recomendaciones y alertas; resumen de reporte puede recortarse |
| SMTP no configurado para recuperación de contraseña | Alta | Bajo | El admin puede usar reset manual desde la interfaz |
| Doctores frontend no termina a tiempo | Baja | Bajo | API completa; puede entregarse como feature "en progreso" |
| Tests de almacén descubren bugs no detectados | Media | Medio | Correr primero los tests, luego estimar impacto |

---

## Métricas de avance por módulo

| Módulo | Backend | Frontend | Tests | Exportaciones | IA | % Listo |
|---|---|---|---|---|---|---|
| Auth / Usuarios | ✅ | ✅ | ✅ | — | — | **100%** |
| Beneficiarios | ✅ | ✅ | ✅ | ✅ PDF+Excel | 🔲 | **90%** |
| Pre-Registro | ✅ | ✅ | ✅ | — | 🔲 dedup | **90%** |
| Citas | ✅ | ✅ | ✅ | ✅ PDF | 🔲 recomen. | **85%** |
| Doctores | ✅ | 🔲 | — | — | — | **50%** |
| Almacén | ✅ | ✅ | 🔲 | ✅ PDF | 🔲 predicción | **70%** |
| Recibos | ✅ | ✅ | ✅ | — | — | **100%** |
| Reportes | ✅ | ✅ | 🔲 | ✅ PDF+Excel | 🔲 resumen | **80%** |
| Notificaciones | ✅ | ✅ | — | — | — | **90%** |
| Dashboard | ✅ | ✅ | ✅ (acciones) | — | 🔲 alertas | **80%** |
| Módulo IA | 🔲 | 🔲 | 🔲 | — | 🔲 | **0%** |
| Despliegue / Docs | 🟡 Docker | — | — | — | — | **40%** |

**Avance global estimado: ~72%**

---

## Notas de la sesión actual (15 may 2026)

- Corregidos 29 errores en `Pruebas/` → 44 pruebas pasando.
- Añadidos 17 unit tests en `backend/tests/test_auth.py`.
- Implementados: interceptor 401, `.env.example`, suite de tests limpia.
- Revisadas y corregidas todas las exportaciones (PDF y Excel): bug del tipo `'mensual'` → `'consolidado-mensual'`, bug de descarga en Firefox corregido en 4 componentes.
- Creado `Refactorizacion.md` con las 7 técnicas aplicadas al proyecto.
- Creado este documento de avance.

---

*Este documento se actualiza cada martes y jueves. El historial de versiones se lleva en git (`git log -- Avance_Proyecto.md`).*
